import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { KEYS, getJSON, setJSON } from './storage';

// expo-notifications throws on import in Expo Go (SDK 53+). Detect and lazy-require.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let _Notifications = undefined; // undefined = not tried, null = unavailable, object = ready

const getNotifications = () => {
  if (Platform.OS === 'web') return null;
  if (isExpoGo) return null;
  if (_Notifications !== undefined) return _Notifications;
  try {
    const mod = require('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    _Notifications = mod;
  } catch {
    _Notifications = null;
  }
  return _Notifications;
};

export const requestPermissions = async () => {
  const N = getNotifications();
  if (!N) return false;
  try {
    const settings = await N.getPermissionsAsync();
    if (settings.granted) return true;
    if (settings.canAskAgain === false) return false;
    const r = await N.requestPermissionsAsync();
    return !!r.granted;
  } catch {
    return false;
  }
};

// Ask once on first launch so users get the system dialog right after
// install (instead of waiting for the first budget alert to need it).
// We persist a "already asked" flag so we don't keep prompting on every
// cold start — Android shows the dialog at most once anyway, but the
// flag also lets us avoid useless permission round-trips.
export const ensureFirstLaunchPermission = async () => {
  try {
    const N = getNotifications();
    if (!N) return false; // Expo Go / web — nothing to ask for.

    const asked = await getJSON(KEYS.NOTIF_PERM_REQUESTED, false);
    if (asked) return true;

    // If permission is already granted (e.g. user reinstalled and OS
    // remembers), short-circuit and just record the flag.
    const settings = await N.getPermissionsAsync();
    if (settings.granted) {
      await setJSON(KEYS.NOTIF_PERM_REQUESTED, true);
      return true;
    }
    if (settings.canAskAgain === false) {
      await setJSON(KEYS.NOTIF_PERM_REQUESTED, true);
      return false;
    }

    const r = await N.requestPermissionsAsync();
    await setJSON(KEYS.NOTIF_PERM_REQUESTED, true);
    return !!r.granted;
  } catch {
    return false;
  }
};

const monthKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}`;

export const maybeAlertBudget = async ({ monthExpense, budget, alertThreshold }) => {
  if (!budget || budget <= 0) return;
  const pct = (Number(monthExpense) / Number(budget)) * 100;
  const threshold = Number(alertThreshold || 80);
  if (pct < threshold) return;

  const now = new Date();
  const key = monthKey(now);
  const lastMap = (await getJSON(KEYS.ALERT_LAST_MONTH, {})) || {};
  const stage = pct >= 100 ? 'exceeded' : 'threshold';
  if (lastMap[key] === stage || lastMap[key] === 'exceeded') return;

  const N = getNotifications();
  if (!N) {
    // Notifications unavailable (Expo Go) — record the stage so we don't keep checking
    lastMap[key] = stage;
    await setJSON(KEYS.ALERT_LAST_MONTH, lastMap);
    return;
  }

  const granted = await requestPermissions();
  if (!granted) {
    lastMap[key] = stage;
    await setJSON(KEYS.ALERT_LAST_MONTH, lastMap);
    return;
  }

  const title = pct >= 100 ? 'Budget exceeded' : 'Budget alert';
  const body =
    pct >= 100
      ? `You've crossed your monthly budget (${pct.toFixed(0)}%). Time to slow down.`
      : `You've used ${pct.toFixed(0)}% of your monthly budget.`;

  try {
    await N.scheduleNotificationAsync({
      content: { title, body, sound: false },
      trigger: null,
    });
    lastMap[key] = stage;
    await setJSON(KEYS.ALERT_LAST_MONTH, lastMap);
  } catch {}
};
