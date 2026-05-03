import React from 'react';
import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { COLORS, GRADIENTS, RADIUS, SHADOWS, SPACING, TEXT_STYLES, FONT } from '../../constants/theme';
import { hLight } from '../../utils/haptics';

const AnimPressable = Animated.createAnimatedComponent(Pressable);

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  icon,
  iconRight,
  style,
  textStyle,
  fullWidth = true,
  haptics = true,
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onIn = () => { scale.value = withSpring(0.97, { damping: 14, stiffness: 220 }); };
  const onOut = () => { scale.value = withSpring(1, { damping: 14, stiffness: 220 }); };
  const handlePress = () => {
    if (haptics) hLight();
    onPress?.();
  };

  const heights = { sm: 40, md: 48, lg: 56 };
  const radius = size === 'sm' ? RADIUS.md : RADIUS.lg;
  const paddingH = size === 'sm' ? SPACING.lg : SPACING.xl;
  const isDisabled = disabled || loading;

  const inner = (
    <View style={[styles.row, { paddingHorizontal: paddingH, height: heights[size] }]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.textOnPrimary : COLORS.primary} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: SPACING.sm }}>{icon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              size === 'sm' ? styles.textSm : styles.textLg,
              variant === 'ghost' && { color: COLORS.textPrimary },
              variant === 'outline' && { color: COLORS.textPrimary },
              variant === 'danger' && { color: COLORS.danger },
              variant === 'subtle' && { color: COLORS.textPrimary },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight ? <View style={{ marginLeft: SPACING.sm }}>{iconRight}</View> : null}
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <AnimPressable
        onPress={isDisabled ? null : handlePress}
        onPressIn={onIn}
        onPressOut={onOut}
        style={[
          fullWidth && { alignSelf: 'stretch' },
          { borderRadius: radius },
          SHADOWS.glow,
          isDisabled && { opacity: 0.55 },
          animStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={GRADIENTS.buttonPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ borderRadius: radius, overflow: 'hidden' }]}
        >
          {inner}
        </LinearGradient>
      </AnimPressable>
    );
  }

  const bg =
    variant === 'outline'
      ? COLORS.transparent
      : variant === 'ghost'
        ? COLORS.transparent
        : variant === 'danger'
          ? COLORS.expenseBg
          : COLORS.surfaceElevated;
  const border =
    variant === 'outline' ? COLORS.borderStrong : variant === 'danger' ? COLORS.expenseBorder : COLORS.border;

  return (
    <AnimPressable
      onPress={isDisabled ? null : handlePress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={[
        fullWidth && { alignSelf: 'stretch' },
        {
          borderRadius: radius,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          overflow: 'hidden',
        },
        isDisabled && { opacity: 0.55 },
        animStyle,
        style,
      ]}
    >
      {inner}
    </AnimPressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSm: { fontSize: 14, fontFamily: FONT.medium, color: COLORS.textOnPrimary },
  textLg: { fontSize: 16, fontFamily: FONT.semibold, color: COLORS.textOnPrimary, letterSpacing: 0.2 },
});

export default Button;
