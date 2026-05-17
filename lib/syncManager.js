import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { KEYS, getJSON, setJSON } from './storage';

let isProcessing = false;
let intervalId = null;
let appStateSub = null;
let netSub = null;
let listeners = new Set();

const emit = (event, payload) => {
  listeners.forEach((cb) => {
    try { cb(event, payload); } catch {}
  });
};

export const subscribeSync = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true;
  }
};

const getSession = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
};

// Serialize queue writes so concurrent callers don't clobber each other.
let _queueLock = Promise.resolve();
const withQueueLock = (fn) => {
  const next = _queueLock.then(fn, fn);
  _queueLock = next.catch(() => {});
  return next;
};

const buildEntry = (type, table, data) => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
  type,
  table,
  data,
  queued_at: new Date().toISOString(),
});

export const queueAction = async (type, table, data) => {
  await withQueueLock(async () => {
    const queue = (await getJSON(KEYS.SYNC_QUEUE, [])) || [];
    queue.push(buildEntry(type, table, data));
    await setJSON(KEYS.SYNC_QUEUE, queue);
    emit('queue', { size: queue.length });
  });
  processSyncQueue().catch(() => {});
};

// Atomic batch: append many actions in one read-modify-write so they cannot
// race with each other or with a concurrent single queueAction.
export const queueActions = async (actions) => {
  if (!actions || actions.length === 0) return;
  await withQueueLock(async () => {
    const queue = (await getJSON(KEYS.SYNC_QUEUE, [])) || [];
    for (const a of actions) {
      queue.push(buildEntry(a.type, a.table, a.data));
    }
    await setJSON(KEYS.SYNC_QUEUE, queue);
    emit('queue', { size: queue.length });
  });
  processSyncQueue().catch(() => {});
};

let _lastError = null;
export const getLastSyncError = () => _lastError;

const logErr = (where, error) => {
  _lastError = {
    where,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    at: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.warn('[sync]', where, 'failed', error?.code, '|', error?.message, '|', error?.details || '', '|', error?.hint || '');
};

// Strip the legacy `date` field from transactions before pushing to cloud.
// The column was retired in favour of `created_at`; keeping the field in
// the payload would cause PostgREST "column not found" errors once the
// drop_transaction_date_column.sql migration has been applied.
const stripLegacyFields = (table, data) => {
  if (!data) return data;
  if (table === 'transactions' && Object.prototype.hasOwnProperty.call(data, 'date')) {
    const { date: _legacy, ...rest } = data;
    return rest;
  }
  return data;
};

const executeAction = async (action, userId) => {
  const { type, table } = action;
  const data = stripLegacyFields(table, action.data);
  if (type === 'insert') {
    const payload = { ...data, user_id: userId };
    const { error } = await supabase.from(table).insert(payload);
    if (error && error.code !== '23505') {
      logErr(`insert ${table}`, error);
      throw error;
    }
  } else if (type === 'update') {
    const { id, ...rest } = data;
    const { error } = await supabase
      .from(table)
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      logErr(`update ${table}`, error);
      throw error;
    }
  } else if (type === 'upsert') {
    const payload = { ...data, user_id: userId };
    // user_settings uses user_id as PK (no `id` column); strip stale id and
    // any client-only fields (notifications_enabled lives only in local
    // state — the cloud schema doesn't have it).
    if (table === 'user_settings') {
      delete payload.id;
      delete payload.notifications_enabled;
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'user_id' });
      if (error) {
        logErr(`upsert ${table}`, error);
        throw error;
      }
    } else {
      const { error } = await supabase.from(table).upsert(payload);
      if (error) {
        logErr(`upsert ${table}`, error);
        throw error;
      }
    }
  } else if (type === 'delete') {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', data.id)
      .eq('user_id', userId);
    if (error) {
      logErr(`delete ${table}`, error);
      throw error;
    }
  }
  _lastError = null;
};

export const processSyncQueue = async () => {
  if (isProcessing) return { ran: false };
  const session = await getSession();
  if (!session) return { ran: false, reason: 'no_session' };
  const online = await isOnline();
  if (!online) return { ran: false, reason: 'offline' };

  const queue = (await getJSON(KEYS.SYNC_QUEUE, [])) || [];
  if (queue.length === 0) return { ran: false, reason: 'empty' };

  // Process in dependency order so FKs resolve.
  // profiles must come first (data tables FK to it).
  const tableOrder = { profiles: 0, categories: 1, user_settings: 2, recurring_transactions: 3, transactions: 4 };
  queue.sort((a, b) => (tableOrder[a.table] || 99) - (tableOrder[b.table] || 99));

  isProcessing = true;
  emit('start', { size: queue.length });

  const userId = session.user.id;
  const remaining = [];
  let processed = 0;
  for (const action of queue) {
    try {
      await executeAction(action, userId);
      processed += 1;
    } catch (e) {
      remaining.push(action);
    }
  }
  await setJSON(KEYS.SYNC_QUEUE, remaining);
  await setJSON(KEYS.LAST_SYNC, new Date().toISOString());
  isProcessing = false;
  emit('done', { processed, remaining: remaining.length });
  return { ran: true, processed, remaining: remaining.length };
};

const fetchAll = async (table, userId) => {
  // For categories we want both shared globals (user_id IS NULL) and the
  // user's own customs. RLS already filters down to those two visibility
  // sets, so we don't add a .eq filter — that would hide globals.
  if (table === 'categories') {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  }
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// True when the string carries a time-of-day (i.e. is a real ISO timestamp,
// not a date-only "YYYY-MM-DD"). Defends against legacy rows where a Postgres
// `date` column stripped the time on round-trip.
const hasTimeComponent = (s) => typeof s === 'string' && /T\d{2}:\d{2}/.test(s);

const mergeByUpdatedAt = (local = [], cloud = []) => {
  const map = new Map();
  for (const item of local) map.set(item.id, item);
  for (const item of cloud) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const lUpd = new Date(existing.updated_at || 0).getTime();
      const cUpd = new Date(item.updated_at || 0).getTime();
      const winner = cUpd >= lUpd ? item : existing;
      // Preserve the richer time-of-day from whichever side has one.
      // After the `date` column drop this only matters during the
      // transition window: existing local rows may still carry a `date`
      // field that was richer than the cloud's `created_at`.
      const localTime = existing.created_at || existing.date;
      const cloudTime = item.created_at || item.date;
      if (
        winner === item &&
        localTime &&
        hasTimeComponent(localTime) &&
        !hasTimeComponent(cloudTime)
      ) {
        map.set(item.id, { ...item, created_at: localTime });
      } else {
        map.set(item.id, winner);
      }
    }
  }
  return Array.from(map.values());
};

export const pullFromCloud = async () => {
  const session = await getSession();
  if (!session) return { ran: false, reason: 'no_session' };
  const online = await isOnline();
  if (!online) return { ran: false, reason: 'offline' };

  emit('pull_start', null);
  const userId = session.user.id;
  try {
    const [cloudProfiles, cloudTx, cloudCat, cloudRec, cloudSet] = await Promise.all([
      fetchAll('profiles', userId),
      fetchAll('transactions', userId),
      fetchAll('categories', userId),
      fetchAll('recurring_transactions', userId),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const localProfiles = (await getJSON(KEYS.PROFILES, [])) || [];
    const localTx = (await getJSON(KEYS.TRANSACTIONS, [])) || [];
    const localCat = (await getJSON(KEYS.CATEGORIES, [])) || [];
    const localRec = (await getJSON(KEYS.RECURRING, [])) || [];
    const localSet = (await getJSON(KEYS.SETTINGS, null)) || null;

    const mergedProfiles = mergeByUpdatedAt(localProfiles, cloudProfiles);
    const mergedTx = mergeByUpdatedAt(localTx, cloudTx);
    const mergedCat = mergeByUpdatedAt(localCat, cloudCat);
    const mergedRec = mergeByUpdatedAt(localRec, cloudRec);

    let mergedSet = localSet;
    const cloudSettings = cloudSet?.data || null;
    if (cloudSettings) {
      const lUpd = new Date(localSet?.updated_at || 0).getTime();
      const cUpd = new Date(cloudSettings.updated_at || 0).getTime();
      mergedSet = cUpd >= lUpd ? cloudSettings : localSet;
    }

    await Promise.all([
      setJSON(KEYS.PROFILES, mergedProfiles),
      setJSON(KEYS.TRANSACTIONS, mergedTx),
      setJSON(KEYS.CATEGORIES, mergedCat),
      setJSON(KEYS.RECURRING, mergedRec),
      mergedSet ? setJSON(KEYS.SETTINGS, mergedSet) : Promise.resolve(),
    ]);
    await setJSON(KEYS.LAST_SYNC, new Date().toISOString());
    emit('pull_done', null);
    return { ran: true, counts: { profiles: mergedProfiles.length, tx: mergedTx.length, cat: mergedCat.length, rec: mergedRec.length } };
  } catch (e) {
    emit('pull_error', { message: e?.message });
    return { ran: false, error: e?.message };
  }
};

export const fullSync = async () => {
  const a = await processSyncQueue();
  const b = await pullFromCloud();
  return { queue: a, pull: b };
};

// Refresh the expired access token first, THEN sync. This is the
// explicit "network detected → refresh → sync" sequence — matches the
// user-facing mental model and avoids racing supabase's internal auto-
// refresh during the very first push call (which can produce 401s on
// the first request post-reconnect).
//
// If refreshSession fails (no stored refresh token, or refresh token
// truly expired), we bail without trying to sync. Auth state is updated
// by supabase's onAuthStateChange listener — we don't need to touch it
// here.
const refreshThenSync = async () => {
  try {
    // Bail early if the device isn't actually online. AppState.active and
    // the 5-min timer fire regardless of connectivity, so this guard
    // keeps refreshSession() from making a doomed network round-trip
    // (which would otherwise hang for ~30 s before failing).
    const online = await isOnline();
    if (!online) return;

    const cached = await getSession();
    if (!cached) {
      // No session at all (e.g. offline-only user). Nothing to refresh
      // and nothing to sync — auto-sync is a no-op for them.
      return;
    }
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      // Refresh token rejected by server (truly expired or revoked).
      // Sync stays paused; user will need to log in again before any new
      // data can leave the device. UI stays "logged in" via the AUTH_USER
      // cache — they just won't see cloud-synced changes until re-login.
      return;
    }
    await fullSync();
  } catch {
    // Network glitch or anything else — quietly skip. The next NetInfo
    // event / AppState change / 5-min timer will retry.
  }
};

export const startAutoSync = () => {
  netSub = NetInfo.addEventListener((state) => {
    if (state.isConnected) refreshThenSync();
  });
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') refreshThenSync();
  });
  // NetInfo.addEventListener only fires on state CHANGES, not the
  // current state. If the device is already online at app launch, kick
  // off an initial refresh+sync so we don't sit idle until the next
  // connectivity blip.
  NetInfo.fetch()
    .then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        refreshThenSync();
      }
    })
    .catch(() => {});
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    refreshThenSync();
  }, 5 * 60 * 1000);
};

export const stopAutoSync = () => {
  try { netSub && netSub(); } catch {}
  try { appStateSub && appStateSub.remove(); } catch {}
  if (intervalId) clearInterval(intervalId);
  netSub = null;
  appStateSub = null;
  intervalId = null;
};

export const getLastSync = async () => getJSON(KEYS.LAST_SYNC, null);
export const getQueueSize = async () => {
  const q = (await getJSON(KEYS.SYNC_QUEUE, [])) || [];
  return q.length;
};
export const getIsOnline = isOnline;
