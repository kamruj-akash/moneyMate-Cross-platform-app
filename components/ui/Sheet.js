import React, { useEffect } from 'react';
import { Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

const Sheet = ({ visible, onClose, children, height = '85%' }) => {
  const translateY = useSharedValue(800);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 180, mass: 0.6 });
    } else {
      translateY.value = withTiming(800, { duration: 240, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const close = () => onClose?.();

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.value = withTiming(800, { duration: 240 });
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay }, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              {
                backgroundColor: COLORS.surfaceElevated,
                borderTopLeftRadius: RADIUS.xxl,
                borderTopRightRadius: RADIUS.xxl,
                maxHeight: height,
                minHeight: 200,
                overflow: 'hidden',
              },
              SHADOWS.sheet,
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <View style={{ flex: 1 }}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  handleWrap: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default Sheet;
