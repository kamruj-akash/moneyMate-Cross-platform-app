import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import { KEYS, getJSON, setJSON } from '../lib/storage';
import { queueAction, queueActions, subscribeSync, getQueueSize, getLastSync, fullSync, getIsOnline } from '../lib/syncManager';
import { uuid } from '../utils/uuid';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import { monthRange, isSameDay, format, safeParse } from '../utils/date';
import { computeDueRecurring } from '../lib/recurring';
import { maybeAlertBudget } from '../lib/notifications';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const DEFAULT_SETTINGS = {
  currency: 'BDT',
  monthly_budget: 0,
  alert_threshold: 80,
  notifications_enabled: true,
  name: null,
  birth_date: null,
  mobile_number: null,
  updated_at: new Date().toISOString(),
};

const nowISO = () => new Date().toISOString();

const DEFAULT_PROFILE = (userId) => ({
  id: uuid(),
  user_id: userId || null,
  name: 'Personal',
  icon: 'person-circle-outline',
  color: '#7F5AF0',
  monthly_budget: 0,
  alert_threshold: 80,
  is_default: true,
  created_at: nowISO(),
  updated_at: nowISO(),
});

export const DataProvider = ({ children }) => {
  const { isAuthenticated, isOfflineMode, user, bootstrapping, restoring } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileIdState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ phase: 'idle', queue: 0, online: true, lastSync: null });
  const initOnceRef = useRef(false);

  const persistTx = useCallback(async (next) => {
    setTransactions(next);
    await setJSON(KEYS.TRANSACTIONS, next);
  }, []);
  const persistCat = useCallback(async (next) => {
    setCategories(next);
    await setJSON(KEYS.CATEGORIES, next);
  }, []);
  const persistRec = useCallback(async (next) => {
    setRecurring(next);
    await setJSON(KEYS.RECURRING, next);
  }, []);
  const persistSettings = useCallback(async (next) => {
    setSettings(next);
    await setJSON(KEYS.SETTINGS, next);
  }, []);
  const persistProfiles = useCallback(async (next) => {
    setProfiles(next);
    await setJSON(KEYS.PROFILES, next);
  }, []);
  const persistActiveProfileId = useCallback(async (id) => {
    setActiveProfileIdState(id);
    if (id) await setJSON(KEYS.ACTIVE_PROFILE_ID, id);
  }, []);

  // Single hydrate-and-sync effect: read local data, seed defaults if empty,
  // then push to cloud. Waits for `restoring` so we never read AsyncStorage
  // mid-login (cleared local + cloud not yet pulled = false-empty seed).
  useEffect(() => {
    if (bootstrapping || restoring) return;
    let mounted = true;
    (async () => {
      let [tx, cat, rec, set, qs, ls, online, pushedMap, profilesLocal, activeIdLocal] = await Promise.all([
        getJSON(KEYS.TRANSACTIONS, []),
        getJSON(KEYS.CATEGORIES, []),
        getJSON(KEYS.RECURRING, []),
        getJSON(KEYS.SETTINGS, null),
        getQueueSize(),
        getLastSync(),
        getIsOnline(),
        getJSON(KEYS.CLOUD_PUSHED, {}),
        getJSON(KEYS.PROFILES, []),
        getJSON(KEYS.ACTIVE_PROFILE_ID, null),
      ]);

      const hasOwner = !!user?.id || isOfflineMode;

      // Seed default category set with stable UUIDs (these match cloud globals
      // and are read-only). Only when an owner exists.
      let cats = cat || [];
      if (hasOwner && (!cats || cats.length === 0)) {
        cats = DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          created_at: nowISO(),
          updated_at: nowISO(),
        }));
        await setJSON(KEYS.CATEGORIES, cats);
      }

      // Seed default profile if owner exists and none yet.
      let profs = profilesLocal || [];
      if (hasOwner && profs.length === 0) {
        const def = DEFAULT_PROFILE(user?.id);
        profs = [def];
        await setJSON(KEYS.PROFILES, profs);
      }

      // Pick an active profile: stored choice if still valid, else default, else first.
      let activeId = activeIdLocal;
      if (!activeId || !profs.find((p) => p.id === activeId)) {
        activeId = profs.find((p) => p.is_default)?.id || profs[0]?.id || null;
      }
      if (activeId) await setJSON(KEYS.ACTIVE_PROFILE_ID, activeId);

      if (!mounted) return;
      setTransactions(tx || []);
      setCategories(cats);
      setRecurring(rec || []);
      setSettings(set || DEFAULT_SETTINGS);
      setProfiles(profs);
      setActiveProfileIdState(activeId);
      setSyncStatus((s) => ({ ...s, queue: qs, lastSync: ls, online }));
      setHydrated(true);

      // Push to cloud after local data is consistent. Categories + recurring +
      // settings are small — push every authed boot so missed writes recover.
      // Transactions can be large — push only once per user (gated by flag).
      // Use queueActions so all entries are appended in a single atomic write
      // (parallel queueAction calls would race and lose writes).
      if (user?.id && !isOfflineMode) {
        const actions = [];
        // Profiles must sync first (FK dependency).
        for (const p of profs) actions.push({ type: 'upsert', table: 'profiles', data: p });
        // Skip is_default cats — they're shared globals (user_id NULL) in cloud.
        for (const c of cats) {
          if (c.is_default) continue;
          actions.push({ type: 'upsert', table: 'categories', data: c });
        }
        for (const r of rec || []) actions.push({ type: 'upsert', table: 'recurring_transactions', data: r });
        if (set) actions.push({ type: 'upsert', table: 'user_settings', data: set });
        const pushTx = !pushedMap[user.id];
        if (pushTx) {
          for (const t of tx || []) actions.push({ type: 'upsert', table: 'transactions', data: t });
        }
        await queueActions(actions);
        if (pushTx) {
          pushedMap[user.id] = true;
          await setJSON(KEYS.CLOUD_PUSHED, pushedMap || {});
        }
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, isOfflineMode, bootstrapping, restoring]);

  useEffect(() => {
    const unsub = subscribeSync(async (event) => {
      const queue = await getQueueSize();
      const lastSync = await getLastSync();
      const online = await getIsOnline();
      let phase = 'idle';
      if (event === 'start') phase = 'syncing';
      if (event === 'pull_start') phase = 'syncing';
      if (event === 'done' || event === 'pull_done') phase = 'idle';
      setSyncStatus({ phase, queue, lastSync, online });
    });
    return () => unsub();
  }, []);

  // Process recurring once after hydration (and on auth/user change)
  useEffect(() => {
    if (!hydrated) return;
    if (initOnceRef.current) return;
    initOnceRef.current = true;
    processRecurringDue().catch(() => {});
  }, [hydrated]);

  // ---------- Transactions ----------
  const addTransaction = useCallback(
    async (input) => {
      // We collapsed `date` (user-pickable) and `created_at` (audit) into
      // a single `created_at` field. The picker writes through to
      // created_at directly so back-dating still works, just without the
      // redundant column.
      const item = {
        id: uuid(),
        type: input.type,
        amount: Number(input.amount),
        title: input.title || '',
        note: input.note || null,
        category_id: input.category_id || null,
        profile_id: input.profile_id || activeProfileId || null,
        recurring_id: input.recurring_id || null,
        created_at: input.created_at || input.date || nowISO(),
        updated_at: nowISO(),
      };
      const next = [item, ...transactions];
      await persistTx(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('insert', 'transactions', item);
      }
      // Budget alert (uses ACTIVE profile's budget)
      try {
        const activeProfile = profiles.find((p) => p.id === activeProfileId);
        const { start, end } = monthRange(new Date());
        const monthExpense = next
          .filter((t) =>
            t.type === 'expense' &&
            (!t.profile_id || t.profile_id === activeProfileId) &&
            safeParse(t.created_at || t.date) >= start && safeParse(t.created_at || t.date) <= end
          )
          .reduce((s, t) => s + Number(t.amount), 0);
        if (settings.notifications_enabled !== false && activeProfile) {
          maybeAlertBudget({
            monthExpense,
            budget: activeProfile.monthly_budget,
            alertThreshold: activeProfile.alert_threshold,
          }).catch(() => {});
        }
      } catch {}
      return item;
    },
    [transactions, isAuthenticated, isOfflineMode, persistTx, settings, profiles, activeProfileId]
  );

  const updateTransaction = useCallback(
    async (id, patch) => {
      const next = transactions.map((t) =>
        t.id === id ? { ...t, ...patch, amount: patch.amount !== undefined ? Number(patch.amount) : t.amount, updated_at: nowISO() } : t
      );
      await persistTx(next);
      const updated = next.find((t) => t.id === id);
      if (isAuthenticated && !isOfflineMode && updated) {
        queueAction('update', 'transactions', updated);
      }
      return updated;
    },
    [transactions, isAuthenticated, isOfflineMode, persistTx]
  );

  const deleteTransaction = useCallback(
    async (id) => {
      const next = transactions.filter((t) => t.id !== id);
      await persistTx(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('delete', 'transactions', { id });
      }
    },
    [transactions, isAuthenticated, isOfflineMode, persistTx]
  );

  // ---------- Categories ----------
  const addCategory = useCallback(
    async (input) => {
      const item = {
        id: uuid(),
        name: input.name,
        icon: input.icon || 'pricetag-outline',
        color: input.color || '#7F5AF0',
        type: input.type || 'expense',
        is_default: false,
        profile_id: input.profile_id || activeProfileId || null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const next = [item, ...categories];
      await persistCat(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('insert', 'categories', item);
      }
      return item;
    },
    [categories, isAuthenticated, isOfflineMode, persistCat, activeProfileId]
  );

  const updateCategory = useCallback(
    async (id, patch) => {
      const target = categories.find((c) => c.id === id);
      // Defaults are shared globals — never modify, never push to cloud.
      if (target?.is_default) return target;
      const next = categories.map((c) => (c.id === id ? { ...c, ...patch, updated_at: nowISO() } : c));
      await persistCat(next);
      const u = next.find((c) => c.id === id);
      if (isAuthenticated && !isOfflineMode && u) {
        queueAction('update', 'categories', u);
      }
      return u;
    },
    [categories, isAuthenticated, isOfflineMode, persistCat]
  );

  const deleteCategory = useCallback(
    async (id) => {
      const target = categories.find((c) => c.id === id);
      // Defaults are shared globals — cannot be deleted by an end user.
      if (target?.is_default) return;
      const next = categories.filter((c) => c.id !== id);
      await persistCat(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('delete', 'categories', { id });
      }
    },
    [categories, isAuthenticated, isOfflineMode, persistCat]
  );

  // ---------- Recurring ----------
  const addRecurring = useCallback(
    async (input) => {
      const item = {
        id: uuid(),
        type: input.type,
        amount: Number(input.amount),
        title: input.title || '',
        note: input.note || null,
        category_id: input.category_id || null,
        profile_id: input.profile_id || activeProfileId || null,
        frequency: input.frequency || 'monthly',
        start_date: input.start_date || nowISO(),
        next_due_date: input.next_due_date || input.start_date || nowISO(),
        end_date: input.end_date || null,
        is_active: input.is_active !== false,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const next = [item, ...recurring];
      await persistRec(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('insert', 'recurring_transactions', item);
      }
      return item;
    },
    [recurring, isAuthenticated, isOfflineMode, persistRec, activeProfileId]
  );

  const updateRecurring = useCallback(
    async (id, patch) => {
      const next = recurring.map((r) => (r.id === id ? { ...r, ...patch, updated_at: nowISO() } : r));
      await persistRec(next);
      const u = next.find((r) => r.id === id);
      if (isAuthenticated && !isOfflineMode && u) {
        queueAction('update', 'recurring_transactions', u);
      }
      return u;
    },
    [recurring, isAuthenticated, isOfflineMode, persistRec]
  );

  const deleteRecurring = useCallback(
    async (id) => {
      const next = recurring.filter((r) => r.id !== id);
      await persistRec(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('delete', 'recurring_transactions', { id });
      }
    },
    [recurring, isAuthenticated, isOfflineMode, persistRec]
  );

  // ---------- Settings ----------
  const updateSettings = useCallback(
    async (patch) => {
      const next = { ...settings, ...patch, updated_at: nowISO() };
      await persistSettings(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('upsert', 'user_settings', next);
      }
      return next;
    },
    [settings, isAuthenticated, isOfflineMode, persistSettings]
  );

  // ---------- Profiles ----------
  const addProfile = useCallback(
    async (input) => {
      const item = {
        id: uuid(),
        user_id: user?.id || null,
        name: input.name?.trim() || 'Untitled',
        icon: input.icon || 'person-circle-outline',
        color: input.color || '#7F5AF0',
        monthly_budget: Number(input.monthly_budget) || 0,
        alert_threshold: Number(input.alert_threshold) || 80,
        is_default: false,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const next = [...profiles, item];
      await persistProfiles(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('insert', 'profiles', item);
      }
      return item;
    },
    [profiles, isAuthenticated, isOfflineMode, persistProfiles, user?.id]
  );

  const updateProfile = useCallback(
    async (id, patch) => {
      const next = profiles.map((p) => (p.id === id ? { ...p, ...patch, updated_at: nowISO() } : p));
      await persistProfiles(next);
      const u = next.find((p) => p.id === id);
      if (isAuthenticated && !isOfflineMode && u) {
        queueAction('update', 'profiles', u);
      }
      return u;
    },
    [profiles, isAuthenticated, isOfflineMode, persistProfiles]
  );

  const deleteProfile = useCallback(
    async (id) => {
      // Don't allow deleting the last profile or the default one.
      if (profiles.length <= 1) return false;
      const target = profiles.find((p) => p.id === id);
      if (!target || target.is_default) return false;

      const next = profiles.filter((p) => p.id !== id);
      // Cascade-delete this profile's local data so it doesn't linger.
      const nextTx = transactions.filter((t) => t.profile_id !== id);
      const nextCat = categories.filter((c) => c.profile_id !== id);
      const nextRec = recurring.filter((r) => r.profile_id !== id);
      await Promise.all([
        persistProfiles(next),
        persistTx(nextTx),
        persistCat(nextCat),
        persistRec(nextRec),
      ]);
      if (isAuthenticated && !isOfflineMode) {
        // Cloud cascade is handled server-side via ON DELETE CASCADE on profile_id FKs.
        queueAction('delete', 'profiles', { id });
      }
      // If the active profile was just deleted, switch to default.
      if (activeProfileId === id) {
        const fallback = next.find((p) => p.is_default)?.id || next[0]?.id;
        await persistActiveProfileId(fallback);
      }
      return true;
    },
    [profiles, transactions, categories, recurring, activeProfileId, isAuthenticated, isOfflineMode, persistProfiles, persistTx, persistCat, persistRec, persistActiveProfileId]
  );

  const switchProfile = useCallback(
    async (id) => {
      if (!profiles.find((p) => p.id === id)) return;
      await persistActiveProfileId(id);
    },
    [profiles, persistActiveProfileId]
  );

  // Backwards-compat: updateBudget now writes to the active profile's budget.
  const updateBudget = useCallback(
    async (monthlyLimit, alertThreshold) => {
      if (!activeProfileId) return null;
      const patch = {};
      if (monthlyLimit !== undefined) patch.monthly_budget = Number(monthlyLimit) || 0;
      if (alertThreshold !== undefined) patch.alert_threshold = Number(alertThreshold) || 80;
      return updateProfile(activeProfileId, patch);
    },
    [activeProfileId, updateProfile]
  );

  // ---------- Recurring processor ----------
  const processRecurringDue = useCallback(async () => {
    const today = new Date();
    const lastRun = await getJSON(KEYS.RECURRING_LAST_RUN, null);
    if (lastRun) {
      const last = safeParse(lastRun);
      if (isSameDay(last, today)) return { added: 0 };
    }
    const { created, updated } = computeDueRecurring(recurring, today);
    if (created.length === 0 && updated.length === 0) {
      await setJSON(KEYS.RECURRING_LAST_RUN, today.toISOString());
      return { added: 0 };
    }
    const nextTx = [...created, ...transactions];
    await persistTx(nextTx);
    if (updated.length) {
      const map = new Map(updated.map((u) => [u.id, u]));
      const nextRec = recurring.map((r) => (map.has(r.id) ? map.get(r.id) : r));
      await persistRec(nextRec);
      if (isAuthenticated && !isOfflineMode) {
        for (const r of updated) queueAction('update', 'recurring_transactions', r);
      }
    }
    if (isAuthenticated && !isOfflineMode) {
      for (const t of created) queueAction('insert', 'transactions', t);
    }
    await setJSON(KEYS.RECURRING_LAST_RUN, today.toISOString());
    return { added: created.length };
  }, [recurring, transactions, isAuthenticated, isOfflineMode, persistTx, persistRec]);

  // ---------- Profile-scoped views ----------
  // The whole app should "see" only the active profile's data. CRUD methods
  // still operate on the full lists internally; consumers only get filtered.
  const scopedTransactions = useMemo(() => {
    if (!activeProfileId) return transactions;
    return transactions.filter((t) => !t.profile_id || t.profile_id === activeProfileId);
  }, [transactions, activeProfileId]);

  const scopedCategories = useMemo(() => {
    if (!activeProfileId) return categories;
    // Show globals (defaults) + cats belonging to this profile (or unscoped legacy).
    return categories.filter((c) => c.is_default || !c.profile_id || c.profile_id === activeProfileId);
  }, [categories, activeProfileId]);

  const scopedRecurring = useMemo(() => {
    if (!activeProfileId) return recurring;
    return recurring.filter((r) => !r.profile_id || r.profile_id === activeProfileId);
  }, [recurring, activeProfileId]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || null,
    [profiles, activeProfileId]
  );

  // ---------- Stats ----------
  const getMonthlyStats = useCallback(
    (month = new Date()) => {
      const { start, end } = monthRange(month);
      const inMonth = scopedTransactions.filter((t) => {
        const d = safeParse(t.created_at || t.date);
        return d >= start && d <= end;
      });
      const income = inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const byCategoryMap = new Map();
      for (const t of inMonth) {
        if (t.type !== 'expense') continue;
        const key = t.category_id || 'uncategorized';
        const prev = byCategoryMap.get(key) || 0;
        byCategoryMap.set(key, prev + Number(t.amount));
      }
      const byCategory = Array.from(byCategoryMap.entries()).map(([category_id, amount]) => {
        const cat = scopedCategories.find((c) => c.id === category_id);
        return {
          category_id,
          name: cat?.name || 'Uncategorized',
          color: cat?.color || '#6B7280',
          icon: cat?.icon || 'pricetag-outline',
          amount,
        };
      }).sort((a, b) => b.amount - a.amount);

      // daily trend
      const days = end.getDate();
      const dailyTrend = [];
      for (let i = 1; i <= days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), i);
        const total = inMonth
          .filter((t) => t.type === 'expense' && safeParse(t.created_at || t.date).getDate() === i)
          .reduce((s, t) => s + Number(t.amount), 0);
        dailyTrend.push({ day: i, label: format(d, 'd'), value: total });
      }

      return { income, expense, net: income - expense, byCategory, dailyTrend, count: inMonth.length };
    },
    [scopedTransactions, scopedCategories]
  );

  const getMultiMonthStats = useCallback(
    (months = 6, ref = new Date()) => {
      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
        const { start, end } = monthRange(d);
        const inMonth = scopedTransactions.filter((t) => {
          const dt = safeParse(t.created_at || t.date);
          return dt >= start && dt <= end;
        });
        const income = inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        result.push({ month: d, label: format(d, 'MMM'), income, expense });
      }
      return result;
    },
    [scopedTransactions]
  );

  const refresh = useCallback(async () => {
    await fullSync();
    const [tx, cat, rec, set] = await Promise.all([
      getJSON(KEYS.TRANSACTIONS, []),
      getJSON(KEYS.CATEGORIES, []),
      getJSON(KEYS.RECURRING, []),
      getJSON(KEYS.SETTINGS, null),
    ]);
    setTransactions(tx || []);
    setCategories(cat || []);
    setRecurring(rec || []);
    if (set) setSettings(set);
  }, []);

  const getCategoryById = useCallback(
    (id) => categories.find((c) => c.id === id) || null,
    [categories]
  );

  const replaceAllData = useCallback(
    async ({ transactions: tx, categories: cat, recurring: rec, settings: set }) => {
      if (Array.isArray(tx)) await persistTx(tx);
      if (Array.isArray(cat)) await persistCat(cat);
      if (Array.isArray(rec)) await persistRec(rec);
      if (set) await persistSettings(set);
    },
    [persistTx, persistCat, persistRec, persistSettings]
  );

  const value = useMemo(
    () => ({
      hydrated,
      // PUBLIC views — already filtered to active profile.
      transactions: scopedTransactions,
      categories: scopedCategories,
      recurring: scopedRecurring,
      // Settings remain user-level (currency, name, mobile, birth, notifications).
      // Budget/threshold now live on the active profile.
      settings: {
        ...settings,
        // Backwards-compat: expose the active profile's budget on settings so
        // existing screens that read settings.monthly_budget keep working.
        monthly_budget: activeProfile?.monthly_budget ?? 0,
        alert_threshold: activeProfile?.alert_threshold ?? 80,
      },
      syncStatus,
      // Profile-related
      profiles,
      activeProfileId,
      activeProfile,
      addProfile,
      updateProfile,
      deleteProfile,
      switchProfile,
      // CRUD
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      updateSettings,
      updateBudget,
      processRecurringDue,
      getMonthlyStats,
      getMultiMonthStats,
      getCategoryById,
      refresh,
      replaceAllData,
    }),
    [
      hydrated,
      scopedTransactions,
      scopedCategories,
      scopedRecurring,
      settings,
      profiles,
      activeProfileId,
      activeProfile,
      syncStatus,
      addProfile,
      updateProfile,
      deleteProfile,
      switchProfile,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      updateSettings,
      updateBudget,
      processRecurringDue,
      getMonthlyStats,
      getMultiMonthStats,
      getCategoryById,
      refresh,
      replaceAllData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
