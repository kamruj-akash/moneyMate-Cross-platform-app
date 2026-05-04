import React, { useEffect } from 'react';
import { Modal, View, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, SPACING } from '../../constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const Sheet = ({ visible, onClose, children }) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220, easing: Easing.in(Easing.cubic) });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const close = () => onClose?.();

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 200 || e.velocityY > 900) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220, easing: Easing.in(Easing.cubic) });
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    });

  return (
    <Modal visible={visible} animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: COLORS.bg },
            sheetStyle,
          ]}
        >
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <GestureDetector gesture={pan}>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>
              </GestureDetector>
              <View style={{ flex: 1 }}>{children}</View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  handleWrap: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});

export default Sheet;
