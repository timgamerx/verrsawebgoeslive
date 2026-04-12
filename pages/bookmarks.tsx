// @ts-nocheck
import { useRouter } from 'next/router';
import { Platform } from '../lib/reactNativeShim';
import { spacing, radius, fontSize, fontFamily } from '../lib/theme';
import { useBookmarks } from "../context/BookmarkProvider";
import { BookmarkButton } from '../components/BookmarkButton';
import CommentModal from '../components/CommentModal';
import SharePostModal from '../components/SharePostModal.web';
import { ExclusiveEarlyCreatorBadge } from "../components/ExclusiveEarlyCreatorBadge";
import PromotedBadge from '../components/PromotedBadge';
import { supabase } from '../components/supabase';
import {
  toggleLike as apiToggleLike,
  incrementViewCount,
  trackView,
} from '../components/api';
import React, { useState } from "react";
import VerificationBadge from '../components/VerificationBadge';
import { useTheme } from '../context/ThemeProvider';
import { isExclusiveEarlyCreator } from '../lib/profileUtils';
import { getActiveModerationExclusions } from '../lib/moderationExclusions';
import { TbChevronLeft, TbDotsVertical } from 'react-icons/tb'
import { FiSearch } from 'react-icons/fi'
import { MdCheck } from 'react-icons/md'
import { IoChevronBack } from 'react-icons/io5'

// Article interface from Articles
interface ArticleItem {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  user_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published: boolean;
  is_boosted?: boolean;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
    subscription_status?: string;
    early_creator_program_until?: string;
  };
  user?: string;
  time?: string;
  date?: string;
  image?: string;
  is_verified?: boolean;
  subscription_status?: string;
}

// Podcast interface from Podcasts
interface PodcastPost {
  id: string;
  author_id: string;
  username: string;
  title: string;
  content?: string;
  description: string;
  audio_url?: string; // Legacy field
  audio_urls?: string[]; // Array of episode audio URLs
  durations?: number[]; // Array of episode durations
  episode_count?: number; // Total number of episodes
  cover_image_url?: string;
  thumbnail_url?: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  category: string;
  tags: string[];
  duration?: number; // Legacy field
  published: boolean;
  is_boosted?: boolean;
  profiles?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    subscription_status?: string;
    early_creator_program_until?: string;
  };
  is_verified?: boolean;
  subscription_status?: string;
  view_count?: number;
}


type BookmarkedPost = {
  id: string;
  user: string;
  time: string;
  title: string;
  content?: string;
  image?: string | null;
  image_url?: string;
  video?: string;
  type: "article" | "video" | "podcast" | "community" | "verse";
  like_count?: number;
  is_boosted?: boolean;
  // Additional fields that might be in the bookmarked data
  cover_image_url?: string | null;
  description?: string;
  video_url?: string;
  audio_url?: string;
  // Community specific fields (matching Community interface)
  name?: string;
  member_count?: number;
  comment_count?: number;
  is_private?: boolean;
  rules?: string;
  category?: string;
  created_by?: string;
  created_at?: string;
  // Profile/avatar fields
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
    subscription_status?: string;
    early_creator_program_until?: string;
  };
  profile?: {
    id?: string;
    username?: string;
    avatar_url?: string | null;
  };
  userAvatar?: string | null;
  avatar_url?: string | null;
  view_count?: number;
  // Article-specific fields from ArticleItem
  excerpt?: string;
  author_id?: string;
  published?: boolean;
  tags?: string[];
  date?: string;
  is_verified?: boolean;
  subscription_status?: string;
  // Podcast-specific fields
  username?: string;
  duration?: number;
  audio_urls?: string[];
  durations?: number[];
  episode_count?: number;
  thumbnail_url?: string;
  // Video-specific fields
  user_id?: string;
};

export default function Bookmarks() {
  const router = useRouter();
  const { theme } = useTheme();
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const [screenWidth, setScreenWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isDesktop = screenWidth >= 1024;
  const {
    bookmarkedPosts,
    loading,
    clearAllBookmarks,
    refreshBookmarks,
    initializeBookmarks,
  } = useBookmarks();
  const [visibleBookmarkedPosts, setVisibleBookmarkedPosts] = useState<
    BookmarkedPost[]
  >([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [articleLikeCounts, setArticleLikeCounts] = useState<{
    [key: string]: number;
  }>({});
  const [likedPodcasts, setLikedPodcasts] = useState<Set<string>>(new Set());
  const [podcastLikeCounts, setPodcastLikeCounts] = useState<{
    [key: string]: number;
  }>({});
  const [selectedPodcast, setSelectedPodcast] = useState<BookmarkedPost | null>(
    null,
  );
  const [postEnforcements, setPostEnforcements] = useState<
    Record<
      string,
      {
        action: string;
        title?: string;
        message?: string;
        content?: string;
        description?: string;
      }
    >
  >({});

  // Initialize bookmarks when screen loads
  React.useEffect(() => {
    initializeBookmarks();
  }, []);

  // Load enforcement states for bookmarks (show labels, don't filter)
  React.useEffect(() => {
    const applyEnforcementFilter = async () => {
      try {
        if (!bookmarkedPosts || bookmarkedPosts.length === 0) {
          setVisibleBookmarkedPosts([]);
          return;
        }

        const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();

        const articleIds = bookmarkedPosts
          .filter((p) => p.type === "article")
          .map((p) => p.id);
        const podcastIds = bookmarkedPosts
          .filter((p) => p.type === "podcast")
          .map((p) => p.id);
        const videoIds = bookmarkedPosts
          .filter((p) => p.type === "video")
          .map((p) => p.id);

        const [articleEnf, podcastEnf, videoEnf] = await Promise.all([
          articleIds.length
            ? supabase
                .from("post_enforcement_view")
                .select(
                  "post_id, enforcement_action, title, message, content, description",
                )
                .eq("post_type", "article")
                .in("post_id", articleIds)
            : Promise.resolve({ data: [] as any[] }),
          podcastIds.length
            ? supabase
                .from("post_enforcement_view")
                .select(
                  "post_id, enforcement_action, title, message, content, description",
                )
                .eq("post_type", "podcast")
                .in("post_id", podcastIds)
            : Promise.resolve({ data: [] as any[] }),
          videoIds.length
            ? supabase
                .from("post_enforcement_view")
                .select(
                  "post_id, enforcement_action, title, message, content, description",
                )
                .eq("post_type", "video")
                .in("post_id", videoIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const map: Record<
          string,
          {
            action: string;
            title?: string;
            message?: string;
            content?: string;
            description?: string;
          }
        > = {};
        (articleEnf.data || []).forEach((r: any) => {
          if (r.enforcement_action && r.enforcement_action !== "none") {
            map[`${r.post_id}_article`] = {
              action: r.enforcement_action,
              title: r.title || undefined,
              message: r.message || undefined,
              content: r.content || undefined,
              description: r.description || undefined,
            };
          }
        });
        (podcastEnf.data || []).forEach((r: any) => {
          if (r.enforcement_action && r.enforcement_action !== "none") {
            map[`${r.post_id}_podcast`] = {
              action: r.enforcement_action,
              title: r.title || undefined,
              message: r.message || undefined,
              content: r.content || undefined,
              description: r.description || undefined,
            };
          }
        });
        (videoEnf.data || []).forEach((r: any) => {
          if (r.enforcement_action && r.enforcement_action !== "none") {
            map[`${r.post_id}_video`] = {
              action: r.enforcement_action,
              title: r.title || undefined,
              message: r.message || undefined,
              content: r.content || undefined,
              description: r.description || undefined,
            };
          }
        });
        setPostEnforcements(map);
        setVisibleBookmarkedPosts(
          bookmarkedPosts.filter((p) => {
            const type = String(p.type || "");
            const key = `${p.id}_${type}`;
            const ownerId = String(
              p.user_id || p.author_id || p.created_by || p.profile?.id || "",
            );

            if (excludedUserIds.has(ownerId)) return false;
            if (excludedPostKeys.has(key)) return false;
            return true;
          }),
        );
      } catch (e) {
        console.warn("Bookmarks: enforcement load failed", e);
        setVisibleBookmarkedPosts([]);
      }
    };

    applyEnforcementFilter();
  }, [bookmarkedPosts]);

  // Removed unsafe fallback to avoid showing another user's bookmarks

  // Initialize like counts from bookmarked posts
  React.useEffect(() => {
    if (bookmarkedPosts.length > 0) {
      const newArticleLikeCounts: { [key: string]: number } = {};
      const newPodcastLikeCounts: { [key: string]: number } = {};

      bookmarkedPosts.forEach((post) => {
        if (post.type === "article") {
          newArticleLikeCounts[post.id] = post.like_count || 0;
        } else if (post.type === "podcast") {
          newPodcastLikeCounts[post.id] = post.like_count || 0;
        }
      });

      setArticleLikeCounts(newArticleLikeCounts);
      setPodcastLikeCounts(newPodcastLikeCounts);
    }
  }, [bookmarkedPosts]);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<BookmarkedPost | null>(
    null,
  );
  const [showShare, setShowShare] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BookmarkedPost | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBookmarks();
    } catch (error) {
      console.error("Bookmarks: Error refreshing bookmarks:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBookmarks]);

  // Handle article navigation like in Articles
  const handleNavigateToArticlePost = async (article: BookmarkedPost) => {
    try {
      if (article.id) incrementViewCount("posts", article.id);
      router.push(`/article/${article.id}`, { state: { article } });
    } catch (err) {
      console.error("Failed to navigate to article", article.id, err);
      router.push(`/article/${article.id}`, { state: { article } });
    }
  };

  // Toggle article like like in Articles
  const toggleArticleLike = async (articleId: string) => {
    try {
      const isCurrentlyLiked = likedArticles.has(articleId);

      if (isCurrentlyLiked) {
        setLikedArticles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
      } else {
        setLikedArticles((prev) => new Set(prev).add(articleId));
      }

      setArticleLikeCounts((prev) => ({
        ...prev,
        [articleId]: isCurrentlyLiked
          ? Math.max((prev[articleId] || 0) - 1, 0)
          : (prev[articleId] || 0) + 1,
      }));

      await apiToggleLike(articleId, "article");
    } catch (error) {
      console.error("Error toggling article like:", error);

      // Revert optimistic update
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        if (likedArticles.has(articleId)) {
          newSet.delete(articleId);
        } else {
          newSet.add(articleId);
        }
        return newSet;
      });

      setArticleLikeCounts((prev) => ({
        ...prev,
        [articleId]: articleLikeCounts[articleId] || 0,
      }));
    }
  };

  // Toggle podcast like like in Podcasts
  const togglePodcastLike = async (podcastId: string) => {
    try {
      const isCurrentlyLiked = likedPodcasts.has(podcastId);

      if (isCurrentlyLiked) {
        setLikedPodcasts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(podcastId);
          return newSet;
        });
      } else {
        setLikedPodcasts((prev) => new Set(prev).add(podcastId));
      }

      setPodcastLikeCounts((prev) => ({
        ...prev,
        [podcastId]: isCurrentlyLiked
          ? Math.max((prev[podcastId] || 0) - 1, 0)
          : (prev[podcastId] || 0) + 1,
      }));

      await apiToggleLike(podcastId, "podcast");
    } catch (error) {
      console.error("Error toggling podcast like:", error);

      // Revert optimistic update
      setLikedPodcasts((prev) => {
        const newSet = new Set(prev);
        if (likedPodcasts.has(podcastId)) {
          newSet.delete(podcastId);
        } else {
          newSet.add(podcastId);
        }
        return newSet;
      });

      setPodcastLikeCounts((prev) => ({
        ...prev,
        [podcastId]: podcastLikeCounts[podcastId] || 0,
      }));
    }
  };

  // Format date helper function
  const normalizeTimestamp = (value?: string | null) => {
  const router = useRouter();
    if (!value) {
      return null;
    }

    let normalized = value.trim();

    // Handles malformed strings like +2026+03+23709:45:13.573062+00:00
    if (/^\+\d{4}\+\d{2}\+\d{2}/.test(normalized)) {
      normalized = normalized.replace(
        /^\+(\d{4})\+(\d{2})\+(\d{2})/,
        "$1-$2-$3 ",
      );
    }

    return normalized;
  };

  const formatDate = (dateString?: string) => {
    const normalized = normalizeTimestamp(dateString);
    if (!normalized) {
      return "";
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Format time helper function
  const formatTime = (dateString?: string) => {
    const normalized = normalizeTimestamp(dateString);
    if (!normalized) {
      return "";
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleToggleLike = async (
    id: string,
    postType: "article" | "podcast" | "video" | "community" | "verse",
  ): Promise<void> => {
    try {
      // Update local state immediately for better UX
      const isCurrentlyLiked = likedPosts.has(id);

      if (isCurrentlyLiked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        setLikedPosts((prev) => new Set(prev).add(id));
      }

      // Make API call to update like status
      await apiToggleLike(id, postType);
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert local state on error
      if (likedPosts.has(id)) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        setLikedPosts((prev) => new Set(prev).add(id));
      }
    }
  };

  // Video component for rendering videos (same as Home)
  const VideoPost = ({
    videoUrl,
    thumbnailUrl,
  }: {
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
  }) => {
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    if (!videoUrl && !thumbnailUrl) {
      return (
        <div style={{...(styles.videoPlayer || {}), ...(styles.placeholderVideo || {})}}>
          <IoChevronBack />
          <span style={styles.placeholderText}>Video not available</span>
        </div>
      );
    }

    if (!videoUrl && thumbnailUrl) {
      return (
        <div style={styles.videoWrapper}>
          <img src={thumbnailUrl } style={styles.videoPlayer} />
          <div style={styles.videoOverlay}>
            <IoChevronBack />
          </div>
        </div>
      );
    }

    return (
      <div style={styles.videoWrapper}>
        <Video
          src={videoUrl || "" }
          style={styles.videoPlayer}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isVideoPlaying}
          isLooping={true}
          isMuted={true}
        />
        <button
          style={styles.videoOverlay}
          onClick={() => setIsVideoPlaying(!isVideoPlaying)}
        >
          <IoChevronBack />
        </button>
        <div style={styles.muteIndicator}>
          <IoChevronBack />
        </div>
      </div>
    );
  };

  const renderPost = ({ item }: { item: BookmarkedPost }) => {
    const isTimestampLike = (value?: string) => {
      if (!value) return false;
      const normalized = value.trim();
      return (
        /^\+?\d{4}[+-]\d{2}[+-]\d{2}/.test(normalized) ||
        /^\d{4}-\d{2}-\d{2}T/.test(normalized) ||
        /^\+\d{4}\+\d{2}\+\d{2}\d{2}:\d{2}:\d{2}/.test(normalized)
      );
    };

    const cleanName = (primary?: string, fallback?: string) => {
      const safePrimary = primary?.trim();
      if (safePrimary && !isTimestampLike(safePrimary)) {
        return safePrimary;
      }

      const safeFallback = fallback?.trim();
      if (safeFallback && !isTimestampLike(safeFallback)) {
        return safeFallback;
      }

      return null;
    };

    const userName =
      item.type === "community"
        ? cleanName(item.name, "Community") || "Community"
        : cleanName(
            item.profiles?.full_name || item.profiles?.username || item.username,
            item.user,
          ) || "Unknown User";
    const postTime =
      item.type === "podcast" && item.created_at
        ? formatTime(item.created_at) || "8:00 am"
        : formatTime(item.time || item.created_at) || "8:00 am";
    // Handle different possible image field names
    const postImage = item.image || item.image_url || item.cover_image_url;
    const videoUrl = item.video || item.video_url;
    const postContent = item.content || item.description || "";

    // Handle different possible avatar field names
    const userAvatar =
      item.type === "community"
        ? item.avatar_url || item.cover_image_url // For communities, prioritize avatar_url
        : item.profiles?.avatar_url ||
          item.profile?.avatar_url ||
          item.userAvatar ||
          item.avatar_url;

    // Helper function to strip markdown formatting
    const stripMarkdown = (text: string): string => {
      return text
        .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/^#+\s+/gm, "")
        .replace(/^>\s+/gm, "")
        .replace(/^[-*+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/\n\s*\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[*_]/g, "")
        .trim();
    };

    // Helper function to truncate text to specific word count with dots (same as Home)
    const getTruncatedContent = (text: string, maxWords: number): string => {
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      if (words.length === 0) return "";

      if (words.length <= maxWords) {
        return text;
      }

      return words.slice(0, maxWords).join(" ") + "...";
    };

    // Get appropriate content based on post type
    const getDisplayContent = () => {
      const cleanContent = stripMarkdown(postContent);
      if (item.type === "article") {
        return getTruncatedContent(cleanContent, 25);
      } else if (item.type === "podcast") {
        return getTruncatedContent(cleanContent, 20);
      } else if (item.type === "community") {
        // For communities, show description if available, otherwise fallback to content
        const communityContent = item.description || postContent;
        return getTruncatedContent(stripMarkdown(communityContent), 10);
      }
      return cleanContent;
    };

    const displayContent = getDisplayContent();
    const enforcement = postEnforcements[`${item.id}_${item.type}`];
    const isEnforced = !!(
      enforcement &&
      enforcement.action &&
      enforcement.action !== "none"
    );

    return (
      <div style={{...(styles.postContainer || {}), backgroundColor: theme.background}}>
        <div style={styles.postHeader}>
          <button
            onClick={() => {
              if (item.author_id) {
                router.push("/user-profile");
              }
            }}
          >
            <img
              src={
                item.profiles?.avatar_url
                  ? { uri: item.profiles.avatar_url }
                  : userAvatar && typeof userAvatar === "string"
                    ? { uri: userAvatar }
                    : "/assets/../assets/avatar.jpg"
              }
              style={styles.avatar}
            />
          </button>
          <div style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <span style={{...(styles.username || {}), color: theme.text}}>{userName}</span>
            {isExclusiveEarlyCreator(item.profiles) && (
              <ExclusiveEarlyCreatorBadge compact />
            )}
            {(item.profiles?.is_verified || item.is_verified) && (
              <VerificationBadge size={14} />
            )}
            {item.is_boosted && (
              <PromotedBadge size="small" style={{ marginLeft: spacing.sm }} />
            )}
          </div>
          <span style={{...(styles.time || {}), color: theme.secondaryText}}>{postTime}</span>
        </div>

        {item.type !== "article" &&
          item.type !== "podcast" &&
          item.type !== "verse" && (
          <span style={{...(styles.postTitle || {}), color: theme.text}}>
            {item.type === "community" ? item.name || item.title : item.title}
          </span>
      )}
        {isEnforced && (
          <div
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.cardBackground,
              marginBottom: spacing.sm,
            }}
          >
            <span
              style={{
                fontSize: fontSize.sm,
                fontWeight: "700",
                color: theme.secondaryText,
                marginBottom: spacing.sm,
                textTransform: "uppercase",
              }}
            >
              {enforcement.title ||
                (enforcement.action === "under_review"
                  ? "Under Review"
                  : enforcement.action === "blocked"
                    ? "Blocked"
                    : enforcement.action === "removed"
                      ? "Removed"
                      : "Restricted")}
            </span>
            <span style={{ color: theme.text, fontSize: fontSize.sm2 }}>
              {enforcement?.message ||
                (enforcement?.action === "removed"
                  ? "This post has been removed for violating our guidelines."
                  : "This post is currently blocked and under review.")}
            </span>
          </div>
      )}
        {item.type === "article" && !isEnforced && (
          <>
            <button onClick={() => handleNavigateToArticlePost(item)}>
              <span style={{...(styles.postTitle || {}), color: theme.text}}>{item.title}</span>
            </button>

            <button onClick={() => handleNavigateToArticlePost(item)}>
              <div style={styles.rowContent}>
                <img
                  src={{
                    uri:
                      item.image ||
                      item.cover_image_url ||
                      "https://via.placeholder.com/90x90",
                  }}
                  style={styles.thumbnail}
                  onError={() => {
                    console.log(
                      "Failed to load image:",
                      item.image || item.cover_image_url,
                    );
                  }}
                />
                <span style={{...styles.postText, color: theme.secondaryText}}>
                  {displayContent}
                </span>
              </div>
            </button>
          </>
        )}

        {item.type === "video" && !isEnforced && (
          <div style={styles.fullWidthVideoWrapper}>
            <button
              onClick={() => {
                if (item.id) incrementViewCount("videos", item.id);
                // Get all video bookmarks and find the index of the clicked video
                const allVideoBookmarks = bookmarkedPosts.filter(
                  (b) => b.type === "video",
                );
                const videoIndex = allVideoBookmarks.findIndex(
                  (v) => v.id === item.id,
                );
                router.push("/reel-video");
              }}
              style={styles.videoContainer}
            >
              <VideoPost videoUrl={videoUrl} thumbnailUrl={postImage} />
              {displayContent && <div style={styles.videoDescription}></div>}
            </button>
          </div>
      )}
        {item.type === "podcast" && !isEnforced && (
          <>
            <button
              onClick={() => {
                if (item.id) trackView(item.id, "podcast");
                router.push("/podcasts-post");
              }}
            >
              <span style={{...(styles.postTitle || {}), color: theme.text}} >
                {item.title || "Untitled Podcast"}
              </span>
            </button>

            <div>
              <span
                style={{...(styles.postText || {}), color: theme.secondaryText,
                    marginTop: spacing.sm,
                    marginLeft: 0,
                    marginBottom: spacing.sm,}}
              >
                {displayContent || "No description available"}
              </span>
              <button
                onClick={() => {
                  if (item.id) {
                    trackView(item.id, "podcast");
                    incrementViewCount("podcasts", item.id);
                  }
                  router.push("/podcasts-post");
                }}
              >
                <div style={{ position: "relative" }}>
                  <img
                    src={
                      item.cover_image_url
                        ? { uri: item.cover_image_url }
                        : "/assets/../assets/podcast1.jpg"
                    }
                    style={styles.thumbnail}
                    onError={(error) => {
                      console.warn("Thumbnail image load error:", error);
                    }}
                  />
                </div>
              </button>
            </div>
          </>
        )}

        {item.type === "community" && (
          <button
            onClick={() => {
              router.push("/community-profile");
            }}
          >
            <span style={{...(styles.postText || {}), color: theme.secondaryText}}>{displayContent}</span>
            <div style={styles.communityStats}>
              <span style={{...(styles.communityStatText || {}), color: theme.secondaryText}}>
                {item.member_count || 0} members
              </span>
              {item.is_private && (
                <span style={styles.privateLabel}>Private</span>
              )}
            </div>
            {postImage && (
              <img src={postImage } style={styles.thumbnail} />
            )}
          </button>
      )}
        {item.type === "verse" && !isEnforced && (
          <div style={styles.verseContainer}>
            {item.is_boosted && (
              <PromotedBadge size="small" style={{ marginBottom: spacing.xs }} />
            )}
            <span style={{...(styles.verseText || {}), color: theme.secondaryText}}>{displayContent}</span>
            {postImage && (
              <img src={postImage } style={styles.verseImage} />
            )}
          </div>
      )}
        <div style={{...(styles.iconRow || {}), ...(isEnforced ? { opacity: 0.4 } : {})}}>
          <button
            disabled={isEnforced}
            onClick={() => {
              if (item.type === "article") {
                toggleArticleLike(item.id);
              } else if (item.type === "podcast") {
                togglePodcastLike(item.id);
              } else {
                handleToggleLike(item.id, item.type);
              }
            }}
          >
            {(
              item.type === "article"
                ? likedArticles.has(item.id)
                : item.type === "podcast"
                  ? likedPodcasts.has(item.id)
                  : likedPosts.has(item.id)
            ) ? (
              <IoChevronBack />
            ) : (
              <IoChevronBack />
            )}
          </button>
          <span style={{ color: theme.secondaryText }}>
            {item.type === "article"
              ? articleLikeCounts[item.id] || item.like_count || 0
              : item.type === "podcast"
                ? podcastLikeCounts[item.id] || item.like_count || 0
                : item.like_count || 0}
          </span>

          <button disabled>
            <MdCheck />
          </button>
          <span style={{ color: theme.secondaryText }}>{item.view_count || 0}</span>

          <button
            disabled={isEnforced}
            onClick={() => {
              if (item.type === "podcast") {
                setSelectedPodcast(item);
              } else {
                setSelectedComment(item);
              }
              setShowCommentModal(true);
            }}
          >
            <FiSearch />
          </button>
          <span style={{ color: theme.secondaryText }}>{item.comment_count || 0}</span>

          <div pointerEvents={isEnforced ? "none" : "auto"}>
            <BookmarkButton post={item} />
          </div>

          <button
            disabled={isEnforced}
            onClick={() => {
              if (item.type === "podcast") {
                setSelectedPodcast(item);
              } else {
                setSelectedPost(item);
              }
              setShowShare(true);
            }}
          >
            <FiSearch />
          </button>

          <TbDotsVertical />

          <span style={{...(styles.dateText || {}), color: theme.secondaryText}}>
            {(item.type === "podcast" || item.type === "video") &&
            item.created_at
              ? formatDate(item.created_at) || "08 July"
              : formatDate(item.date || item.created_at) || "08 July"}
          </span>

          {item.type === "article" && !isEnforced && (
            <div style={styles.readMoreCircle}>
              <button
                onClick={() => handleNavigateToArticlePost(item)}
              >
                <MdCheck />
              </button>
            </div>
        )}
          {item.type === "podcast" && !isEnforced && (
            <div style={{...(styles.readMoreCircle || {}), borderColor: "#32CD32"}}>
              <button
                onClick={() => {
                  if (item.id) trackView(item.id, "podcast");
                  router.push("/podcasts-post");
                }}
              >
                <IoMic />
              </button>
            </div>
        )}
          {item.type === "video" && !isEnforced && (
            <div style={{...(styles.readMoreCircle || {}), borderColor: "#FF6347"}}>
              <button
                onClick={() => {
                  // Get all video bookmarks and find the index of the clicked video
                  const allVideoBookmarks = bookmarkedPosts.filter(
                    (b) => b.type === "video",
                  );
                  const videoIndex = allVideoBookmarks.findIndex(
                    (v) => v.id === item.id,
                  );
                  router.push("/reel-video");
                }}
              >
                <IoChevronBack />
              </button>
            </div>
        )}
          {item.type === "community" && (
            <div style={{...(styles.readMoreCircle || {}), borderColor: "#9B59B6"}}>
              <button
                onClick={() => {
                  router.push("/community-profile");
                }}
              >
                <IoPeople />
              </button>
            </div>
      )}
        </div>
      </div>
    );
  };

  // Empty state component
  const EmptyBookmarks = () => (
    <div style={styles.emptyContainer}>
      <IoChevronBack />
      <span style={{...(styles.emptyTitle || {}), color: theme.text}}>No Bookmarks Yet</span>
      <span style={{...(styles.emptyText || {}), color: theme.secondaryText}}> 
        Posts you bookmark will appear here for easy access
      </span>
    </div>
  );

  const handleClearAll = async () => {
    try {
      await clearAllBookmarks();
    } catch (error) {
      console.error("Error clearing bookmarks:", error);
    }
  };

  if (loading) {
    return (
      <div
        style={{...(styles.container || {}), ...(styles.centerContent || {}), backgroundColor: theme.background}}
      >
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={{...(styles.loadingText || {}), color: theme.secondaryText}}> 
          Loading bookmarks...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{...(styles.outerContainer || {}), flexDirection: isDesktop ? "row" : "column",
          backgroundColor: theme.background,}}
    >
      {/* Main Content Area - 80% on desktop */}
      <div
        style={{...(styles.container || {}), flex: isDesktop ? 0.8 : 1, backgroundColor: theme.background}}
      >
        <div style={{...(styles.header || {}), backgroundColor: theme.background}}>
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <TbChevronLeft />
          </button>
          <span style={{...(styles.headerText || {}), color: theme.text}}>Bookmarks</span>
          <div style={{ flexDirection: "row", gap: spacing.md }}>
            <button
              onClick={async () => {
                await refreshBookmarks();
              }}
            >
              <span style={{...(styles.clearAllText || {}), color: "#00BFFF"}}>
                Refresh
              </span>
            </button>
            {bookmarkedPosts.length > 0 && (
              <button onClick={handleClearAll}>
                <span style={{...(styles.clearAllText || {}), color: theme.secondaryText}}> 
                  Clear All
                </span>
              </button>
            )}
          </div>
        </div>

        <div style={{backgroundColor: theme.background, overflowY: "auto"}}>
          {visibleBookmarkedPosts.length > 0 ? (
            visibleBookmarkedPosts.map((item, index) => (
              <div key={item.id || index}>
                {renderPost({ item })}
                {index < visibleBookmarkedPosts.length - 1 && (
                  <div style={{...(styles.separator || {}), backgroundColor: theme.border}} />
                )}
              </div>
            ))
          ) : (
            <EmptyBookmarks />
          )}
        </div>

        {/* Comment Modal */}
        <CommentModal
          visible={showCommentModal}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedComment(null);
          }}
          contentId={selectedComment?.id || ""}
          contentType={selectedComment?.type || "article"}
        />

        {/* Share Modal */}
        <SharePostModal
          visible={showShare}
          onClose={() => {
            setShowShare(false);
            setSelectedPost(null);
            setSelectedPodcast(null);
          }}
          title={
            selectedPost?.title ||
            selectedPodcast?.title ||
            selectedPost?.name ||
            selectedPodcast?.name
          }
          date={
            selectedPost?.created_at || selectedPodcast?.created_at
              ? new Date(
                  selectedPost?.created_at || selectedPodcast?.created_at || "",
                ).toLocaleDateString()
              : selectedPost?.date || selectedPodcast?.date
          }
          postId={selectedPost?.id || selectedPodcast?.id}
          postType={selectedPost?.type || selectedPodcast?.type}
          url={`https://www.verrsa.org/${selectedPost?.type || selectedPodcast?.type}/${selectedPost?.id || selectedPodcast?.id}`}
          cover_image_url={
            selectedPost?.cover_image_url ||
            selectedPodcast?.cover_image_url ||
            selectedPost?.image ||
            selectedPodcast?.image ||
            undefined
          }
          thumbnail_url={
            selectedPost?.thumbnail_url ||
            selectedPodcast?.thumbnail_url ||
            undefined
          }
          description={
            selectedPost?.description ||
            selectedPodcast?.description ||
            selectedPost?.content ||
            selectedPodcast?.content ||
            selectedPost?.excerpt ||
            selectedPodcast?.excerpt
          }
        />
      </div>

      {/* Desktop Drawer Sidebar - 20% */}
      {isDesktop && (
        <div
          style={{...(styles.desktopDrawer || {}), backgroundColor: theme.cardBackground,
              borderLeftColor: theme.border,}}
        >
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, backgroundColor: "#fff" },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 65,
    marginBottom: spacing.base,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  headerText: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    flex: 1,
    textAlign: "center",
    marginRight: spacing.xl, // Balance the back button width
  },
  clearAllText: {
    fontSize: fontSize.base,
    color: "#FF6347",
    fontWeight: "500",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: "#666",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: "#333",
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    paddingLeft: spacing.xl3,
    paddingRight: spacing.xl3,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: radius.xl,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  postContainer: {
    marginBottom: spacing.xl2,
    backgroundColor: "#fff",
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  username: { fontWeight: "400", fontSize: fontSize.lg, marginBottom: spacing.xs },
  time: { fontSize: fontSize.md, color: "#888" },
  postTitle: { fontSize: fontSize.lg, fontWeight: "400", marginBottom: spacing.sm },
  postText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: "300",
    color: "#555",
    lineHeight: 24,
    marginLeft: -8,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  articleThumbnail: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    marginRight: 3,
  },
  podcastThumbnail: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    marginRight: spacing.px,
  },

  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.md,
  },
  podcastPlayIcon: {
    position: "absolute",
    top: "35%",
    left: "35%",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  dateText: { fontSize: fontSize.md, color: "#555", marginLeft: spacing.sm, marginRight: 90 },
  readMoreCircle: {
    width: 25,
    height: 25,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        position: "absolute",
        right: 0,
        marginLeft: 0,
      },
      android: {
        marginLeft: -2,
      },
    }),
  },
  icon: {
    marginLeft: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginTop: spacing.px,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  // Video styles from Home
  fullWidthVideoWrapper: {
    marginLeft: -20,
    marginRight: -20,
    marginBottom: spacing.sm,
  },
  videoContainer: {
    marginBottom: spacing.sm,
  },
  videoWrapper: {
    position: "relative",
    width: "100%",
    height: 400,
    borderRadius: radius.none,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  muteIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  placeholderVideo: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  placeholderText: {
    marginTop: spacing.sm,
    color: "#999",
    fontSize: fontSize.md,
  },
  videoDescription: {
    marginTop: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
  },
  videoDescriptionText: {
    fontSize: fontSize.md2,
    color: "#555",
    fontFamily: fontFamily.regular,
  },
  textContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  communityStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  communityStatText: {
    fontSize: fontSize.sm,
    color: "#666",
  },
  verseContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  verseText: {
    fontSize: fontSize.base,
    lineHeight: 24,
    marginBottom: spacing.md,
    color: "#555",
  },
  verseImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.lg,
    objectFit: "cover",
  },
  privateLabel: {
    fontSize: fontSize.xs,
    color: "#9B59B6",
    backgroundColor: "#F3E5F5",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
    borderRadius: radius.md,
    fontWeight: "500",
  },
  outerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  desktopDrawer: {
    flex: 0.2,
    borderLeftWidth: 1,
    overflow: "hidden",
  },
};
