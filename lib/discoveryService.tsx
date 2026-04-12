/**
 * Discovery Service
 * Handles trending content, hashtags, categories, and recommendation algorithms
 */

import { supabase } from "../components/supabase";
import {
  ContentCategory,
  PostType,
  Hashtag,
  TrendingTopic,
  TrendingCreator,
  FeedFilter,
  TrendingContent,
  DiscoveryFeedItem,
  SearchResult,
  RecommendationParams,
} from "../types/discovery";

// Categories mapping
export const CONTENT_CATEGORIES: ContentCategory[] = [
  "For You",
  "Latest",
  "Following",
  "Business",
  "Tech",
  "Startup",
  "Science",
  "Education",
  "Lifestyle",
  "Entertainment",
  "Finance",
  "Health & Wellness",
  "Culture & Society",
  "Sports",
  "Travel",
  "AI & Innovation",
  "Motivation & Growth",
  "Marketing & Branding",
  "Design & Creativity",
  "Photography & Art",
];

// Popular hashtags for Verrsa
export const POPULAR_HASHTAGS = [
  "#Breaking",
  "#Trending",
  "#VerrsaDaily",
  "#HotTake",
  "#NowPlaying",
  "#ListenNow",
  "#MustRead",
  "#CreatorsCorner",
  "#TechToday",
  "#BusinessTalk",
  "#StartupLife",
  "#HumanStories",
  "#LifestyleVibes",
  "#GrowWithMe",
  "#MindsetMatters",
  "#Article",
  "#Podcast",
  "#Reel",
  "#VerrsaCreators",
  "#VerrsaReels",
  "#VerrsaPodcasts",
  "#VerrsaArticles",
  "#VerrsaCommunity",
];

async function getDiscoveryExclusions() {
  const [reportedPostsResult, reportedUsersResult] = await Promise.all([
    supabase
      .from("reported_posts")
      .select("post_id, post_type, status, enforcement_action, enforcement_until")
      .eq("status", "approved")
      .neq("enforcement_action", "none"),
    supabase
      .from("reported_users")
      .select("reported_user_id, status, enforcement_action, enforcement_until")
      .eq("status", "approved")
      .neq("enforcement_action", "none"),
  ]);

  const excludedPostKeys = new Set<string>();
  const excludedUserIds = new Set<string>();
  const nowTs = Date.now();

  (reportedPostsResult.data || []).forEach((row: any) => {
    const isActive =
      !row.enforcement_until ||
      new Date(row.enforcement_until).getTime() > nowTs;
    if (isActive && row.post_id && row.post_type) {
      excludedPostKeys.add(`${row.post_id}_${row.post_type}`);
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

  return { excludedPostKeys, excludedUserIds };
}

function normalizeDiscoveryPostType(type?: string): string {
  if (!type) return "";
  return type === "reel" ? "video" : type;
}

function isExcludedDiscoveryPost(
  item: { id?: string; type?: string; user_id?: string; author_id?: string },
  excludedPostKeys: Set<string>,
  excludedUserIds: Set<string>,
): boolean {
  const userId = String(item.user_id || item.author_id || "");
  if (userId && excludedUserIds.has(userId)) {
    return true;
  }

  const id = item.id;
  const rawType = item.type;
  if (!id || !rawType) {
    return false;
  }

  const normalizedType = normalizeDiscoveryPostType(rawType);
  return (
    excludedPostKeys.has(`${id}_${rawType}`) ||
    excludedPostKeys.has(`${id}_${normalizedType}`)
  );
}

/**
 * Get trending content across all post types
 */
export async function getTrendingContent(
  limit: number = 20,
  postType?: PostType,
): Promise<TrendingContent[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();

    let allContent: any[] = [];

    // Fetch articles if postType is 'article' or 'all'
    if (!postType || postType === "all" || postType === "article") {
      const { data: articles } = await supabase
        .from("articles")
        .select(
          `
          id,
          title,
          content,
          excerpt,
          cover_image_url,
          user_id,
          like_count,
          comment_count,
          view_count,
          created_at,
          tags,
          profiles!fk_articles_user_id(
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (articles) {
        allContent.push(
          ...articles.map((item) => ({
            ...item,
            type: "article" as PostType,
          })),
        );
      }
    }

    // Fetch podcasts if postType is 'podcast' or 'all'
    if (!postType || postType === "all" || postType === "podcast") {
      const { data: podcasts } = await supabase
        .from("podcasts")
        .select(
          `
          id,
          title,
          description,
          cover_image_url,
          author_id,
          like_count,
          comment_count,
          view_count,
          created_at,
          tags,
          audio_urls,
          durations,
          episode_count,
          profiles!podcasts_author_id_fkey(
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (podcasts) {
        allContent.push(
          ...podcasts.map((item) => ({
            ...item,
            type: "podcast" as PostType,
            user_id: item.author_id,
            content: item.description,
          })),
        );
      }
    }

    // Fetch videos if postType is 'reel' or 'all'
    if (!postType || postType === "all" || postType === "reel") {
      const { data: videos } = await supabase
        .from("videos")
        .select(
          `
          id,
          title,
          description,
          thumbnail_url,
          video_url,
          author_id,
          like_count,
          comment_count,
          view_count,
          created_at,
          tags,
          profiles!videos_author_id_fkey(
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (videos) {
        allContent.push(
          ...videos.map((item) => ({
            ...item,
            type: "video" as PostType,
            user_id: item.author_id,
            content: item.description,
            cover_image_url: item.thumbnail_url,
          })),
        );
      }
    }

    allContent = allContent.filter((item: any) => {
      const itemUserId = item.user_id || item.author_id;
      const itemKey = `${item.id}_${item.type}`;
      return !excludedUserIds.has(itemUserId) && !excludedPostKeys.has(itemKey);
    });

    // Sort by trending score and limit
    const trendingContent = allContent
      .map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        excerpt:
          item.content?.substring(0, 150) || item.excerpt || item.description,
        cover_image_url: item.cover_image_url || item.thumbnail_url,
        user_id: item.user_id,
        username: item.profiles?.username || "Unknown",
        avatar_url: item.profiles?.avatar_url,
        is_verified: item.profiles?.is_verified,
        like_count: item.like_count || 0,
        comment_count: item.comment_count || 0,
        share_count: 0,
        view_count: item.view_count || 0,
        created_at: item.created_at,
        trending_score: calculateTrendingScore(item),
        hashtags: item.tags || [],
      }))
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(0, limit);

    return trendingContent;
  } catch (error) {
    console.error("Error fetching trending content:", error);
    return [];
  }
}

/**
 * Calculate trending score based on engagement
 */
function calculateTrendingScore(post: any): number {
  const ageInHours =
    (new Date().getTime() - new Date(post.created_at).getTime()) /
    (1000 * 60 * 60);
  const views = post.view_count || 0;
  const likes = post.like_count || 0;
  const comments = post.comment_count || 0;

  // Weighted scoring: views (1x), likes (5x), comments (10x), recency boost
  const engagementScore = views + likes * 5 + comments * 10;
  const recencyBoost = Math.max(0, 168 - ageInHours) / 168; // 7 days = 168 hours

  return engagementScore * (0.5 + recencyBoost * 0.5);
}

/**
 * Get trending hashtags
 */
export async function getTrendingHashtags(
  limit: number = 20,
): Promise<Hashtag[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();

    // Get tags from all content types
    const [articlesResult, podcastsResult, videosResult] = await Promise.all([
      supabase
        .from("articles")
        .select("id, user_id, tags")
        .gte("created_at", cutoffDate),
      supabase
        .from("podcasts")
        .select("id, author_id, tags")
        .gte("created_at", cutoffDate),
      supabase
        .from("videos")
        .select("id, author_id, tags")
        .gte("created_at", cutoffDate),
    ]);

    // Count hashtag occurrences
    const hashtagCounts: { [key: string]: number } = {};

    const allTags = [
      ...(articlesResult.data || []).map((item: any) => ({ ...item, type: "article" })),
      ...(podcastsResult.data || []).map((item: any) => ({ ...item, type: "podcast" })),
      ...(videosResult.data || []).map((item: any) => ({ ...item, type: "video" })),
    ].filter(
      (item: any) =>
        !isExcludedDiscoveryPost(item, excludedPostKeys, excludedUserIds),
    );

    allTags.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
          hashtagCounts[normalizedTag] =
            (hashtagCounts[normalizedTag] || 0) + 1;
        });
      }
    });

    // Convert to array and sort by count
    const hashtags = Object.entries(hashtagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        trending: count > 5, // Mark as trending if used more than 5 times
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return hashtags;
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    return [];
  }
}

/**
 * Get trending creators/users
 */
export async function getTrendingCreators(
  limit: number = 10,
): Promise<TrendingCreator[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();
    const { excludedUserIds } = await getDiscoveryExclusions();

    // Get content from all tables
    const [articlesResult, podcastsResult, videosResult] = await Promise.all([
      supabase
        .from("articles")
        .select(
          `
          user_id,
          like_count,
          comment_count,
          view_count,
          profiles!fk_articles_user_id(
            id,
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate),
      supabase
        .from("podcasts")
        .select(
          `
          author_id,
          like_count,
          comment_count,
          view_count,
          profiles!podcasts_author_id_fkey(
            id,
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate),
      supabase
        .from("videos")
        .select(
          `
          author_id,
          like_count,
          comment_count,
          view_count,
          profiles!videos_author_id_fkey(
            id,
            username,
            full_name,
            avatar_url,
            is_verified,
            subscription_status
          )
        `,
        )
        .gte("created_at", cutoffDate),
    ]);

    // Combine all content and filter out items with null profiles
    const allContent = [
      ...(articlesResult.data || []),
      ...(podcastsResult.data || []),
      ...(videosResult.data || []),
    ].filter((item) => {
      const userId = (item as any).user_id || (item as any).author_id;
      return item.profiles !== null && !excludedUserIds.has(userId);
    });

    // Aggregate by user
    const userStats: {
      [key: string]: {
        profile: any;
        post_count: number;
        total_likes: number;
        total_comments: number;
        total_views: number;
      };
    } = {};

    allContent.forEach((item) => {
      const userId = (item as any).user_id || (item as any).author_id;
      if (!item.profiles) return; // Skip if profile is null

      if (!userStats[userId]) {
        userStats[userId] = {
          profile: item.profiles,
          post_count: 0,
          total_likes: 0,
          total_comments: 0,
          total_views: 0,
        };
      }
      userStats[userId].post_count++;
      userStats[userId].total_likes += item.like_count || 0;
      userStats[userId].total_comments += item.comment_count || 0;
      userStats[userId].total_views += item.view_count || 0;
    });

    // Convert to array and calculate engagement rate
    const creators = Object.entries(userStats)
      .map(([userId, stats]) => ({
        id: userId,
        username: stats.profile.username || "Unknown",
        full_name: stats.profile.full_name || "",
        avatar_url: stats.profile.avatar_url || "",
        is_verified: stats.profile.is_verified || false,
        subscription_status: stats.profile.subscription_status,
        follower_count: 0, // TODO: Implement follower count
        post_count: stats.post_count,
        engagement_rate:
          stats.total_views > 0
            ? ((stats.total_likes + stats.total_comments) / stats.total_views) *
              100
            : 0,
      }))
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, limit);

    return creators;
  } catch (error) {
    console.error("Error fetching trending creators:", error);
    return [];
  }
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(
  category: ContentCategory,
  limit: number = 20,
  offset: number = 0,
): Promise<DiscoveryFeedItem[]> {
  try {
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();

    // Map category to hashtags or keywords
    const categoryHashtags = getCategoryHashtags(category);

    let query = supabase
      .from("posts")
      .select(
        `
        id,
        type,
        title,
        content,
        description,
        cover_image_url,
        thumbnail_url,
        video_url,
        audio_url,
        user_id,
        like_count,
        comment_count,
        view_count,
        created_at,
        hashtags,
        is_boosted,
        profiles!inner(
          username,
          full_name,
          avatar_url,
          is_verified,
          subscription_status
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by hashtags if applicable
    if (categoryHashtags.length > 0) {
      query = query.overlaps("hashtags", categoryHashtags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (
      data
        ?.filter(
          (post: any) =>
            !isExcludedDiscoveryPost(post, excludedPostKeys, excludedUserIds),
        )
        .map((post: any) => ({
          id: post.id,
          type: post.type,
          title: post.title,
          content: post.content,
          description: post.description,
          cover_image_url: post.cover_image_url,
          thumbnail_url: post.thumbnail_url,
          video_url: post.video_url,
          audio_url: post.audio_url,
          user_id: post.user_id,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: post.profiles?.is_verified,
          subscription_status: post.profiles?.subscription_status,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          view_count: post.view_count || 0,
          created_at: post.created_at,
          hashtags: post.hashtags,
          is_boosted: post.is_boosted,
        })) || []
    );
  } catch (error) {
    console.error("Error fetching posts by category:", error);
    return [];
  }
}

/**
 * Map category to relevant hashtags
 */
function getCategoryHashtags(category: ContentCategory): string[] {
  const mapping: { [key: string]: string[] } = {
    Business: ["#Business", "#BusinessTalk", "#StartupLife", "#Entrepreneur"],
    Tech: ["#Tech", "#TechToday", "#AI", "#Innovation"],
    Startup: ["#Startup", "#StartupLife", "#Entrepreneur", "#Funding"],
    "AI & Innovation": ["#AI", "#Innovation", "#Tech", "#Future"],
    "Marketing & Branding": [
      "#Marketing",
      "#Branding",
      "#Business",
      "#GrowWithMe",
    ],
    Finance: ["#Finance", "#Money", "#Investing", "#BusinessTalk"],
    "Health & Wellness": [
      "#Health",
      "#Wellness",
      "#Fitness",
      "#MindsetMatters",
    ],
    Lifestyle: ["#Lifestyle", "#LifestyleVibes", "#Travel", "#Culture"],
    Education: ["#Education", "#Learning", "#Tutorial", "#GrowWithMe"],
    Entertainment: ["#Entertainment", "#Music", "#Gaming", "#Art"],
    "Design & Creativity": ["#Design", "#Creative", "#Art", "#Photography"],
    "Photography & Art": ["#Photography", "#Art", "#Creative", "#Design"],
    Travel: ["#Travel", "#Adventure", "#Lifestyle", "#Culture"],
    Sports: ["#Sports", "#Fitness", "#Health", "#Lifestyle"],
    Science: ["#Science", "#Innovation", "#Tech", "#Education"],
    "Culture & Society": [
      "#Culture",
      "#Society",
      "#HumanStories",
      "#Important",
    ],
    "Motivation & Growth": [
      "#Motivation",
      "#GrowWithMe",
      "#MindsetMatters",
      "#Inspiration",
    ],
  };

  return mapping[category] || [];
}

/**
 * Get posts by hashtag
 */
export async function getPostsByHashtag(
  hashtag: string,
  limit: number = 20,
  offset: number = 0,
): Promise<DiscoveryFeedItem[]> {
  try {
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();
    const normalizedTag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        type,
        title,
        content,
        description,
        cover_image_url,
        thumbnail_url,
        video_url,
        audio_url,
        user_id,
        like_count,
        comment_count,
        view_count,
        created_at,
        hashtags,
        is_boosted,
        profiles!inner(
          username,
          full_name,
          avatar_url,
          is_verified,
          subscription_status
        )
      `,
      )
      .contains("hashtags", [normalizedTag])
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (
      data
        ?.filter(
          (post: any) =>
            !isExcludedDiscoveryPost(post, excludedPostKeys, excludedUserIds),
        )
        .map((post: any) => ({
          id: post.id,
          type: post.type,
          title: post.title,
          content: post.content,
          description: post.description,
          cover_image_url: post.cover_image_url,
          thumbnail_url: post.thumbnail_url,
          video_url: post.video_url,
          audio_url: post.audio_url,
          user_id: post.user_id,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: post.profiles?.is_verified,
          subscription_status: post.profiles?.subscription_status,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          view_count: post.view_count || 0,
          created_at: post.created_at,
          hashtags: post.hashtags,
          is_boosted: post.is_boosted,
        })) || []
    );
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    return [];
  }
}

/**
 * Get recommended content for user (For You feed)
 */
export async function getRecommendedContent(
  params: RecommendationParams,
): Promise<DiscoveryFeedItem[]> {
  try {
    const { user_id, limit = 20, offset = 0 } = params;
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();

    // TODO: Implement more sophisticated recommendation algorithm
    // For now, return mix of trending and recent content

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        type,
        title,
        content,
        description,
        cover_image_url,
        thumbnail_url,
        video_url,
        audio_url,
        user_id,
        like_count,
        comment_count,
        view_count,
        created_at,
        hashtags,
        is_boosted,
        profiles!inner(
          username,
          full_name,
          avatar_url,
          is_verified,
          subscription_status
        )
      `,
      )
      .order("view_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (
      data
        ?.filter(
          (post: any) =>
            !isExcludedDiscoveryPost(post, excludedPostKeys, excludedUserIds),
        )
        .map((post: any) => ({
          id: post.id,
          type: post.type,
          title: post.title,
          content: post.content,
          description: post.description,
          cover_image_url: post.cover_image_url,
          thumbnail_url: post.thumbnail_url,
          video_url: post.video_url,
          audio_url: post.audio_url,
          user_id: post.user_id,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: post.profiles?.is_verified,
          subscription_status: post.profiles?.subscription_status,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          view_count: post.view_count || 0,
          created_at: post.created_at,
          hashtags: post.hashtags,
          is_boosted: post.is_boosted,
        })) || []
    );
  } catch (error) {
    console.error("Error fetching recommended content:", error);
    return [];
  }
}

/**
 * Search across all content
 */
export async function searchContent(
  query: string,
  filters?: FeedFilter,
): Promise<SearchResult> {
  try {
    const searchTerm = `%${query}%`;
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();

    let postsQuery = supabase
      .from("posts")
      .select(
        `
        id,
        type,
        title,
        content,
        description,
        cover_image_url,
        thumbnail_url,
        video_url,
        audio_url,
        user_id,
        like_count,
        comment_count,
        view_count,
        created_at,
        hashtags,
        is_boosted,
        profiles!inner(
          username,
          full_name,
          avatar_url,
          is_verified,
          subscription_status
        )
      `,
      )
      .or(
        `title.ilike.${searchTerm},content.ilike.${searchTerm},description.ilike.${searchTerm}`,
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (filters?.postType && filters.postType !== "all") {
      postsQuery = postsQuery.eq("type", filters.postType);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) throw postsError;

    // Search creators
    const { data: creators, error: creatorsError } = await supabase
      .from("profiles")
      .select(
        "id, username, full_name, avatar_url, is_verified, subscription_status",
      )
      .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
      .limit(10);

    if (creatorsError) throw creatorsError;

    // Get matching hashtags
    const hashtags = await getTrendingHashtags(20);
    const matchingHashtags = hashtags.filter((h) =>
      h.tag.toLowerCase().includes(query.toLowerCase()),
    );

    return {
      posts:
        posts
          ?.filter(
            (post: any) =>
              !isExcludedDiscoveryPost(post, excludedPostKeys, excludedUserIds),
          )
          .map((post: any) => ({
            id: post.id,
            type: post.type,
            title: post.title,
            content: post.content,
            description: post.description,
            cover_image_url: post.cover_image_url,
            thumbnail_url: post.thumbnail_url,
            video_url: post.video_url,
            audio_url: post.audio_url,
            user_id: post.user_id,
            username: post.profiles?.username,
            full_name: post.profiles?.full_name,
            avatar_url: post.profiles?.avatar_url,
            is_verified: post.profiles?.is_verified,
            subscription_status: post.profiles?.subscription_status,
            like_count: post.like_count || 0,
            comment_count: post.comment_count || 0,
            view_count: post.view_count || 0,
            created_at: post.created_at,
            hashtags: post.hashtags,
            is_boosted: post.is_boosted,
          })) || [],
      creators:
        creators
          ?.filter((c: any) => !excludedUserIds.has(String(c.id || "")))
          .map((c: any) => ({
            id: c.id,
            username: c.username,
            full_name: c.full_name,
            avatar_url: c.avatar_url,
            is_verified: c.is_verified,
            subscription_status: c.subscription_status,
            follower_count: 0,
            post_count: 0,
            engagement_rate: 0,
          })) || [],
      hashtags: matchingHashtags,
      communities: [],
    };
  } catch (error) {
    console.error("Error searching content:", error);
    return { posts: [], creators: [], hashtags: [], communities: [] };
  }
}

/**
 * Get posts from followed users
 */
export async function getFollowingFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<DiscoveryFeedItem[]> {
  try {
    // TODO: Implement following/follower system
    // For now, return recent content
    return getRecommendedContent({ user_id: userId, limit, offset });
  } catch (error) {
    console.error("Error fetching following feed:", error);
    return [];
  }
}

/**
 * Get most shared content this week
 */
export async function getMostShared(
  limit: number = 10,
  postType?: PostType,
): Promise<DiscoveryFeedItem[]> {
  try {
    const { excludedPostKeys, excludedUserIds } = await getDiscoveryExclusions();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let query = supabase
      .from("posts")
      .select(
        `
        id,
        type,
        title,
        content,
        description,
        cover_image_url,
        thumbnail_url,
        video_url,
        audio_url,
        user_id,
        like_count,
        comment_count,
        view_count,
        created_at,
        hashtags,
        is_boosted,
        profiles!inner(
          username,
          full_name,
          avatar_url,
          is_verified,
          subscription_status
        )
      `,
      )
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("view_count", { ascending: false })
      .limit(limit);

    if (postType && postType !== "all") {
      query = query.eq("type", postType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (
      data
        ?.filter(
          (post: any) =>
            !isExcludedDiscoveryPost(post, excludedPostKeys, excludedUserIds),
        )
        .map((post: any) => ({
          id: post.id,
          type: post.type,
          title: post.title,
          content: post.content,
          description: post.description,
          cover_image_url: post.cover_image_url,
          thumbnail_url: post.thumbnail_url,
          video_url: post.video_url,
          audio_url: post.audio_url,
          user_id: post.user_id,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: post.profiles?.is_verified,
          subscription_status: post.profiles?.subscription_status,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          view_count: post.view_count || 0,
          created_at: post.created_at,
          hashtags: post.hashtags,
          is_boosted: post.is_boosted,
        })) || []
    );
  } catch (error) {
    console.error("Error fetching most shared:", error);
    return [];
  }
}
