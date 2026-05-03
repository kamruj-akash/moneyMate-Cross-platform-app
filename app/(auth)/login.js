import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { hSuccess, hError } from '../../utils/haptics';

export default function Login() {
  const router = useRouter();
  const { signIn, resetPassword, restoring } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email');
    if (!password) return setError('Enter your password');
    setLoading(true);
    const r = await signIn(email.trim(), password);
    setLoading(false);
    if (!r.ok) {
      hError();
      setError(r.error || 'Login failed');
      return;
    }
    hSuccess();
    show('Welcome back', { variant: 'success' });
    router.replace('/(tabs)');
  };

  const onForgot = async () => {
    if (!email.includes('@')) return setError('Enter your email first');
    const r = await resetPassword(email.trim());
    if (r.ok) show('Password reset email sent', { variant: 'success' });
    else show(r.error || 'Could not send reset email', { variant: 'error' });
  };

  if (restoring) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 16, marginTop: SPACING.lg }}>
            Restoring your data…
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13, marginTop: 6 }}>
            Syncing transactions from cloud
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
              </Pressable>
              <Text style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}>Welcome back</Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 15, marginTop: 4 }}>
                Login to access your data
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
                placeholder="Your password"
                secureTextEntry
                leftIcon="lock-closed-outline"
                variant="surface"
              />
              {error ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13 }}>{error}</Text>
              ) : null}

              <Pressable onPress={onForgot} hitSlop={10} style={{ alignSelf: 'flex-end', marginTop: -SPACING.sm, marginBottom: SPACING.lg }}>
                <Text style={{ color: COLORS.primary, fontFamily: FONT.medium, fontSize: 13 }}>Forgot password?</Text>
              </Pressable>

              <Button title="Login" onPress={onSubmit} loading={loading} disabled={!email || !password} />

              <Pressable
                onPress={() => router.replace('/(auth)/signup')}
                style={{ marginTop: SPACING.xl, alignItems: 'center' }}
                hitSlop={10}
              >
                <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14 }}>
                  No account?{' '}
                  <Text style={{ color: COLORS.primary, fontFamily: FONT.semibold }}>Sign up</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  back: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingHorizontal: SPACING.xl },
});
