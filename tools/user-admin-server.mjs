#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env");
const htmlPath = path.join(__dirname, "user-admin.html");
const AUTH_PAGE_SIZE = 1000;
const DEFAULT_PORT = 4876;
const HOST = "127.0.0.1";
const STORAGE_BUCKET = "chat-attachments";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

function loadEnvFile() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function getConfig() {
  loadEnvFile();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL in environment/.env.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env from Supabase Project Settings > API. Do not use the anon key.",
    );
  }

  return { serviceRoleKey, supabaseUrl };
}

function createAdminClient() {
  const { serviceRoleKey, supabaseUrl } = getConfig();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function parseArgs(argv) {
  const options = {
    open: false,
    port: DEFAULT_PORT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--open") {
      options.open = true;
    } else if (token === "--port") {
      options.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (token.startsWith("--port=")) {
      options.port = Number.parseInt(token.slice("--port=".length), 10);
    }
  }

  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error("--port must be between 1024 and 65535.");
  }

  return options;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function groupBy(items, keyGetter) {
  const map = new Map();

  for (const item of items) {
    const key = keyGetter(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }

  return map;
}

function indexBy(items, keyGetter) {
  const map = new Map();

  for (const item of items) {
    map.set(keyGetter(item), item);
  }

  return map;
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function formatDate(value) {
  return value ? new Date(value).toISOString() : "";
}

function maskValue(value, visiblePrefix = 10, visibleSuffix = 6) {
  if (!value || typeof value !== "string") {
    return value;
  }

  if (value.length <= visiblePrefix + visibleSuffix + 3) {
    return `${value.slice(0, 3)}...`;
  }

  return `${value.slice(0, visiblePrefix)}...${value.slice(-visibleSuffix)}`;
}

function publicAuthUser(user) {
  return {
    id: user.id,
    aud: user.aud,
    role: user.role,
    email: user.email,
    phone: user.phone,
    confirmed_at: user.confirmed_at,
    email_confirmed_at: user.email_confirmed_at,
    phone_confirmed_at: user.phone_confirmed_at,
    last_sign_in_at: user.last_sign_in_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    banned_until: user.banned_until,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    identities: (user.identities ?? []).map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      identity_data: identity.identity_data,
      created_at: identity.created_at,
      updated_at: identity.updated_at,
      last_sign_in_at: identity.last_sign_in_at,
    })),
  };
}

async function listAuthUsers(client, maxUsers = Number.POSITIVE_INFINITY) {
  const users = [];

  for (let page = 1; users.length < maxUsers; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: Math.min(AUTH_PAGE_SIZE, Math.max(1, maxUsers - users.length)),
    });

    if (error) {
      throw error;
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < AUTH_PAGE_SIZE) {
      break;
    }
  }

  return users;
}

async function resolveUser(client, identifier) {
  const normalized = String(identifier ?? "").trim();

  if (!normalized) {
    throw new Error("Provide a user email or id.");
  }

  if (isUuid(normalized)) {
    const { data, error } = await client.auth.admin.getUserById(normalized);

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(`User not found: ${normalized}`);
    }

    return data.user;
  }

  const users = await listAuthUsers(client);
  const wantedEmail = normalized.toLowerCase();
  const exactMatches = users.filter((user) => user.email?.toLowerCase() === wantedEmail);

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    throw new Error(`Several auth users share email ${normalized}; use the user id instead.`);
  }

  const suggestions = users
    .filter((user) => user.email?.toLowerCase().includes(wantedEmail))
    .slice(0, 5)
    .map((user) => `${user.email} (${user.id})`);

  throw new Error(
    suggestions.length
      ? `User not found: ${normalized}. Close matches: ${suggestions.join(", ")}`
      : `User not found: ${normalized}`,
  );
}

async function selectRows(client, table, columns, filters = {}) {
  let query = client.from(table).select(columns);

  for (const [column, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (!value.length) {
        return [];
      }

      query = query.in(column, value);
    } else {
      query = query.eq(column, value);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

async function countRows(client, table, filters = {}) {
  let query = client.from(table).select("*", { count: "exact", head: true });

  for (const [column, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (!value.length) {
        return 0;
      }

      query = query.in(column, value);
    } else {
      query = query.eq(column, value);
    }
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function listUsers(client, { limit = 100, search = "" } = {}) {
  const maxUsers = Number.parseInt(limit, 10);

  if (Number.isNaN(maxUsers) || maxUsers <= 0) {
    throw new Error("limit must be a positive number.");
  }

  const normalizedSearch = String(search).trim().toLowerCase();
  const authUsers = await listAuthUsers(client, normalizedSearch ? Number.POSITIVE_INFINITY : Math.min(maxUsers, AUTH_PAGE_SIZE));
  const filteredAuthUsers = normalizedSearch
    ? authUsers.filter((user) => {
      const haystack = [
        user.id,
        user.email,
        user.phone,
        user.user_metadata?.display_name,
        user.user_metadata?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    }).slice(0, maxUsers)
    : authUsers;

  const userIds = filteredAuthUsers.map((user) => user.id);
  const profiles = await selectRows(client, "profiles", "*", { id: userIds });
  const memberships = await selectRows(client, "couple_members", "user_id,couple_id,role,joined_at", { user_id: userIds });
  const profileById = indexBy(profiles, (profile) => profile.id);
  const membershipsByUserId = groupBy(memberships, (membership) => membership.user_id);

  return filteredAuthUsers.map((user) => {
    const profile = profileById.get(user.id);
    const userMemberships = membershipsByUserId.get(user.id) ?? [];

    return {
      email: user.email ?? "",
      id: user.id,
      display_name: profile?.display_name ?? "",
      provider: user.app_metadata?.provider ?? "",
      couples: userMemberships.length,
      created_at: formatDate(user.created_at),
      last_sign_in_at: formatDate(user.last_sign_in_at),
    };
  });
}

async function getUserInfo(client, identifier, options = {}) {
  const user = await resolveUser(client, identifier);
  const memberships = await selectRows(client, "couple_members", "couple_id,user_id,role,joined_at", { user_id: user.id });
  const coupleIds = Array.from(new Set(memberships.map((membership) => membership.couple_id).filter(Boolean)));
  const couples = await selectRows(client, "couples", "id,invite_code,created_by,created_at", { id: coupleIds });
  const allMembers = await selectRows(client, "couple_members", "couple_id,user_id,role,joined_at", { couple_id: coupleIds });
  const memberUserIds = Array.from(new Set([user.id, ...allMembers.map((member) => member.user_id)].filter(Boolean)));
  const profiles = await selectRows(client, "profiles", "*", { id: memberUserIds });
  const profileById = indexBy(profiles, (profile) => profile.id);
  const coupleById = indexBy(couples, (couple) => couple.id);
  const membersByCoupleId = groupBy(allMembers, (member) => member.couple_id);

  const [
    notificationPreferences,
    pushTokens,
    moods,
    dailyUsage,
    entitlements,
    categoryUnlocks,
    featureUnlocks,
    appRateLimits,
  ] = await Promise.all([
    selectRows(client, "notification_preferences", "*", { user_id: user.id }),
    selectRows(client, "push_tokens", "*", { user_id: user.id }),
    selectRows(client, "couple_moods", "*", { user_id: user.id }),
    selectRows(client, "daily_response_usage", "*", { user_id: user.id }),
    selectRows(client, "purchase_entitlements", "*", { couple_id: coupleIds }),
    selectRows(client, "couple_category_unlocks", "*", { couple_id: coupleIds }),
    selectRows(client, "couple_feature_unlocks", "*", { couple_id: coupleIds }),
    selectRows(client, "app_rate_limits", "*", { user_id: user.id }),
  ]);

  const counts = {
    authored_chat_messages: await countRows(client, "chat_messages", { author_id: user.id }),
    uploaded_chat_attachments: await countRows(client, "chat_attachments", { uploaded_by: user.id }),
    custom_desire_cards: await countRows(client, "custom_desire_cards", { created_by: user.id }),
    desire_votes: await countRows(client, "desire_votes", { user_id: user.id }),
    match_reveals: await countRows(client, "match_reveals", { user_id: user.id }),
    notification_events: await countRows(client, "notification_events", { recipient_id: user.id }),
  };

  return {
    auth: publicAuthUser(user),
    profile: profileById.get(user.id) ?? null,
    couples: memberships.map((membership) => {
      const couple = coupleById.get(membership.couple_id) ?? null;
      const members = (membersByCoupleId.get(membership.couple_id) ?? []).map((member) => ({
        ...member,
        profile: profileById.get(member.user_id) ?? null,
      }));

      return {
        membership,
        couple,
        members,
      };
    }),
    state: {
      notification_preferences: notificationPreferences,
      push_tokens: options.showSecrets
        ? pushTokens
        : pushTokens.map((token) => ({
          ...token,
          expo_push_token: maskValue(token.expo_push_token),
        })),
      moods,
      daily_response_usage: dailyUsage,
      purchase_entitlements: entitlements,
      category_unlocks: categoryUnlocks,
      feature_unlocks: featureUnlocks,
      app_rate_limits: appRateLimits,
      counts,
    },
  };
}

async function updateProfile(client, identifier, changes) {
  const user = await resolveUser(client, identifier);
  const payload = {};

  if (changes.display_name !== undefined) {
    payload.display_name = changes.display_name;
  }

  if (changes.color !== undefined) {
    payload.color = changes.color;
  }

  if (changes.vibe !== undefined) {
    payload.vibe = changes.vibe;
  }

  if (changes.status_emoji !== undefined) {
    payload.status_emoji = changes.status_emoji;
    payload.status_updated_at = new Date().toISOString();
  }

  if (!Object.keys(payload).length) {
    throw new Error("Nothing to update.");
  }

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateAuth(client, identifier, changes) {
  const user = await resolveUser(client, identifier);
  const expected = user.email ?? user.id;

  if (changes.confirm !== expected && changes.confirm !== user.id) {
    throw new Error(`Type ${expected} in the confirmation field before changing auth data.`);
  }

  const payload = {};

  if (changes.email !== undefined && changes.email !== user.email) {
    payload.email = changes.email;
  }

  if (changes.user_metadata !== undefined) {
    payload.user_metadata = changes.user_metadata;
  }

  if (changes.app_metadata !== undefined) {
    payload.app_metadata = changes.app_metadata;
  }

  if (!Object.keys(payload).length) {
    throw new Error("Nothing to update.");
  }

  const { data, error } = await client.auth.admin.updateUserById(user.id, payload);

  if (error) {
    throw error;
  }

  return publicAuthUser(data.user);
}

async function storagePathsForDeletion(client, userId, coupleIds, emptyCoupleIds) {
  if (!coupleIds.length) {
    return [];
  }

  const attachments = await selectRows(client, "chat_attachments", "storage_path,couple_id,uploaded_by", { couple_id: coupleIds });
  const emptyCoupleIdSet = new Set(emptyCoupleIds);

  return Array.from(
    new Set(
      attachments
        .filter((row) => row.uploaded_by === userId || emptyCoupleIdSet.has(row.couple_id))
        .map((row) => row.storage_path)
        .filter(Boolean),
    ),
  );
}

async function removeStorageObjects(client, storagePaths) {
  let removed = 0;

  for (const paths of chunk(storagePaths, STORAGE_REMOVE_CHUNK_SIZE)) {
    const { error } = await client.storage.from(STORAGE_BUCKET).remove(paths);

    if (error) {
      throw error;
    }

    removed += paths.length;
  }

  return removed;
}

async function buildDeletePlan(client, user) {
  const memberships = await selectRows(client, "couple_members", "couple_id,user_id,role,joined_at", { user_id: user.id });
  const coupleIds = Array.from(new Set(memberships.map((membership) => membership.couple_id).filter(Boolean)));
  const remainingMembers = coupleIds.length
    ? await selectRows(client, "couple_members", "couple_id,user_id,role,joined_at", { couple_id: coupleIds })
    : [];
  const otherMembers = remainingMembers
    .filter((member) => member.user_id !== user.id)
    .sort((left, right) => String(left.joined_at).localeCompare(String(right.joined_at)));
  const nextOwnerByCouple = new Map();

  for (const member of otherMembers) {
    if (!nextOwnerByCouple.has(member.couple_id)) {
      nextOwnerByCouple.set(member.couple_id, member.user_id);
    }
  }

  const emptyCoupleIdsBeforeDelete = coupleIds.filter((coupleId) => !nextOwnerByCouple.has(coupleId));
  const storagePaths = await storagePathsForDeletion(client, user.id, coupleIds, emptyCoupleIdsBeforeDelete);

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    memberships,
    couple_ids: coupleIds,
    couples_that_will_be_empty: emptyCoupleIdsBeforeDelete,
    owner_transfers: Array.from(nextOwnerByCouple.entries()).map(([couple_id, next_owner_id]) => ({
      couple_id,
      next_owner_id,
    })),
    storage_objects_to_remove: storagePaths,
  };
}

async function deleteUser(client, identifier, confirm) {
  const user = await resolveUser(client, identifier);
  const expected = user.email ?? user.id;

  if (confirm !== expected && confirm !== user.id) {
    throw new Error(`Type ${expected} in the confirmation field before deleting this user.`);
  }

  const plan = await buildDeletePlan(client, user);
  const removedStorageObjects = await removeStorageObjects(client, plan.storage_objects_to_remove);

  for (const transfer of plan.owner_transfers) {
    const { error } = await client
      .from("couples")
      .update({ created_by: transfer.next_owner_id })
      .eq("id", transfer.couple_id)
      .eq("created_by", user.id);

    if (error) {
      throw error;
    }
  }

  const { error: deleteUserError } = await client.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    throw deleteUserError;
  }

  let cleanedCouples = 0;

  if (plan.couple_ids.length) {
    const remainingMemberships = await selectRows(client, "couple_members", "couple_id", { couple_id: plan.couple_ids });
    const nonEmptyCouples = new Set(remainingMemberships.map((membership) => membership.couple_id));
    const emptyCoupleIds = Array.from(
      new Set([
        ...plan.couples_that_will_be_empty,
        ...plan.couple_ids.filter((coupleId) => !nonEmptyCouples.has(coupleId)),
      ]),
    ).filter((coupleId) => !nonEmptyCouples.has(coupleId));

    if (emptyCoupleIds.length) {
      const { error } = await client.from("couples").delete().in("id", emptyCoupleIds);

      if (error) {
        throw error;
      }

      cleanedCouples = emptyCoupleIds.length;
    }
  }

  return {
    cleaned_couples: cleanedCouples,
    deleted: true,
    email: user.email,
    removed_storage_objects: removedStorageObjects,
    user_id: user.id,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response, html) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(html);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunkPart of request) {
    chunks.push(chunkPart);
  }

  const text = Buffer.concat(chunks).toString("utf8");

  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

function requireApiToken(request, token) {
  return request.headers["x-admin-token"] === token;
}

function openBrowser(url) {
  const command = process.platform === "win32"
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

function htmlWithToken(token) {
  return fs
    .readFileSync(htmlPath, "utf8")
    .replace("__ADMIN_TOKEN__", token);
}

async function handleApi({ client, request, response, token, url }) {
  if (!requireApiToken(request, token)) {
    sendJson(response, 401, { error: "invalid_admin_token" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/status") {
    const { supabaseUrl } = getConfig();
    sendJson(response, 200, { ok: true, supabase_url: supabaseUrl });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users") {
    const rows = await listUsers(client, {
      limit: url.searchParams.get("limit") ?? "100",
      search: url.searchParams.get("search") ?? "",
    });
    sendJson(response, 200, { users: rows });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/user") {
    const identifier = url.searchParams.get("identifier");
    const showSecrets = url.searchParams.get("showSecrets") === "true";
    sendJson(response, 200, await getUserInfo(client, identifier, { showSecrets }));
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/user/profile") {
    const body = await readJsonBody(request);
    const profile = await updateProfile(client, body.identifier, body.changes ?? {});
    sendJson(response, 200, { profile });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/user/auth") {
    const body = await readJsonBody(request);
    const auth = await updateAuth(client, body.identifier, body.changes ?? {});
    sendJson(response, 200, { auth });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/user/delete-plan") {
    const body = await readJsonBody(request);
    const user = await resolveUser(client, body.identifier);
    sendJson(response, 200, { plan: await buildDeletePlan(client, user) });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/user") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await deleteUser(client, body.identifier, body.confirm));
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function listen(server, preferredPort) {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    const started = await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE") {
          resolve(false);
        } else {
          reject(error);
        }
      };
      const onListening = () => {
        server.off("error", onError);
        resolve(true);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, HOST);
    });

    if (started) {
      return port;
    }
  }

  throw new Error(`No free port found from ${preferredPort} to ${preferredPort + 19}.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = createAdminClient();
  const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    throw error;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const html = htmlWithToken(token);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${HOST}`);

    Promise.resolve().then(async () => {
      if (url.pathname.startsWith("/api/")) {
        await handleApi({ client, request, response, token, url });
        return;
      }

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/user-admin.html")) {
        sendHtml(response, html);
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }).catch((errorToReport) => {
      sendJson(response, 500, { error: errorToReport.message });
    });
  });

  const port = await listen(server, options.port);
  const url = `http://${HOST}:${port}/`;

  console.log(`WeSpice User Admin running at ${url}`);
  console.log("Keep this terminal open. Press Ctrl+C to stop.");

  if (options.open) {
    openBrowser(url);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
