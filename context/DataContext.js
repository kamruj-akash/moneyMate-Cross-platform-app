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
  updated_at: new Date().toISOString(),
};

const nowISO = () => new Date().toISOString();

export const DataProvider = ({ children }) => {
  const { isAuthenticated, isOfflineMode, user, bootstrapping } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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

  // Single hydrate-and-sync effect: read local data, seed defaults if empty,
  // then push to cloud. All sequential to avoid race conditions where a
  // previous version could read empty before seed wrote, and never re-push.
  useEffect(() => {
    if (bootstrapping) return;
    let mounted = true;
    (async () => {
      let [tx, cat, rec, set, qs, ls, online, pushedMap] = await Promise.all([
        getJSON(KEYS.TRANSACTIONS, []),
        getJSON(KEYS.CATEGORIES, []),
        getJSON(KEYS.RECURRING, []),
        getJSON(KEYS.SETTINGS, null),
        getQueueSize(),
        getLastSync(),
        getIsOnline(),
        getJSON(KEYS.CLOUD_PUSHED, {}),
      ]);

      let cats = cat || [];
      if (!cats || cats.length === 0) {
        cats = DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          id: uuid(),
          created_at: nowISO(),
          updated_at: nowISO(),
        }));
        await setJSON(KEYS.CATEGORIES, cats);
      }

      if (!mounted) return;
      setTransactions(tx || []);
      setCategories(cats);
      setRecurring(rec || []);
      setSettings(set || DEFAULT_SETTINGS);
      setSyncStatus((s) => ({ ...s, queue: qs, lastSync: ls, online }));
      setHydrated(true);

      // Push to cloud after local data is consistent. Categories + recurring +
      // settings are small — push every authed boot so missed writes recover.
      // Transactions can be large — push only once per user (gated by flag).
      // Use queueActions so all entries are appended in a single atomic write
      // (parallel queueAction calls would race and lose writes).
      if (user?.id && !isOfflineMode) {
        const actions = [];
        for (const c of cats) actions.push({ type: 'upsert', table: 'categories', data: c });
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
  }, [user?.id, isOfflineMode, bootstrapping]);

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
      const item = {
        id: uuid(),
        type: input.type,
        amount: Number(input.amount),
        title: input.title || '',
        note: input.note || null,
        category_id: input.category_id || null,
        date: input.date || nowISO(),
        recurring_id: input.recurring_id || null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const next = [item, ...transactions];
      await persistTx(next);
      if (isAuthenticated && !isOfflineMode) {
        queueAction('insert', 'transactions', item);
      }
      // Budget alert
      try {
        const { start, end } = monthRange(new Date());
        const monthExpense = next
          .filter((t) => t.type === 'expense' && safeParse(t.date) >= start && safeParse(t.date) <= end)
          .reduce((s, t) => s + Number(t.amount), 0);
        if (settings.notifications_enabled !== false) {
          maybeAlertBudget({
            monthExpense,
            budget: settings.monthly_budget,
            alertThreshold: settings.alert_threshold,
          }).catch(() => {});
        }
      } catch {}
      return item;
    },
    [transactions, isAuthenticated, isOfflineMode, persistTx, settings]
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
    [categories, isAuthenticated, isOfflineMode, persistCat]
  );

  const updateCategory = useCallback(
    async (id, patch) => {
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
    [recurring, isAuthenticated, isOfflineMode, persistRec]
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

  const updateBudget = useCallback(
    async (monthlyLimit, alertThreshold) => {
      const patch = {};
      if (monthlyLimit !== undefined) patch.monthly_budget = Number(monthlyLimit) || 0;
      if (alertThreshold !== undefined) patch.alert_threshold = Number(alertThreshold) || 80;
      return updateSettings(patch);
    },
    [updateSettings]
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

  // ---------- Stats ----------
  const getMonthlyStats = useCallback(
    (month = new Date()) => {
      const { start, end } = monthRange(month);
      const inMonth = transactions.filter((t) => {
        const d = safeParse(t.date);
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
        const cat = categories.find((c) => c.id === category_id);
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
          .filter((t) => t.type === 'expense' && safeParse(t.date).getDate() === i)
          .reduce((s, t) => s + Number(t.amount), 0);
        dailyTrend.push({ day: i, label: format(d, 'd'), value: total });
      }

      return { income, expense, net: income - expense, byCategory, dailyTrend, count: inMonth.length };
    },
    [transactions, categories]
  );

  const getMultiMonthStats = useCallback(
    (months = 6, ref = new Date()) => {
      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
        const { start, end } = monthRange(d);
        const inMonth = transactions.filter((t) => {
          const dt = safeParse(t.date);
          return dt >= start && dt <= end;
        });
        const income = inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        result.push({ month: d, label: format(d, 'MMM'), income, expense });
      }
      return result;
    },
    [transactions]
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
      transactions,
      categories,
      recurring,
      settings,
      syncStatus,
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
      transactions,
      categories,
      recurring,
      settings,
      syncStatus,
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
