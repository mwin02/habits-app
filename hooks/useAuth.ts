import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    error: string | null;
    needsConfirmation: boolean;
    alreadyExists: boolean;
  }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  resendSignUpConfirmation: (
    email: string,
  ) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession ?? null);
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback<AuthContextValue["signInWithPassword"]>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        return {
          error: error.message,
          needsConfirmation: false,
          alreadyExists: false,
        };
      }
      // Supabase obscures existing-email signups for security: it returns a
      // user with an empty `identities` array (and no session) instead of an
      // error. Detect that here so we can route the user to "Sign in" rather
      // than the confirm-email screen.
      const alreadyExists =
        !!data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0 &&
        !data.session;
      const needsConfirmation = !data.session && !alreadyExists;
      return { error: null, needsConfirmation, alreadyExists };
    },
    [],
  );

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback<
    AuthContextValue["sendPasswordReset"]
  >(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: error?.message ?? null };
  }, []);

  const resendSignUpConfirmation = useCallback<
    AuthContextValue["resendSignUpConfirmation"]
  >(async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signInWithPassword,
      signUp,
      signOut,
      sendPasswordReset,
      resendSignUpConfirmation,
    }),
    [
      session,
      loading,
      signInWithPassword,
      signUp,
      signOut,
      sendPasswordReset,
      resendSignUpConfirmation,
    ],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
