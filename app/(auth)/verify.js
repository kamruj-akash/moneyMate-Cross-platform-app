import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "../../components/GradientBackground";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";
import { COLORS, FONT, SPACING, TEXT_STYLES } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { hError, hSuccess } from "../../utils/haptics";

// Sign-up confirmation screen. After signUp, Supabase emails a 6-digit OTP
// (the email template needs `{{ .Token }}` for this to work — Supabase's
// default "Confirm signup" template includes both a link and a token).
//
// Verifying with type:'signup' creates the auth.users row + returns a fresh
// session, so onAuthStateChange in AuthContext picks it up and the user is
// effectively logged in. The redirect to /(tabs) is just a safety net.
const RESEND_COOLDOWN_S = 600;

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { show } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const tickRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    tickRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [cooldown === 0]);

  const onVerify = async () => {
    setError(null);
    if (otp.trim().length < 6)
      return setError("Enter the 6-digit code from your email");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email: String(email || "").trim(),
        token: otp.trim(),
        type: "signup",
      });
      if (err) throw err;
      hSuccess();
      show("Email verified — welcome!", { variant: "success" });
      // The auth listener in AuthContext will set the session; AuthGate
      // will redirect to (tabs). We push directly too in case the user
      // is sitting on this screen when state updates.
      router.replace("/(tabs)");
    } catch (e) {
      hError();
      setError(e?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: String(email || "").trim(),
      });
      if (err) throw err;
      hSuccess();
      show("New code sent", {
        variant: "success",
        description: "Check your email",
      });
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      hError();
      show("Could not resend", { variant: "error", description: e?.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                style={styles.back}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={COLORS.textPrimary}
                />
              </Pressable>

              <Animated.View
                entering={FadeIn.duration(220)}
                style={styles.iconBubble}
              >
                <Ionicons
                  name="mail-open-outline"
                  size={28}
                  color={COLORS.primary}
                />
              </Animated.View>

              <Animated.Text
                entering={FadeInDown.delay(80)}
                style={[TEXT_STYLES.h1, { marginTop: SPACING.lg }]}
              >
                Verify your email
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(160)}
                style={styles.sub}
              >
                We sent a 6-digit code to{"\n"}
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontFamily: FONT.semibold,
                  }}
                >
                  {email || "your email"}
                </Text>
              </Animated.Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Verification code"
                value={otp}
                onChangeText={(v) =>
                  setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))
                }
                placeholder="••••••"
                keyboardType="number-pad"
                leftIcon="key-outline"
                variant="surface"
                inputStyle={{
                  letterSpacing: 8,
                  fontSize: 22,
                  fontFamily: FONT.semibold,
                  textAlign: "center",
                }}
                maxLength={6}
              />
              {error ? (
                <Text
                  style={{
                    color: COLORS.danger,
                    fontFamily: FONT.medium,
                    fontSize: 13,
                    marginBottom: SPACING.md,
                  }}
                >
                  {error}
                </Text>
              ) : null}

              <Button
                title="Verify & sign in"
                onPress={onVerify}
                loading={loading}
                disabled={otp.length < 6 || loading}
              />

              <Pressable
                onPress={() => Linking.openURL("mailto:").catch(() => {})}
                hitSlop={10}
                style={{ alignItems: "center", marginTop: SPACING.lg }}
              >
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontFamily: FONT.medium,
                    fontSize: 13,
                  }}
                >
                  Open email app
                </Text>
              </Pressable>

              <View style={styles.resendRow}>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: FONT.regular,
                    fontSize: 13,
                  }}
                >
                  Didn't receive it?{" "}
                </Text>
                <Pressable
                  onPress={onResend}
                  disabled={cooldown > 0 || resending}
                  hitSlop={8}
                >
                  <Text
                    style={{
                      color:
                        cooldown > 0 || resending
                          ? COLORS.textMuted
                          : COLORS.primary,
                      fontFamily: FONT.semibold,
                      fontSize: 13,
                    }}
                  >
                    {resending
                      ? "Sending…"
                      : cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : "Resend code"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

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
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(127,90,240,0.18)",
    borderWidth: 1,
    borderColor: "rgba(127,90,240,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
  sub: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: SPACING.xl,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
});
