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

export default function SetPassword() {
  const router = useRouter();
  const { show } = useToast();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (pwd.length < 8) return setError('Password must be at least 8 characters');
    if (pwd !== pwd2) return setError('Passwords do not match');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pwd });
      if (err) throw err;
      hSuccess();
      show('Password updated', {
        variant: 'success',
        description: 'You are now logged in.',
      });
      router.replace('/(tabs)');
    } catch (e) {
      hError();
      setError(e?.message || 'Could not set password');
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
              <Text style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}>Set new password</Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 15, marginTop: 4 }}>
                Pick a strong password you'll remember.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="New password"
                value={pwd}
                onChangeText={setPwd}
                placeholder="At least 8 characters"
                secureTextEntry
                variant="surface"
                leftIcon="lock-closed-outline"
              />
              <Input
                label="Confirm password"
                value={pwd2}
                onChangeText={setPwd2}
                placeholder="Re-enter password"
                secureTextEntry
                variant="surface"
                leftIcon="lock-closed-outline"
              />
              {error ? (
                <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 13, marginBottom: SPACING.md }}>
                  {error}
                </Text>
              ) : null}
              <Button title="Update password" onPress={onSubmit} loading={loading} disabled={!pwd || !pwd2 || loading} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  form: { paddingHorizontal: SPACING.xl },
});
