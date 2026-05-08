import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { hSuccess, hError } from '../../utils/haptics';

const evalStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return Math.min(s, 4);
};

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => evalStrength(password), [password]);
  // Mismatch warning is only shown once the user has typed in the
  // confirmation field, so they don't see "Passwords do not match" while
  // they're still typing the first password.
  const mismatch = password2.length > 0 && password !== password2;

  const onSubmit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== password2) return setError('Passwords do not match');
    setLoading(true);
    const r = await signUp(email.trim(), password);
    setLoading(false);
    if (!r.ok) {
      hError();
      setError(r.error || 'Sign up failed');
      return;
    }
    hSuccess();
    show('We emailed you a 6-digit code', { variant: 'success' });
    router.replace({ pathname: '/(auth)/verify', params: { email: email.trim() } });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
              </Pressable>
              <Text style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}>Create account</Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 15, marginTop: 4 }}>
                Start tracking in under a minute
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                leftIcon="mail-outline"
                variant="surface"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                leftIcon="lock-closed-outline"
                variant="surface"
              />
              <StrengthBar strength={strength} pwLength={password.length} />
              <Input
                label="Confirm password"
                value={password2}
                onChangeText={setPassword2}
                placeholder="Re-enter your password"
                secureTextEntry
                leftIcon="lock-closed-outline"
                variant="surface"
              />
              {mismatch ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13, marginTop: -SPACING.sm, marginBottom: SPACING.md }}>
                  Passwords do not match
                </Text>
              ) : null}
              {error ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13, marginTop: SPACING.sm }}>
                  {error}
                </Text>
              ) : null}

              <Button
                title="Create Account"
                onPress={onSubmit}
                loading={loading}
                disabled={!email || !password || !password2 || mismatch}
                style={{ marginTop: SPACING.xl }}
              />

              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                style={{ marginTop: SPACING.xl, alignItems: 'center' }}
                hitSlop={10}
              >
                <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14 }}>
                  Already have an account?{' '}
                  <Text style={{ color: COLORS.primary, fontFamily: FONT.semibold }}>Login</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const StrengthBar = ({ strength, pwLength }) => {
  const w = useSharedValue(0);
  React.useEffect(() => {
    w.value = withTiming(strength / 4, { duration: 250 });
  }, [strength]);

  const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#2CB67D', '#2CB67D'];
  const color = colors[strength];
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value * 100}%`,
    backgroundColor: color,
  }));

  if (pwLength === 0) return null;

  return (
    <View style={{ marginTop: -SPACING.sm, marginBottom: SPACING.lg }}>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 3,
              shadowColor: color,
              shadowOpacity: 0.6,
              shadowRadius: 4,
            },
            fillStyle,
          ]}
        />
      </View>
      <Text style={{ color, fontFamily: FONT.medium, fontSize: 12, marginTop: 6 }}>{labels[strength]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: SPACING.xl,
  },
});
