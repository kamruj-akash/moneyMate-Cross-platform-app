import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/ui/Button';

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={{ flex: 1 }} />
          <Animated.View style={[styles.iconWrap, pulseStyle, SHADOWS.glow]}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-open-outline" size={56} color={COLORS.white} />
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(100)} style={[TEXT_STYLES.h1, { textAlign: 'center', marginBottom: SPACING.md }]}>
            Check your email
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.body}>
            We sent a confirmation link to{'\n'}
            <Text style={{ color: COLORS.primary, fontFamily: FONT.semibold }}>{email || 'your email'}</Text>
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.note}>
            Click the link, then come back here to login.
          </Animated.Text>

          <View style={{ flex: 1 }} />

          <Animated.View entering={FadeInDown.delay(400)} style={{ width: '100%' }}>
            <Button
              title="Open Email App"
              onPress={() => Linking.openURL('mailto:').catch(() => {})}
              style={{ marginBottom: SPACING.md }}
            />
            <Button
              title="Back to Login"
              variant="outline"
              onPress={() => router.replace('/(auth)/login')}
            />
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
  iconWrap: { marginBottom: SPACING.xxl },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    color: COLORS.textPrimary,
    fontFamily: FONT.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  note: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});
