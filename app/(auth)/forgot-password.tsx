import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const result = await sendPasswordReset(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInfo("If an account exists for that email, a reset link is on its way.");
  }, [email, sendPasswordReset]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              We&apos;ll send a link to set a new password.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.onSurfaceVariant}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!submitting}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <GradientButton
              shape="pill"
              label={submitting ? "Sending…" : "Send reset link"}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Feather name="mail" size={18} color={COLORS.onPrimary} />
            </GradientButton>

            <Pressable onPress={goBack} style={styles.linkRow}>
              <Text style={styles.linkText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    gap: SPACING.xs,
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
  form: {
    gap: SPACING.lg,
  },
  field: {
    gap: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
});
