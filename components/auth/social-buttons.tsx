import * as AppleAuthentication from "expo-apple-authentication";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  isAppleAuthAvailable,
  signInWithApple,
} from "@/lib/auth-apple";
import { useGoogleSignIn } from "@/lib/auth-google";

interface SocialButtonsProps {
  onError: (message: string) => void;
  onStart?: () => void;
  disabled?: boolean;
}

export function SocialButtons({
  onError,
  onStart,
  disabled,
}: SocialButtonsProps): React.ReactElement | null {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleInFlight, setAppleInFlight] = useState(false);
  const google = useGoogleSignIn(onError);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    isAppleAuthAvailable().then((ok) => {
      if (mounted) setAppleAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleApple = useCallback(async () => {
    if (appleInFlight || disabled) return;
    onStart?.();
    setAppleInFlight(true);
    const result = await signInWithApple();
    setAppleInFlight(false);
    if (result.cancelled) return;
    if (result.error) onError(result.error);
  }, [appleInFlight, disabled, onError, onStart]);

  const handleGoogle = useCallback(() => {
    if (disabled || google.inFlight) return;
    onStart?.();
    void google.signIn();
  }, [disabled, google, onStart]);

  const showApple = Platform.OS === "ios" && appleAvailable;
  if (!showApple && !google.ready) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {showApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={
            AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={RADIUS.full}
          style={styles.appleButton}
          onPress={handleApple}
        />
      ) : null}

      <Pressable
        onPress={handleGoogle}
        disabled={disabled || !google.ready || google.inFlight}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.googlePressed,
          (!google.ready || disabled) && styles.googleDisabled,
        ]}
      >
        {google.inFlight ? (
          <ActivityIndicator size="small" color={COLORS.onSurface} />
        ) : (
          <>
            <GoogleGlyph />
            <Text style={styles.googleLabel}>Continue with Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function GoogleGlyph(): React.ReactElement {
  return (
    <View style={styles.googleGlyphWrap}>
      <Text style={styles.googleGlyph}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginVertical: SPACING.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  dividerText: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  appleButton: {
    width: "100%",
    height: 52,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.lg,
  },
  googlePressed: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  googleDisabled: {
    opacity: 0.5,
  },
  googleLabel: {
    ...TYPOGRAPHY.button,
    color: COLORS.onSurface,
    fontSize: 15,
  },
  googleGlyphWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  googleGlyph: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 18,
    color: "#4285F4",
  },
});
