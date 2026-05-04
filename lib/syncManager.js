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

export const queueAction = async (type, table, data) => {
  const queue = (await getJSON(KEYS.SYNC_QUEUE, [])) || [];
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    table,
    data,
    queued_at: new Date().toISOString(),
  });
  await setJSON(KEYS.SYNC_QUEUE, queue);
  emit('queue', { size: queue.length });
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

const executeAction = async (action, userId) => {
  const { type, table, data } = action;
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
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      logErr(`upsert ${table}`, error);
      throw error;
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
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

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
      map.set(item.id, cUpd >= lUpd ? item : existing);
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
    const [cloudTx, cloudCat, cloudRec, cloudSet] = await Promise.all([
      fetchAll('transactions', userId),
      fetchAll('categories', userId),
      fetchAll('recurring_transactions', userId),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const localTx = (await getJSON(KEYS.TRANSACTIONS, [])) || [];
    const localCat = (await getJSON(KEYS.CATEGORIES, [])) || [];
    const localRec = (await getJSON(KEYS.RECURRING, [])) || [];
    const localSet = (await getJSON(KEYS.SETTINGS, null)) || null;

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
      setJSON(KEYS.TRANSACTIONS, mergedTx),
      setJSON(KEYS.CATEGORIES, mergedCat),
      setJSON(KEYS.RECURRING, mergedRec),
      mergedSet ? setJSON(KEYS.SETTINGS, mergedSet) : Promise.resolve(),
    ]);
    await setJSON(KEYS.LAST_SYNC, new Date().toISOString());
    emit('pull_done', null);
    return { ran: true, counts: { tx: mergedTx.length, cat: mergedCat.length, rec: mergedRec.length } };
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

export const startAutoSync = () => {
  netSub = NetInfo.addEventListener((state) => {
    if (state.isConnected) processSyncQueue().catch(() => {});
  });
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') fullSync().catch(() => {});
  });
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    fullSync().catch(() => {});
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
