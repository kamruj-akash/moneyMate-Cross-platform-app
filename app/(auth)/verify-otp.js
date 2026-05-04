import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { hSuccess, hError } from '../../utils/haptics';

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { show } = useToast();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);

  const onVerify = async () => {
    setError(null);
    if (otp.length < 6) return setError('Enter the verification code from your email');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'recovery',
      });
      if (err) throw err;
      hSuccess();
      router.replace({ pathname: '/(auth)/set-password', params: { email } });
    } catch (e) {
      hError();
      setError(e?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      hSuccess();
      show('New code sent', { variant: 'success' });
    } catch (e) {
      hError();
      show('Could not resend', { variant: 'error', description: e?.message });
    } finally {
      setResending(false);
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
              <Text style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}>Enter code</Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 15, marginTop: 4 }}>
                We sent a 6-digit code to{' '}
                <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.semibold }}>{email}</Text>
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Code"
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="••••••"
                keyboardType="number-pad"
                leftIcon="key-outline"
                variant="surface"
                inputStyle={{ letterSpacing: 6, fontSize: 22, fontFamily: FONT.semibold }}
                maxLength={10}
              />
              {error ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13, marginBottom: SPACING.md }}>
                  {error}
                </Text>
              ) : null}
              <Button title="Verify" onPress={onVerify} loading={loading} disabled={otp.length < 6 || loading} />
              <Pressable onPress={onResend} disabled={resending} style={{ alignItems: 'center', marginTop: SPACING.xl }} hitSlop={10}>
                <Text style={{ color: resending ? COLORS.textMuted : COLORS.primary, fontFamily: FONT.medium, fontSize: 14 }}>
                  {resending ? 'Sending…' : 'Resend code'}
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
