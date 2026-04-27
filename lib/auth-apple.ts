import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { supabase } from "@/lib/supabase";

export interface AppleSignInResult {
  error: string | null;
  cancelled: boolean;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return {
        error: "Apple didn't return an identity token. Try again.",
        cancelled: false,
      };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    return { error: error?.message ?? null, cancelled: false };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") {
      return { error: null, cancelled: true };
    }
    const message =
      e instanceof Error ? e.message : "Apple sign-in failed. Try again.";
    return { error: message, cancelled: false };
  }
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
