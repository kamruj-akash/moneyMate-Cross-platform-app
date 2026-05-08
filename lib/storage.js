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
  CLOUD_PUSHED: '@moneymate:cloud_pushed', // map of userId -> true
  LAST_USER_ID: '@moneymate:last_user_id', // detect account switch
  PROFILES: '@moneymate:profiles',
  ACTIVE_PROFILE_ID: '@moneymate:active_profile_id',
  // Persisted minimal user info ({ id, email }). Survives a refresh-token
  // failure when the device is offline so the UI keeps showing "logged in"
  // until the user explicitly signs out. Cleared by signOut().
  AUTH_USER: '@moneymate:auth_user',
};

// Clear only data tables, keeping session-related preferences.
export const clearLocalDataTables = async () => {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.TRANSACTIONS),
    AsyncStorage.removeItem(KEYS.CATEGORIES),
    AsyncStorage.removeItem(KEYS.RECURRING),
    AsyncStorage.removeItem(KEYS.SETTINGS),
    AsyncStorage.removeItem(KEYS.SYNC_QUEUE),
    AsyncStorage.removeItem(KEYS.LAST_SYNC),
    AsyncStorage.removeItem(KEYS.RECURRING_LAST_RUN),
    AsyncStorage.removeItem(KEYS.ALERT_LAST_MONTH),
    AsyncStorage.removeItem(KEYS.CLOUD_PUSHED),
    AsyncStorage.removeItem(KEYS.PROFILES),
    AsyncStorage.removeItem(KEYS.ACTIVE_PROFILE_ID),
  ]);
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
