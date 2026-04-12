import { supabase } from '../components/supabase';

const normalizePostType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'reel' || t === 'reels' || t === 'reelvideo') return 'video';
  return t;
};

const getPostTypeVariants = (type) => {
  const raw = String(type || '').toLowerCase();
  const normalized = normalizePostType(raw);
  if (normalized === 'video') {
    return [raw, 'video', 'reel', 'reels', 'reelvideo'].filter(Boolean);
  }
  return [raw, normalized].filter(Boolean);
};

/**
 * Returns sets of excluded post keys and user IDs from active moderation entries.
 * These are used client-side to filter out restricted content from feeds.
 * The moderation_exclusions table is read-only for users (enforced by RLS).
 */
export const getActiveModerationExclusions = async () => {
  const empty = { excludedPostKeys: new Set(), excludedUserIds: new Set() };

  try {
    const [moderationExclusionsResult, reportedPostsResult, reportedUsersResult] = await Promise.all([
      supabase
        .from('moderation_exclusions')
        .select('post_id, post_type, user_id')
        .eq('is_active', true),
      supabase
        .from('reported_posts')
        .select('post_id, post_type, status, enforcement_action, enforcement_until')
        .neq('status', 'rejected'),
      supabase
        .from('reported_users')
        .select('reported_user_id, status, enforcement_action, enforcement_until')
        .neq('status', 'rejected'),
    ]);

    if (moderationExclusionsResult.error) return empty;

    const nowTs = Date.now();
    const exclusionRows = moderationExclusionsResult.data || [];
    const reportedPostRows = (reportedPostsResult.data || []).filter((row) =>
      !row.enforcement_until || new Date(row.enforcement_until).getTime() > nowTs,
    );
    const reportedUserRows = (reportedUsersResult.data || []).filter((row) =>
      !row.enforcement_until || new Date(row.enforcement_until).getTime() > nowTs,
    );

    const excludedPostKeys = new Set(
      [
        ...exclusionRows,
        ...reportedPostRows.map((row) => ({ post_id: row.post_id, post_type: row.post_type })),
      ]
        .filter((row) => row.post_id && row.post_type)
        .flatMap((row) => getPostTypeVariants(row.post_type).map((type) => `${row.post_id}_${type}`))
    );

    const excludedUserIds = new Set(
      [
        ...exclusionRows.map((row) => row.user_id).filter(Boolean),
        ...reportedUserRows.map((row) => row.reported_user_id).filter(Boolean),
      ].map((id) => String(id))
    );

    return { excludedPostKeys, excludedUserIds };
  } catch {
    return empty;
  }
};
