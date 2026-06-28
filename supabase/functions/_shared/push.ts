import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

export type SupabaseServiceClient = ReturnType<typeof createClient>;

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wespice-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export type ExpoPushMessage = {
  body: string;
  channelId?: string;
  data?: Record<string, unknown>;
  sound?: "default";
  title: string;
  to: string;
};

export type PushTokenRow = {
  expo_push_token: string;
  user_id: string;
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

export function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("server_not_configured");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export function userClient(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("server_not_configured");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
      },
    },
  });
}

export async function authenticatedUser(request: Request) {
  const client = userClient(request);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function pushTokensForUsers(client: SupabaseServiceClient, userIds: string[]) {
  if (!userIds.length) {
    return [] as PushTokenRow[];
  }

  const { data, error } = await client
    .from("push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds)
    .eq("enabled", true);

  if (error) {
    throw error;
  }

  return (data ?? []) as PushTokenRow[];
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  if (!messages.length) {
    return { data: [] };
  }

  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    body: JSON.stringify(messages),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(JSON.stringify(payload ?? { status: response.status }));
  }

  return payload as {
    data?: Array<{
      details?: { error?: string };
      id?: string;
      message?: string;
      status: "ok" | "error";
    }>;
  };
}

export async function disableUnregisteredTokens(
  client: SupabaseServiceClient,
  tokens: string[],
  expoResponse: Awaited<ReturnType<typeof sendExpoPushMessages>>,
) {
  const unregistered = (expoResponse.data ?? [])
    .map((ticket, index) => ticket.details?.error === "DeviceNotRegistered" ? tokens[index] : null)
    .filter((token): token is string => Boolean(token));

  if (!unregistered.length) {
    return;
  }

  await client
    .from("push_tokens")
    .update({ enabled: false })
    .in("expo_push_token", unregistered);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
