import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ConfirmEmailScreen(): React.ReactElement {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendSignUpConfirmation } = useAuth();

  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCooldown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startCooldown]);

  const handleResend = useCallback(async () => {
    if (!email || resending || secondsLeft > 0) return;
    setResending(true);
    setError(null);
    setInfo(null);
    const result = await resendSignUpConfirmation(email);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInfo("Confirmation email sent. Check your inbox.");
    startCooldown();
  }, [email, resending, secondsLeft, resendSignUpConfirmation, startCooldown]);

  const goToSignIn = useCallback(() => {
    router.replace("/(auth)/sign-in");
  }, [router]);

  const cooldownActive = secondsLeft > 0;
  const resendLabel = resending
    ? "Sending…"
    : cooldownActive
      ? `Resend in ${secondsLeft}s`
      : "Resend confirmation email";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Feather name="mail" size={28} color={COLORS.primary} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to{" "}
            <Text style={styles.emailHighlight}>{email ?? "your email"}</Text>.
            Tap it to finish setting up your account, then come back and sign
            in.
          </Text>
        </View>

        <View style={styles.actions}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <GradientButton
            shape="pill"
            label={resendLabel}
            onPress={handleResend}
            disabled={!email || resending || cooldownActive}
          >
            <Feather name="refresh-cw" size={18} color={COLORS.onPrimary} />
          </GradientButton>

          <Pressable onPress={goToSignIn} style={styles.linkRow}>
            <Text style={styles.linkText}>I&apos;ve confirmed — sign in</Text>
          </Pressable>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Not seeing the email?</Text>
          <Text style={styles.helpBody}>
            Check your spam folder, or wait a minute and tap resend. If the
            address is wrong, sign up again with the correct email.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING["3xl"],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  header: {
    gap: SPACING.sm,
    marginBottom: SPACING["2xl"],
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  emailHighlight: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.titleMd.fontFamily,
  },
  actions: {
    gap: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  error: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
  info: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.secondary,
  },
  linkRow: {
    alignSelf: "center",
    paddingVertical: SPACING.sm,
  },
  linkText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  helpCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  helpTitle: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  helpBody: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
