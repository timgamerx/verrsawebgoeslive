// @ts-nocheck
import { supabase } from "../components/supabase";
import {
  V2_PREFIX,
  bytesToB64,
  b64ToBytes,
  decryptBytesV2,
  decryptV2,
  deriveCommunityKey,
  deriveConversationKey,
  encryptBytesV2,
  encryptV2,
  getPublishablePublicKey,
  isEcPublicKey,
  isV2Supported,
  randomKey32,
} from "./aesGcm";

/**
 * Per-community group keys (see supabase/migrations/20261103000000_community_group_keys.sql).
 *
 * - A community has numbered epochs; each epoch has a random AES-256 key.
 * - The key is wrapped for every member with ECDH between the wrapper and the member.
 * - When a member is removed/leaves, the next member to open the chat starts a new epoch
 *   wrapped only for the people still in the community.
 * - When a member joins, an existing key holder adds a wrapped copy of the current epoch
 *   for them (new members can read earlier history; removed members can't read new epochs).
 * - Text format: `v3:<epoch>:<iv>:<ciphertext>:<tag>`.
 */

export const V3_PREFIX = "v3:";

export interface CommunityKeyring {
  keys: Record<number, Uint8Array>;
  latest: number | null;
}

const wrapSalt = (communityId: string, epoch: number) =>
  `group-wrap:${communityId}:${epoch}`;

const wrapFor = async (
  communityId: string,
  epoch: number,
  groupKey: Uint8Array,
  recipientPublicKey: string,
): Promise<string> => {
  const k = await deriveConversationKey(
    wrapSalt(communityId, epoch),
    recipientPublicKey,
  );
  return bytesToB64(await encryptBytesV2(groupKey, k));
};

const unwrap = async (
  communityId: string,
  epoch: number,
  wrapped: string,
  wrapperPublicKey: string,
): Promise<Uint8Array | null> => {
  try {
    const k = await deriveConversationKey(
      wrapSalt(communityId, epoch),
      wrapperPublicKey,
    );
    return await decryptBytesV2(b64ToBytes(wrapped), k);
  } catch {
    return null;
  }
};

type KeyRow = {
  epoch: number;
  user_id: string;
  wrapped_key: string;
  wrapper_public_key: string;
};

const fetchRows = async (communityId: string): Promise<KeyRow[]> => {
  const { data, error } = await supabase
    .from("community_group_keys")
    .select("epoch, user_id, wrapped_key, wrapper_public_key")
    .eq("community_id", communityId);
  if (error) {
    console.error("Community key fetch failed:", error);
    return [];
  }
  return (data as KeyRow[]) || [];
};

const buildKeyring = async (
  communityId: string,
  myId: string,
  rows: KeyRow[],
): Promise<CommunityKeyring> => {
  const keys: Record<number, Uint8Array> = {};
  for (const r of rows.filter((x) => x.user_id === myId)) {
    const k = await unwrap(
      communityId,
      r.epoch,
      r.wrapped_key,
      r.wrapper_public_key,
    );
    if (k) keys[r.epoch] = k;
  }
  const epochs = Object.keys(keys).map(Number);
  return { keys, latest: epochs.length ? Math.max(...epochs) : null };
};

/** Current members (+ owner) and the EC public keys of those who have one. */
const loadMembers = async (communityId: string) => {
  const [{ data: members }, { data: community }] = await Promise.all([
    supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", communityId),
    supabase
      .from("community")
      .select("created_by")
      .eq("id", communityId)
      .single(),
  ]);
  const ids = new Set<string>((members || []).map((m: any) => m.user_id));
  if ((community as any)?.created_by) ids.add((community as any).created_by);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, public_key")
    .in("id", Array.from(ids));
  const pub: Record<string, string> = {};
  (profiles || []).forEach((p: any) => {
    if (isEcPublicKey(p.public_key)) pub[p.id] = p.public_key;
  });
  return { memberIds: ids, publicKeys: pub };
};

const insertWrapped = async (
  communityId: string,
  epoch: number,
  groupKey: Uint8Array,
  myId: string,
  myPublic: string,
  recipients: Record<string, string>,
): Promise<boolean> => {
  const rows: Record<string, any>[] = [];
  for (const [userId, recipientPub] of Object.entries(recipients)) {
    rows.push({
      community_id: communityId,
      epoch,
      user_id: userId,
      wrapped_key: await wrapFor(communityId, epoch, groupKey, recipientPub),
      wrapper_public_key: myPublic,
      recipient_public_key: recipientPub,
      created_by: myId,
    });
  }
  if (rows.length === 0) return true;
  const { error } = await supabase.from("community_group_keys").insert(rows);
  if (error) {
    // Most likely another member did the same at the same time: caller refetches.
    console.warn("Community key insert skipped:", error.message);
    return false;
  }
  return true;
};

/**
 * Brings this user's community keys up to date: creates epoch 1, rotates after
 * removals, and shares the current key with new members. Safe to call often.
 */
export const syncCommunityKeys = async (
  communityId: string,
  myId: string,
): Promise<CommunityKeyring> => {
  if (!isV2Supported()) return { keys: {}, latest: null };

  const myPublic = await getPublishablePublicKey();
  await supabase.from("profiles").update({ public_key: myPublic }).eq("id", myId);

  const { memberIds, publicKeys } = await loadMembers(communityId);
  const eligible: Record<string, string> = {};
  memberIds.forEach((id) => {
    if (publicKeys[id]) eligible[id] = publicKeys[id];
  });
  eligible[myId] = myPublic;

  let rows = await fetchRows(communityId);
  let ring = await buildKeyring(communityId, myId, rows);
  const latestEpoch = rows.length
    ? Math.max(...rows.map((r) => r.epoch))
    : null;

  if (latestEpoch === null) {
    await insertWrapped(communityId, 1, randomKey32(), myId, myPublic, eligible);
  } else {
    const latestRows = rows.filter((r) => r.epoch === latestEpoch);
    const removed = latestRows.some((r) => !memberIds.has(r.user_id));
    if (removed) {
      // Someone left or was removed: start a new epoch for current members only.
      await insertWrapped(
        communityId,
        latestEpoch + 1,
        randomKey32(),
        myId,
        myPublic,
        eligible,
      );
    } else if (ring.keys[latestEpoch]) {
      const have = new Set(latestRows.map((r) => r.user_id));
      const missing: Record<string, string> = {};
      Object.entries(eligible).forEach(([id, pk]) => {
        if (!have.has(id)) missing[id] = pk;
      });
      await insertWrapped(
        communityId,
        latestEpoch,
        ring.keys[latestEpoch],
        myId,
        myPublic,
        missing,
      );
    }
  }

  rows = await fetchRows(communityId);
  ring = await buildKeyring(communityId, myId, rows);
  return ring;
};

// ------------------------------------------------------------------ messages

export const encryptCommunityText = async (
  text: string,
  ring: CommunityKeyring,
): Promise<string | null> => {
  if (ring.latest === null) return null;
  const v2 = await encryptV2(text, ring.keys[ring.latest]);
  return `${V3_PREFIX}${ring.latest}:${v2.slice(V2_PREFIX.length)}`;
};

/**
 * Decrypts `v3:` (group key) and `v2:` (older community-id key) payloads.
 * `text` is null if the content isn't encrypted or the needed key is missing.
 */
export const decryptCommunityText = async (
  content: string,
  ring: CommunityKeyring,
  communityId: string,
): Promise<{ text: string | null; missingEpoch?: number }> => {
  try {
    if (content.startsWith(V3_PREFIX)) {
      const rest = content.slice(V3_PREFIX.length);
      const sep = rest.indexOf(":");
      const epoch = Number(rest.slice(0, sep));
      const key = ring.keys[epoch];
      if (!key) return { text: null, missingEpoch: epoch };
      const text = await decryptV2(`${V2_PREFIX}${rest.slice(sep + 1)}`, key);
      return { text };
    }
    if (content.startsWith(V2_PREFIX)) {
      return {
        text: await decryptV2(content, await deriveCommunityKey(communityId)),
      };
    }
  } catch (e) {
    console.warn("Community message could not be decrypted:", (e as any)?.name);
  }
  return { text: null };
};

