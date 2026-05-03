import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const safe = (fn) => {
  if (Platform.OS === 'web') return;
  try { fn(); } catch {}
};

export const hSelection = () => safe(() => Haptics.selectionAsync());
export const hLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const hHeavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
export const hSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const hError = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
