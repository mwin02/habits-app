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

import { SocialButtons } from "@/components/auth/social-buttons";
import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

export default function SignInScreen(): React.ReactElement {
  const router = useRouter();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/settings");
    }
  }, [email, password, signInWithPassword, router]);

  const goToSignUp = useCallback(() => {
    router.replace("/(auth)/sign-up");
  }, [router]);

  const goToForgot = useCallback(() => {
    router.push("/(auth)/forgot-password");
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to sync your time across devices.
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

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!submitting}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <GradientButton
              shape="pill"
              label={submitting ? "Signing in…" : "Sign in"}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Feather name="log-in" size={18} color={COLORS.onPrimary} />
            </GradientButton>

            <Pressable onPress={goToForgot} style={styles.linkRow}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>

            <SocialButtons
              disabled={submitting}
              onStart={() => setError(null)}
              onError={setError}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Pressable onPress={goToSignUp} hitSlop={8}>
              <Text style={styles.footerLink}>Sign up</Text>
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
  linkRow: {
    alignSelf: "center",
    paddingVertical: SPACING.sm,
  },
  linkText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  footer: {
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING["2xl"],
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  footerLink: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.primary,
  },
});
