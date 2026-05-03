import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { KEYS, getJSON, setJSON } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const requestPermissions = async () => {
  try {
    if (Platform.OS === 'web') return false;
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (settings.canAskAgain === false) return false;
    const r = await Notifications.requestPermissionsAsync();
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
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: false },
      trigger: null,
    });
    lastMap[key] = stage;
    await setJSON(KEYS.ALERT_LAST_MONTH, lastMap);
  } catch {}
};
