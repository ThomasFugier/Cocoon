import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type AuthProvider = "google" | "apple";

export async function signInWithProvider(provider: AuthProvider) {
  if (!supabase) {
    throw new Error("Supabase n'est pas encore configuré.");
  }

  const redirectTo = AuthSession.makeRedirectUri({
    scheme: "wespice",
    path: "auth",
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Aucune URL OAuth retournée.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    return null;
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get("code");

  if (!code) {
    throw new Error("Le provider n'a pas retourné de code de session.");
  }

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw exchangeError;
  }

  return sessionData.session;
}

export async function signOut() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}
