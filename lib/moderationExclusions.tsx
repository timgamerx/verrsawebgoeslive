import { supabase } from "../components/supabase";

export type ModerationExclusions = {
  excludedPostKeys: Set<string>;
  excludedUserIds: Set<string>;
};

function normalizePostType(type?: string): string {
  const t = String(type || "").toLowerCase();
  if (t === "reel" || t === "reels" || t === "reelvideo") return "video";
  return t;
}

function getPostTypeVariants(type?: string): string[] {
  const raw = String(type || "").toLowerCase();
  const normalized = normalizePostType(raw);
  if (normalized === "video") {
    return [raw, "video", "reel", "reels", "reelvideo"].filter(Boolean);
  }
  return [raw, normalized].filter(Boolean);
}

export async function getActiveModerationExclusions(): Promise<ModerationExclusions> {
  const [reportedPostsResult, reportedUsersResult, userEnforcementResult, moderationExclusionsResult] = await Promise.all([
    supabase
      .from("reported_posts")
      .select("post_id, post_type, status, enforcement_action, enforcement_until")
      .neq("status", "rejected"),
    supabase
      .from("reported_users")
      .select("reported_user_id, status, enforcement_action, enforcement_until")
      .neq("status", "rejected"),
    supabase
      .from("user_enforcement_view")
      .select("user_id, enforcement_action, enforcement_until"),
    supabase
      .from("moderation_exclusions")
      .select("post_id, post_type, user_id, is_active")
      .eq("is_active", true),
  ]);

  const excludedPostKeys = new Set<string>();
  const excludedUserIds = new Set<string>();
  const nowTs = Date.now();

  (reportedPostsResult.data || []).forEach((row: any) => {
    const isActive =
      !row.enforcement_until ||
      new Date(row.enforcement_until).getTime() > nowTs;
    if (isActive && row.post_id && row.post_type) {
      getPostTypeVariants(row.post_type).forEach((type) => {
        excludedPostKeys.add(`${row.post_id}_${type}`);
      });
    }
  });

  (reportedUsersResult.data || []).forEach((row: any) => {
    const isActive =
      !row.enforcement_until ||
      new Date(row.enforcement_until).getTime() > nowTs;
    if (isActive && row.reported_user_id) {
      excludedUserIds.add(row.reported_user_id);
    }
  });

  // Explicitly exclude users with active account-level restrictions/bans.
  (userEnforcementResult.data || []).forEach((row: any) => {
    const action = String(row.enforcement_action || "").toLowerCase();
    const isRestricted = action === "restricted" || action === "banned";
    const isActive =
      !row.enforcement_until ||
      new Date(row.enforcement_until).getTime() > nowTs;

    if (isRestricted && isActive && row.user_id) {
      excludedUserIds.add(row.user_id);
    }
  });

  // Include precomputed exclusions table if present.
  (moderationExclusionsResult.data || []).forEach((row: any) => {
    if (row.user_id) {
      excludedUserIds.add(String(row.user_id));
    }
    if (row.post_id && row.post_type) {
      getPostTypeVariants(row.post_type).forEach((type) => {
        excludedPostKeys.add(`${row.post_id}_${type}`);
      });
    }
  });

  return { excludedPostKeys, excludedUserIds };
}