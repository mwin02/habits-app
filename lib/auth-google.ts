import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export interface GoogleSignInController {
  signIn: () => Promise<void>;
  ready: boolean;
  inFlight: boolean;
}

export function useGoogleSignIn(
  onError: (message: string) => void,
): GoogleSignInController {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  const [inFlight, setInFlight] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) {
        setInFlight(false);
        onErrorRef.current("Google didn't return an ID token. Try again.");
        return;
      }
      void supabase.auth
        .signInWithIdToken({ provider: "google", token: idToken })
        .then(({ error }) => {
          if (error) onErrorRef.current(error.message);
        })
        .finally(() => setInFlight(false));
      return;
    }

    if (response.type === "error") {
      setInFlight(false);
      onErrorRef.current(
        response.error?.message ?? "Google sign-in failed. Try again.",
      );
      return;
    }

    if (response.type === "cancel" || response.type === "dismiss") {
      setInFlight(false);
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (!request) return;
    if (!GOOGLE_IOS_CLIENT_ID && !GOOGLE_ANDROID_CLIENT_ID) {
      onErrorRef.current(
        "Google sign-in isn't configured (missing client IDs).",
      );
      return;
    }
    setInFlight(true);
    try {
      await promptAsync();
    } catch (e) {
      setInFlight(false);
      const message =
        e instanceof Error ? e.message : "Google sign-in failed. Try again.";
      onErrorRef.current(message);
    }
  }, [request, promptAsync]);

  return {
    signIn,
    ready: !!request,
    inFlight,
  };
}
