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
  const [reportedPostsResult, reportedUsersResult, postEnforcementResult, userEnforcementResult] = await Promise.all([
    supabase
      .from("reported_posts")
      .select("post_id, post_type, status, enforcement_action, enforcement_until")
      .neq("status", "rejected"),
    supabase
      .from("reported_users")
      .select("reported_user_id, status, enforcement_action, enforcement_until")
      .neq("status", "rejected"),
    supabase
      .from("post_enforcement_view")
      .select("post_id, post_type, user_id, enforcement_action, enforcement_until"),
    supabase
      .from("user_enforcement_view")
      .select("user_id, enforcement_action, enforcement_until"),
  ]);

  const excludedPostKeys = new Set<string>();
  const excludedUserIds = new Set<string>();
  const nowTs = Date.now();

  const shouldHidePost = (row: any) => {
    if (!row?.post_id || !row?.post_type) return false;

    const action = String(row?.enforcement_action || "").toLowerCase();
    const status = String(row?.status || "").toLowerCase();
    const hasNoRemovalDate = !row?.enforcement_until;
    const hasFutureRemovalDate = !!row?.enforcement_until && new Date(row.enforcement_until).getTime() > nowTs;
    const removedAndApproved = action === "removed" && (status === "approved" || status === "active");
    const explicitRestrictedAction = ["removed", "restricted", "banned", "suspended"].includes(action);

    return removedAndApproved || explicitRestrictedAction || hasNoRemovalDate || hasFutureRemovalDate;
  };

  const shouldHideUser = (row: any) => {
    if (!row?.reported_user_id && !row?.user_id) return false;

    const action = String(row?.enforcement_action || "").toLowerCase();
    const status = String(row?.status || "").toLowerCase();
    const hasNoRemovalDate = !row?.enforcement_until;
    const hasFutureRemovalDate = !!row?.enforcement_until && new Date(row.enforcement_until).getTime() > nowTs;
    const removedAndApproved = action === "removed" && (status === "approved" || status === "active");
    const explicitRestrictedAction = ["removed", "restricted", "banned", "suspended"].includes(action);

    return removedAndApproved || explicitRestrictedAction || hasNoRemovalDate || hasFutureRemovalDate;
  };

  (reportedPostsResult.data || []).forEach((row: any) => {
    if (shouldHidePost(row)) {
      getPostTypeVariants(row.post_type).forEach((type) => {
        excludedPostKeys.add(`${row.post_id}_${type}`);
      });
    }
  });

  (postEnforcementResult.data || []).forEach((row: any) => {
    if (shouldHidePost(row)) {
      getPostTypeVariants(row.post_type).forEach((type) => {
        excludedPostKeys.add(`${row.post_id}_${type}`);
      });
    }
  });

  (reportedUsersResult.data || []).forEach((row: any) => {
    const userId = String(row.reported_user_id || "");
    if (userId && shouldHideUser(row)) {
      excludedUserIds.add(userId);
    }
  });

  (userEnforcementResult.data || []).forEach((row: any) => {
    const userId = String(row.user_id || "");
    if (userId && shouldHideUser(row)) {
      excludedUserIds.add(userId);
    }
  });

  return { excludedPostKeys, excludedUserIds };
}