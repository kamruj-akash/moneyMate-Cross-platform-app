import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING, FONT } from '../../constants/theme';

const ToastContext = createContext(null);

const variants = {
  success: { color: COLORS.success, icon: 'checkmark-circle' },
  error: { color: COLORS.danger, icon: 'alert-circle' },
  info: { color: COLORS.primary, icon: 'information-circle' },
  warning: { color: COLORS.warning, icon: 'warning' },
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const y = useSharedValue(-200);
  const insets = useSafeAreaInsets();
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    y.value = withTiming(-200, { duration: 220 }, (finished) => {
      if (finished) runOnJS(setToast)(null);
    });
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      const variant = options.variant || 'info';
      setToast({ message, variant });
      y.value = withSpring(0, { damping: 16, stiffness: 200 });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => dismiss(), options.duration || 3000);
    },
    [dismiss]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const v = toast ? variants[toast.variant] : null;

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + 8, borderLeftColor: v.color, shadowColor: v.color },
            SHADOWS.glow,
            animStyle,
          ]}
        >
          <Ionicons name={v.icon} size={20} color={v.color} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.text} numberOfLines={3}>{toast.message}</Text>
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
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderRightColor: COLORS.border,
    borderBottomColor: COLORS.border,
  },
  text: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
