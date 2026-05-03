import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  TRANSACTIONS: '@moneymate:transactions',
  CATEGORIES: '@moneymate:categories',
  RECURRING: '@moneymate:recurring',
  SETTINGS: '@moneymate:settings',
  SYNC_QUEUE: '@moneymate:sync_queue',
  LAST_SYNC: '@moneymate:last_sync',
  OFFLINE_MODE: '@moneymate:offline_mode',
  ALERT_LAST_MONTH: '@moneymate:alert_last_month',
  RECURRING_LAST_RUN: '@moneymate:recurring_last_run',
};

export const getJSON = async (key, fallback = null) => {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const setJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const remove = async (key) => {
  try { await AsyncStorage.removeItem(key); } catch {}
};

export const clearAllAppData = async () => {
  await Promise.all(
    Object.values(KEYS).map((k) => AsyncStorage.removeItem(k))
  );
};
