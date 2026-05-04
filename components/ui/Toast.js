import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { color: COLORS.success, icon: 'checkmark-circle' },
  error: { color: COLORS.danger, icon: 'alert-circle' },
  info: { color: COLORS.primary, icon: 'information-circle' },
  warning: { color: COLORS.warning, icon: 'warning' },
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const y = useSharedValue(-160);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    y.value = withTiming(-160, { duration: 220, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setToast)(null);
    });
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      // Accept either show("string") or show("title", { description, variant, duration })
      const variant = options.variant || 'info';
      setToast({ message, description: options.description, variant });
      y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 200 });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => dismiss(), options.duration || 3500);
    },
    [dismiss]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  const v = toast ? VARIANTS[toast.variant] || VARIANTS.info : null;

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <Animated.View
          style={[styles.wrap, { top: insets.top + 8 }, animStyle]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${v.color}1F` }]}>
            <Ionicons name={v.icon} size={18} color={v.color} />
          </View>
          <View style={{ flex: 1, paddingTop: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{toast.message}</Text>
            {toast.description ? (
              <Text style={styles.description} numberOfLines={3}>{toast.description}</Text>
            ) : null}
          </View>
          <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color={COLORS.textMuted} />
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {}, dismiss: () => {} };
  return ctx;
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  description: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
