import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONT, SPACING, TEXT_STYLES } from '../../constants/theme';

const AnimView = Animated.View;

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoCorrect = false,
  error,
  hint,
  multiline = false,
  rightSlot,
  leftIcon,
  style,
  inputStyle,
  onFocus,
  onBlur,
  editable = true,
  maxLength,
  variant = 'underline', // 'underline' | 'surface'
  numberOfLines,
}) => {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const focus = useSharedValue(0);

  const handleFocus = (e) => {
    setFocused(true);
    focus.value = withTiming(1, { duration: 180 });
    onFocus?.(e);
  };
  const handleBlur = (e) => {
    setFocused(false);
    focus.value = withTiming(0, { duration: 180 });
    onBlur?.(e);
  };

  const underlineStyle = useAnimatedStyle(() => ({
    height: 1 + focus.value * 1,
    backgroundColor:
      focus.value > 0
        ? error
          ? COLORS.danger
          : COLORS.primary
        : error
          ? COLORS.danger
          : COLORS.border,
    shadowOpacity: focus.value * 0.4,
  }));

  const surfaceBorderStyle = useAnimatedStyle(() => ({
    borderColor:
      focus.value > 0
        ? error
          ? COLORS.danger
          : COLORS.primary
        : error
          ? COLORS.danger
          : COLORS.border,
    borderWidth: 1 + focus.value,
  }));

  const isPassword = !!secureTextEntry;

  const baseInput = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      secureTextEntry={isPassword && !show}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      onFocus={handleFocus}
      onBlur={handleBlur}
      multiline={multiline}
      numberOfLines={numberOfLines}
      editable={editable}
      maxLength={maxLength}
      selectionColor={COLORS.primary}
      style={[
        {
          color: COLORS.textPrimary,
          fontFamily: FONT.regular,
          fontSize: 16,
          paddingVertical: variant === 'underline' ? 10 : 14,
          paddingHorizontal: variant === 'underline' ? 0 : SPACING.lg,
          flex: 1,
          textAlignVertical: multiline ? 'top' : 'center',
          minHeight: multiline ? 80 : undefined,
        },
        inputStyle,
      ]}
    />
  );

  return (
    <View style={[{ marginBottom: SPACING.lg }, style]}>
      {label ? <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.sm }]}>{label}</Text> : null}
      {variant === 'surface' ? (
        <AnimView
          style={[
            {
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: multiline ? 'flex-start' : 'center',
              paddingHorizontal: leftIcon ? SPACING.md : 0,
              paddingVertical: 0,
              minHeight: 52,
            },
            surfaceBorderStyle,
          ]}
        >
          {leftIcon ? (
            <View style={{ paddingLeft: 4, paddingRight: SPACING.sm }}>
              <Ionicons name={leftIcon} size={20} color={focused ? COLORS.primary : COLORS.textMuted} />
            </View>
          ) : null}
          {baseInput}
          {isPassword ? (
            <Pressable onPress={() => setShow((v) => !v)} style={{ paddingHorizontal: SPACING.md }} hitSlop={8}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
            </Pressable>
          ) : null}
          {rightSlot}
        </AnimView>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {leftIcon ? (
              <Ionicons
                name={leftIcon}
                size={20}
                color={focused ? COLORS.primary : COLORS.textMuted}
                style={{ marginRight: SPACING.sm }}
              />
            ) : null}
            {baseInput}
            {isPassword ? (
              <Pressable onPress={() => setShow((v) => !v)} style={{ paddingHorizontal: SPACING.sm }} hitSlop={8}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </Pressable>
            ) : null}
            {rightSlot}
          </View>
          <AnimView style={[underlineStyle, { shadowColor: COLORS.primary, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }]} />
        </View>
      )}
      {error ? (
        <Text style={[TEXT_STYLES.bodySmall, { color: COLORS.danger, marginTop: SPACING.xs }]}>{error}</Text>
      ) : hint ? (
        <Text style={[TEXT_STYLES.caption, { marginTop: SPACING.xs }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

export default Input;
