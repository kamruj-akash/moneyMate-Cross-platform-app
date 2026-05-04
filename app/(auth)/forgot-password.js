import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { hSuccess, hError } from '../../utils/haptics';

export default function ForgotPassword() {
  const router = useRouter();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      hSuccess();
      show('Code sent', {
        variant: 'success',
        description: `Check ${email.trim()} for the 6-digit code.`,
      });
      router.push({ pathname: '/(auth)/verify-otp', params: { email: email.trim() } });
    } catch (e) {
      hError();
      setError(e?.message || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
              </Pressable>
              <Text style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}>Reset password</Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 15, marginTop: 4 }}>
                We'll email you a 6-digit code to verify it's you.
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
                autoCapitalize="none"
              />
              {error ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13, marginBottom: SPACING.md }}>
                  {error}
                </Text>
              ) : null}
              <Button title="Send code" onPress={onSubmit} loading={loading} disabled={!email || loading} />
              <Pressable onPress={() => router.replace('/(auth)/login')} style={{ alignItems: 'center', marginTop: SPACING.xl }} hitSlop={10}>
                <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14 }}>
                  Remembered your password?{' '}
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

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingHorizontal: SPACING.xl },
});
