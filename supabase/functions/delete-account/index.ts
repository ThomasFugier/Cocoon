import {
  authenticatedUser,
  corsHeaders,
  jsonResponse,
  serviceClient,
} from "../_shared/push.ts";

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const DELETE_CONFIRMATION = "delete-my-account";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function removeStorageObjects(client: ReturnType<typeof serviceClient>, storagePaths: string[]) {
  let removed = 0;

  for (const paths of chunk(storagePaths, STORAGE_REMOVE_CHUNK_SIZE)) {
    const { error } = await client.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .remove(paths);

    if (error) {
      throw error;
    }

    removed += paths.length;
  }

  return removed;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const payload = await request.json().catch(() => null) as { confirm?: string } | null;

  if (payload?.confirm !== DELETE_CONFIRMATION) {
    return jsonResponse({ error: "confirmation_required" }, 400);
  }

  const user = await authenticatedUser(request);

  if (!user) {
    return jsonResponse({ error: "not_authenticated" }, 401);
  }

  const client = serviceClient();
  const { data: memberships, error: membershipError } = await client
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id);

  if (membershipError) {
    throw membershipError;
  }

  const coupleIds = Array.from(new Set((memberships ?? []).map((row) => row.couple_id as string).filter(Boolean)));
  let removedStorageObjects = 0;
  let emptyCoupleIdsBeforeDelete: string[] = [];

  if (coupleIds.length) {
    const { data: remainingMembers, error: remainingError } = await client
      .from("couple_members")
      .select("couple_id, user_id")
      .in("couple_id", coupleIds)
      .neq("user_id", user.id)
      .order("joined_at", { ascending: true });

    if (remainingError) {
      throw remainingError;
    }

    const nextOwnerByCouple = new Map<string, string>();

    for (const member of remainingMembers ?? []) {
      const coupleId = member.couple_id as string;
      const userId = member.user_id as string;

      if (coupleId && userId && !nextOwnerByCouple.has(coupleId)) {
        nextOwnerByCouple.set(coupleId, userId);
      }
    }

    emptyCoupleIdsBeforeDelete = coupleIds.filter((coupleId) => !nextOwnerByCouple.has(coupleId));

    const { data: attachments, error: attachmentError } = await client
      .from("chat_attachments")
      .select("storage_path, couple_id, uploaded_by")
      .in("couple_id", coupleIds);

    if (attachmentError) {
      throw attachmentError;
    }

    const emptyCoupleIdSet = new Set(emptyCoupleIdsBeforeDelete);
    const storagePaths = Array.from(
      new Set(
        (attachments ?? [])
          .filter((row) => row.uploaded_by === user.id || emptyCoupleIdSet.has(row.couple_id as string))
          .map((row) => row.storage_path as string)
          .filter(Boolean),
      ),
    );
    removedStorageObjects = await removeStorageObjects(client, storagePaths);

    for (const [coupleId, nextOwnerId] of nextOwnerByCouple) {
      const { error: ownerError } = await client
        .from("couples")
        .update({ created_by: nextOwnerId })
        .eq("id", coupleId)
        .eq("created_by", user.id);

      if (ownerError) {
        throw ownerError;
      }
    }
  }

  const { error: deleteUserError } = await client.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    throw deleteUserError;
  }

  let cleanedCouples = 0;

  if (coupleIds.length) {
    const { data: remainingMemberships, error: remainingMembershipsError } = await client
      .from("couple_members")
      .select("couple_id")
      .in("couple_id", coupleIds);

    if (remainingMembershipsError) {
      return jsonResponse({
        cleanup_error: remainingMembershipsError.message,
        deleted: true,
        removed_storage_objects: removedStorageObjects,
      }, 200);
    }

    const nonEmptyCouples = new Set((remainingMemberships ?? []).map((row) => row.couple_id as string));
    const emptyCoupleIds = Array.from(
      new Set([
        ...emptyCoupleIdsBeforeDelete,
        ...coupleIds.filter((coupleId) => !nonEmptyCouples.has(coupleId)),
      ]),
    ).filter((coupleId) => !nonEmptyCouples.has(coupleId));

    if (emptyCoupleIds.length) {
      const { error: deleteCouplesError } = await client
        .from("couples")
        .delete()
        .in("id", emptyCoupleIds);

      if (deleteCouplesError) {
        return jsonResponse({
          cleanup_error: deleteCouplesError.message,
          deleted: true,
          removed_storage_objects: removedStorageObjects,
        }, 200);
      }

      cleanedCouples = emptyCoupleIds.length;
    }
  }

  return jsonResponse({
    cleaned_couples: cleanedCouples,
    deleted: true,
    removed_storage_objects: removedStorageObjects,
  });
});
