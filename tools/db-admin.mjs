#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const VERSION = "1.0.0";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env");
const AUTH_PAGE_SIZE = 1000;
const STORAGE_BUCKET = "chat-attachments";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

const COMMAND_ALIASES = new Map([
  ["help", "help"],
  ["-h", "help"],
  ["--help", "help"],
  ["get user list", "list-users"],
  ["get-user-list", "list-users"],
  ["list-users", "list-users"],
  ["users", "list-users"],
  ["list", "list-users"],
  ["get user info", "get-user-info"],
  ["get-user-info", "get-user-info"],
  ["user-info", "get-user-info"],
  ["info", "get-user-info"],
  ["update profile", "update-profile"],
  ["update-profile", "update-profile"],
  ["set profile", "update-profile"],
  ["set-profile", "update-profile"],
  ["update auth", "update-auth"],
  ["update-auth", "update-auth"],
  ["set auth", "update-auth"],
  ["set-auth", "update-auth"],
  ["delete user", "delete-user"],
  ["delete-user", "delete-user"],
  ["delete", "delete-user"],
  ["interactive", "interactive"],
  ["menu", "interactive"],
]);

const SHORT_OPTIONS = new Map([
  ["-e", "email"],
  ["-i", "id"],
  ["-s", "search"],
  ["-l", "limit"],
  ["-y", "yes"],
  ["-j", "json"],
]);

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

function normalizeCommandKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractCommand(argv) {
  if (!argv.length) {
    return { command: "interactive", rest: [] };
  }

  let bestMatch = null;
  const commandTokens = [];

  for (let index = 0; index < Math.min(argv.length, 4); index += 1) {
    const token = argv[index];

    if (token.startsWith("--")) {
      break;
    }

    commandTokens.push(token);
    const spaced = normalizeCommandKey(commandTokens.join(" "));
    const dashed = spaced.replace(/\s+/g, "-");
    const alias = COMMAND_ALIASES.get(spaced) ?? COMMAND_ALIASES.get(dashed);

    if (alias) {
      bestMatch = { alias, tokenCount: commandTokens.length };
    }
  }

  if (bestMatch) {
    return {
      command: bestMatch.alias,
      rest: argv.slice(bestMatch.tokenCount),
    };
  }

  const command = COMMAND_ALIASES.get(normalizeCommandKey(argv[0])) ?? argv[0].toLowerCase();
  return { command, rest: argv.slice(1) };
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const normalizedShort = SHORT_OPTIONS.get(token);

    if (normalizedShort) {
      if (["yes", "json"].includes(normalizedShort)) {
        options[normalizedShort] = true;
      } else {
        options[normalizedShort] = argv[index + 1];
        index += 1;
      }
      continue;
    }

    if (token.startsWith("--")) {
      const withoutPrefix = token.slice(2);
      const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s, 2);
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      if (inlineValue !== undefined) {
        options[key] = inlineValue;
      } else if (["json", "yes", "dryRun", "showSecrets"].includes(key)) {
        options[key] = true;
      } else {
        options[key] = argv[index + 1];
        index += 1;
      }
      continue;
    }

    positionals.push(token);
  }

  return { options, positionals };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requiredIdentifier(positionals, options) {
  const identifier = options.email ?? options.id ?? positionals[0];

  if (!identifier) {
    throw new Error("Provide a user email or id.");
  }

  return identifier;
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

function jsonPrint(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseJsonOption(value, label) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
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
  const normalized = identifier.trim();

  if (!normalized) {
    throw new Error("Empty user identifier.");
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

async function listUsers(options = {}) {
  const client = createAdminClient();
  const maxUsers = options.limit ? Number.parseInt(options.limit, 10) : Number.POSITIVE_INFINITY;

  if (Number.isNaN(maxUsers) || maxUsers <= 0) {
    throw new Error("--limit must be a positive number.");
  }

  const search = options.search?.toLowerCase();
  const authUsers = await listAuthUsers(client, maxUsers);
  const filteredAuthUsers = search
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

      return haystack.includes(search);
    })
    : authUsers;

  const userIds = filteredAuthUsers.map((user) => user.id);
  const profiles = await selectRows(client, "profiles", "*", { id: userIds });
  const memberships = await selectRows(client, "couple_members", "user_id,couple_id,role,joined_at", { user_id: userIds });
  const profileById = indexBy(profiles, (profile) => profile.id);
  const membershipsByUserId = groupBy(memberships, (membership) => membership.user_id);

  const rows = filteredAuthUsers.map((user) => {
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

  if (options.json) {
    jsonPrint(rows);
    return rows;
  }

  console.table(rows);
  return rows;
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

async function getUserInfo(identifier, options = {}) {
  const client = createAdminClient();
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

  const result = {
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

  jsonPrint(result);
  return result;
}

async function updateProfile(identifier, options = {}) {
  const client = createAdminClient();
  const user = await resolveUser(client, identifier);
  const changes = {};

  if (options.displayName !== undefined) {
    changes.display_name = options.displayName;
  }

  if (options.color !== undefined) {
    changes.color = options.color;
  }

  if (options.vibe !== undefined) {
    changes.vibe = options.vibe;
  }

  if (options.statusEmoji !== undefined) {
    changes.status_emoji = options.statusEmoji;
    changes.status_updated_at = new Date().toISOString();
  }

  if (!Object.keys(changes).length) {
    throw new Error("Nothing to update. Use --display-name, --color, --vibe, or --status-emoji.");
  }

  const { data, error } = await client
    .from("profiles")
    .update(changes)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (options.json) {
    jsonPrint(data);
  } else {
    console.log(`Profile updated for ${user.email ?? user.id}.`);
    console.table([data]);
  }

  return data;
}

async function ensureConfirmed(targetUser, options, actionLabel) {
  const expected = targetUser.email ?? targetUser.id;
  const allowed = new Set([expected, targetUser.id].filter(Boolean));
  const provided = options.confirm;

  if (provided && allowed.has(provided)) {
    return;
  }

  if (options.yes && !provided) {
    throw new Error(`--yes requires --confirm "${expected}" for ${actionLabel}.`);
  }

  if (!process.stdin.isTTY) {
    throw new Error(`Confirmation required. Re-run with --confirm "${expected}".`);
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`Type "${expected}" to confirm ${actionLabel}: `);
  rl.close();

  if (!allowed.has(answer.trim())) {
    throw new Error("Confirmation mismatch. Aborted.");
  }
}

async function updateAuth(identifier, options = {}) {
  const client = createAdminClient();
  const user = await resolveUser(client, identifier);
  const updates = {};

  if (options.email !== undefined) {
    updates.email = options.email;
  }

  const userMetadata = parseJsonOption(options.userMetadataJson, "--user-metadata-json");
  const appMetadata = parseJsonOption(options.appMetadataJson, "--app-metadata-json");

  if (userMetadata !== undefined) {
    updates.user_metadata = userMetadata;
  }

  if (appMetadata !== undefined) {
    updates.app_metadata = appMetadata;
  }

  if (!Object.keys(updates).length) {
    throw new Error("Nothing to update. Use --email, --user-metadata-json, or --app-metadata-json.");
  }

  if (updates.email || updates.app_metadata) {
    await ensureConfirmed(user, options, "auth update");
  }

  const { data, error } = await client.auth.admin.updateUserById(user.id, updates);

  if (error) {
    throw error;
  }

  const result = publicAuthUser(data.user);

  if (options.json) {
    jsonPrint(result);
  } else {
    console.log(`Auth user updated for ${user.email ?? user.id}.`);
    jsonPrint(result);
  }

  return result;
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

async function deleteUser(identifier, options = {}) {
  const client = createAdminClient();
  const user = await resolveUser(client, identifier);
  const plan = await buildDeletePlan(client, user);

  if (options.dryRun) {
    jsonPrint({ dry_run: true, plan });
    return plan;
  }

  await ensureConfirmed(user, options, "user deletion");

  const ownerTransfers = plan.owner_transfers;
  const removedStorageObjects = await removeStorageObjects(client, plan.storage_objects_to_remove);

  for (const transfer of ownerTransfers) {
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

  const result = {
    deleted: true,
    user_id: user.id,
    email: user.email,
    cleaned_couples: cleanedCouples,
    removed_storage_objects: removedStorageObjects,
  };

  jsonPrint(result);
  return result;
}

function printHelp() {
  console.log(`
WeSpice DB Admin ${VERSION}

Usage:
  tools\\db-admin.ps1
  tools\\db-admin.ps1 Get User List
  tools\\db-admin.ps1 Get User Info user@email.com
  tools\\db-admin.ps1 Update Profile user@email.com --display-name "Alex" --color rose
  tools\\db-admin.ps1 Update Auth user@email.com --email new@email.com --confirm user@email.com
  tools\\db-admin.ps1 Delete User user@email.com --dry-run
  tools\\db-admin.ps1 Delete User user@email.com --confirm user@email.com

Commands:
  Get User List        List auth users by email, id, profile name, and couple count.
  Get User Info        Show auth, profile, couple, purchase, notification, and usage state.
  Update Profile       Update public.profiles fields.
  Update Auth          Update auth email or metadata. Confirmation required for sensitive changes.
  Delete User          Delete auth user and cascade app data. Use --dry-run first.

Options:
  --search TEXT
  --limit N
  --json
  --show-secrets
  --confirm EMAIL_OR_ID
  --yes

Required env:
  EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

async function promptOptional(rl, question) {
  const answer = await rl.question(question);
  return answer.trim() || undefined;
}

async function promptRequired(rl, question) {
  const answer = await promptOptional(rl, question);

  if (!answer) {
    throw new Error("A user email or id is required.");
  }

  return answer;
}

async function interactiveMenu() {
  const client = createAdminClient();
  const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    throw error;
  }

  const rl = readline.createInterface({ input, output });

  console.log("WeSpice DB Admin");
  console.log("Connected. Service role key is loaded locally.\n");

  while (true) {
    console.log("1. Get User List");
    console.log("2. Get User Info");
    console.log("3. Update Profile");
    console.log("4. Update Auth");
    console.log("5. Delete User");
    console.log("6. Help");
    console.log("0. Quit");

    const choice = (await rl.question("> ")).trim();

    try {
      if (choice === "0" || choice.toLowerCase() === "q") {
        break;
      }

      if (choice === "1") {
        const search = await promptOptional(rl, "Search email/name/id (optional): ");
        await listUsers(search ? { search } : {});
      } else if (choice === "2") {
        const identifier = await promptRequired(rl, "Email or user id: ");
        await getUserInfo(identifier);
      } else if (choice === "3") {
        const identifier = await promptRequired(rl, "Email or user id: ");
        const displayName = await promptOptional(rl, "Display name (empty = skip): ");
        const color = await promptOptional(rl, "Color (empty = skip): ");
        const vibe = await promptOptional(rl, "Vibe (empty = skip): ");
        const statusEmoji = await promptOptional(rl, "Status emoji (empty = skip): ");
        await updateProfile(identifier, { color, displayName, statusEmoji, vibe });
      } else if (choice === "4") {
        const identifier = await promptRequired(rl, "Email or user id: ");
        const email = await promptOptional(rl, "New email (empty = skip): ");
        const userMetadataJson = await promptOptional(rl, "User metadata JSON (empty = skip): ");
        await updateAuth(identifier, { email, userMetadataJson });
      } else if (choice === "5") {
        const identifier = await promptRequired(rl, "Email or user id: ");
        const dryRun = (await rl.question("Dry run first? [Y/n] ")).trim().toLowerCase() !== "n";
        await deleteUser(identifier, { dryRun });
      } else if (choice === "6") {
        printHelp();
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    console.log("");
  }

  rl.close();
}

async function main() {
  const { command, rest } = extractCommand(process.argv.slice(2));
  const { options, positionals } = parseArgs(rest);

  switch (command) {
    case "help":
      printHelp();
      break;
    case "interactive":
      await interactiveMenu();
      break;
    case "list-users":
      await listUsers(options);
      break;
    case "get-user-info":
      await getUserInfo(requiredIdentifier(positionals, options), options);
      break;
    case "update-profile":
      await updateProfile(requiredIdentifier(positionals, options), options);
      break;
    case "update-auth":
      await updateAuth(requiredIdentifier(positionals, options), options);
      break;
    case "delete-user":
      await deleteUser(requiredIdentifier(positionals, options), options);
      break;
    default:
      throw new Error(`Unknown command: ${command}. Run tools\\db-admin.ps1 help.`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
