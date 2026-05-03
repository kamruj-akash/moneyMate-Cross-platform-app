import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { COLORS, GRADIENTS, RADIUS, SHADOWS, SPACING, TEXT_STYLES, FONT } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { hLight } from '../../utils/haptics';

export default function Welcome() {
  const router = useRouter();
  const { continueOffline } = useAuth();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={{ flex: 1 }} />
          <Animated.View entering={FadeIn.duration(600)} style={[styles.logoWrap, pulseStyle, SHADOWS.glow]}>
            <LinearGradient
              colors={GRADIENTS.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoLetter}>M</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(500).delay(200)} style={[TEXT_STYLES.h1, styles.title]}>
            MoneyMate
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(500).delay(300)} style={styles.tagline}>
            Track smart. Spend smarter.
          </Animated.Text>

          <View style={{ flex: 1 }} />

          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ width: '100%' }}>
            <Button
              title="Sign Up"
              variant="primary"
              onPress={() => router.push('/(auth)/signup')}
              style={{ marginBottom: SPACING.md }}
            />
            <Button
              title="Login"
              variant="outline"
              onPress={() => router.push('/(auth)/login')}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={{ marginTop: SPACING.xl }}>
            <Pressable
              onPress={async () => {
                hLight();
                await continueOffline();
                router.replace('/(tabs)');
              }}
              hitSlop={10}
            >
              <Text style={styles.offline}>Continue without account →</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: SPACING.xxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 44,
    fontFamily: FONT.bold,
    color: COLORS.white,
    letterSpacing: -2,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 16,
    textAlign: 'center',
  },
  offline: {
    color: COLORS.textSecondary,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
});
