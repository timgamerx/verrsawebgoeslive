import { supabase } from "../components/supabase";
import { isExclusiveEarlyCreator } from "./earlyCreatorProgram";

const DEFAULT_LIKE_WEIGHT = 2;
const DEFAULT_COMMENT_WEIGHT = 3;
const DEFAULT_FOLLOWING_BOOST = 5;
const DEFAULT_INTEREST_BOOST = 4;
const DEFAULT_NEW_CREATOR_BOOST = 6;
const DEFAULT_LIVE_BOOST = 10;
const DEFAULT_EARLY_CREATOR_SPOTLIGHT_BOOST = 18;
const DEFAULT_TIME_DECAY_PER_HOUR = 0.5;
const DEFAULT_NEW_CREATOR_WINDOW_DAYS = 30;

export type FeedPreferences = {
  currentUserId: string | null;
  interestTokens: string[];
  followingIds: Set<string>;
};

export type RankableFeedItem = {
  id: string;
  created_at?: string | null;
  category?: string | null;
  content_category?: string | string[] | null;
  tags?: string[] | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  user_id?: string | null;
  author_id?: string | null;
  created_by?: string | null;
  userId?: string | null;
  creator_created_at?: string | null;
  user_is_new?: boolean | null;
  early_creator_program_until?: string | null;
  is_live?: boolean | null;
  like_count?: number | null;
  comment_count?: number | null;
  likes?: number | null;
  comments?: number | null;
  profiles?: ({
    id?: string | null;
    created_at?: string | null;
  } & Record<string, unknown>) | null;
  profile?: ({
    id?: string | null;
    created_at?: string | null;
  } & Record<string, unknown>) | null;
  score?: number;
};

type RankFeedOptions = {
  interestTokens?: Iterable<string>;
  followingIds?: Iterable<string>;
  liveIds?: Iterable<string>;
  now?: number;
  likeWeight?: number;
  commentWeight?: number;
  followingBoost?: number;
  interestBoost?: number;
  newCreatorBoost?: number;
  liveBoost?: number;
  spotlightForNewUsers?: boolean;
  earlyCreatorSpotlightBoost?: number;
  timeDecayPerHour?: number;
  newCreatorWindowDays?: number;
};

const normalizeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const splitTokens = (value?: string | string[] | null): string[] => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => entry.split(/[|,;/]/g))
    .map(normalizeToken)
    .filter(Boolean);
};

const uniqueTokens = (values: string[]) => Array.from(new Set(values));

export const normalizeInterestTokens = (
  value?: string | string[] | null,
): string[] => uniqueTokens(splitTokens(value));

const deriveAuthorId = (item: RankableFeedItem) =>
  item.user_id ||
  item.author_id ||
  item.created_by ||
  item.userId ||
  item.profiles?.id ||
  item.profile?.id ||
  null;

const deriveCreatorCreatedAt = (item: RankableFeedItem) =>
  item.creator_created_at || item.profiles?.created_at || item.profile?.created_at || null;

const getInterestHaystack = (item: RankableFeedItem) =>
  [
    item.category,
    item.content_category,
    item.title,
    item.name,
    item.description,
    item.content,
    ...(item.tags || []),
  ]
    .flatMap((value) =>
      Array.isArray(value) ? value : value ? [String(value)] : [],
    )
    .join(" ")
    .toLowerCase();

const isRecentDate = (value?: string | null, windowDays = DEFAULT_NEW_CREATOR_WINDOW_DAYS) => {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const ageMs = Date.now() - timestamp;
  return ageMs <= windowDays * 24 * 60 * 60 * 1000;
};

const getHoursOld = (createdAt?: string | null, now = Date.now()) => {
  if (!createdAt) {
    return 0;
  }

  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, (now - timestamp) / 3600000);
};

export const scoreFeedItem = <T extends RankableFeedItem>(
  item: T,
  options: RankFeedOptions = {},
): T & { score: number } => {
  const now = options.now ?? Date.now();
  const followingIds = new Set(options.followingIds || []);
  const interestTokens = uniqueTokens(
    Array.from(options.interestTokens || []).map(normalizeToken).filter(Boolean),
  );
  const liveIds = new Set(Array.from(options.liveIds || []).map(String));
  const likeWeight = options.likeWeight ?? DEFAULT_LIKE_WEIGHT;
  const commentWeight = options.commentWeight ?? DEFAULT_COMMENT_WEIGHT;
  const followingBoost = options.followingBoost ?? DEFAULT_FOLLOWING_BOOST;
  const interestBoost = options.interestBoost ?? DEFAULT_INTEREST_BOOST;
  const newCreatorBoost = options.newCreatorBoost ?? DEFAULT_NEW_CREATOR_BOOST;
  const liveBoost = options.liveBoost ?? DEFAULT_LIVE_BOOST;
  const earlyCreatorSpotlightBoost =
    options.earlyCreatorSpotlightBoost ??
    DEFAULT_EARLY_CREATOR_SPOTLIGHT_BOOST;
  const timeDecayPerHour =
    options.timeDecayPerHour ?? DEFAULT_TIME_DECAY_PER_HOUR;
  const newCreatorWindowDays =
    options.newCreatorWindowDays ?? DEFAULT_NEW_CREATOR_WINDOW_DAYS;

  const likes = item.like_count ?? item.likes ?? 0;
  const comments = item.comment_count ?? item.comments ?? 0;
  const authorId = deriveAuthorId(item);
  const haystack = getInterestHaystack(item);
  const interestMatch =
    interestTokens.length > 0 &&
    interestTokens.some((token) => haystack.includes(token));
  const isFollowing = Boolean(authorId && followingIds.has(authorId));
  const isLive = Boolean(item.is_live) || liveIds.has(String(item.id));
  const hasEarlyCreatorSpotlight =
    Boolean(options.spotlightForNewUsers) && isExclusiveEarlyCreator(item);
  const isNewCreator =
    Boolean(item.user_is_new) ||
    isRecentDate(deriveCreatorCreatedAt(item), newCreatorWindowDays);
  const hoursOld = getHoursOld(item.created_at, now);

  let score = 0;
  score += likes * likeWeight;
  score += comments * commentWeight;
  if (isFollowing) {
    score += followingBoost;
  }
  if (interestMatch) {
    score += interestBoost;
  }
  if (isNewCreator) {
    score += newCreatorBoost;
  }
  if (isLive) {
    score += liveBoost;
  }
  if (hasEarlyCreatorSpotlight) {
    score += earlyCreatorSpotlightBoost;
  }
  score -= hoursOld * timeDecayPerHour;

  return {
    ...item,
    score,
  };
};

export const rankFeedItems = <T extends RankableFeedItem>(
  items: T[],
  options: RankFeedOptions = {},
): Array<T & { score: number }> => {
  return items
    .map((item) => scoreFeedItem(item, options))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return getHoursOld(left.created_at) - getHoursOld(right.created_at);
    });
};

export const getCurrentUserFeedPreferences = async (): Promise<FeedPreferences> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        currentUserId: null,
        interestTokens: [],
        followingIds: new Set(),
      };
    }

    const [profileResult, followsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("content_category")
        .eq("id", user.id)
        .single(),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
    ]);

    const interestTokens = normalizeInterestTokens(
      profileResult.data?.content_category || null,
    );
    const followingIds = new Set(
      (followsResult.data || [])
        .map((row) => row.following_id)
        .filter((value): value is string => Boolean(value)),
    );

    return {
      currentUserId: user.id,
      interestTokens,
      followingIds,
    };
  } catch (error) {
    console.error("Error loading feed preferences:", error);
    return {
      currentUserId: null,
      interestTokens: [],
      followingIds: new Set(),
    };
  }
};

type LiveAudienceOptions = {
  creatorId: string;
  interestText?: string | null;
  communityId?: string;
  recentlyActiveHours?: number;
};

const isRecentlyActive = (lastActive?: string | null, recentlyActiveHours = 72) => {
  if (!lastActive) {
    return false;
  }

  const timestamp = new Date(lastActive).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= recentlyActiveHours * 3600000;
};

export const getLiveAudienceUserIds = async ({
  creatorId,
  interestText,
  communityId,
  recentlyActiveHours = 72,
}: LiveAudienceOptions): Promise<string[]> => {
  try {
    const recipientIds = new Set<string>();

    // Fetch followers
    const followerResult = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", creatorId);
    const followers = followerResult.data || [];

    // Add followers
    followers
      .map((row: any) => row.follower_id)
      .filter((value): value is string => Boolean(value))
      .forEach((id) => recipientIds.add(id));

    // Fetch community members if communityId provided
    if (communityId) {
      const memberResult = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", communityId);
      const communityMembers = memberResult.data || [];

      communityMembers
        .map((row: any) => row.user_id)
        .filter((value): value is string => Boolean(value))
        .forEach((id) => recipientIds.add(id));
    }

    // Add interested + recently active users
    const interestNeedle = normalizeToken(interestText || "");
    if (interestNeedle) {
      const interestedResult = await supabase
        .from("profiles")
        .select("id, content_category, last_active")
        .neq("id", creatorId);

      if (!interestedResult.error && interestedResult.data) {
        interestedResult.data.forEach((profile: any) => {
          const contentCategory = normalizeInterestTokens(
            profile.content_category,
          );
          const isInterested = contentCategory.some(
            (token) =>
              interestNeedle.includes(token) || token.includes(interestNeedle),
          );
          if (
            isInterested &&
            isRecentlyActive(profile.last_active, recentlyActiveHours)
          ) {
            recipientIds.add(profile.id);
          }
        });
      }
    }

    return Array.from(recipientIds);
  } catch (error) {
    console.error("Error loading live audience:", error);
    return [];
  }
};