// @ts-nocheck
import { useRouter } from 'next/router';
import { FlatList } from '../lib/reactNativeShim';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack, IoMic } from 'react-icons/io5';
import { TbChevronLeft } from 'react-icons/tb';
import { supabase } from '../components/supabase';
import {
  getUserAllPosts,
  getUserLikeStatusBatch,
  getLikeCountsBatch,
  toggleLike as apiToggleLike,
  getLikeCount,
} from '../components/api';
import PromotedBadge from '../components/PromotedBadge';


export default function AdsandBoosts5() {
  const router = useRouter();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikeCounts, setPostLikeCounts] = useState<{
    [key: string]: number;
  }>({});
  const promotedPosts: any[] = [];
  const isPostPromoted = () => false;

  // Fetch current user and their posts
  useEffect(() => {
    fetchCurrentUserAndPosts();
  }, []);

  const fetchCurrentUserAndPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error fetching user:", userError);
        setError("Failed to get user information. Please try again.");
        setLoading(false);
        return;
      }

      if (!user) {
        console.log("No user logged in");
        setError("You need to be logged in to view your posts.");
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Fetch current user's profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.log("Profile fetch error:", profileError);
      } else {
        setCurrentUserProfile(profileData);
      }

      // Fetch user's posts
      const posts = await getUserAllPosts(user.id);
      setUserPosts(posts);

      // Fetch like counts and statuses for the posts
      if (posts.length > 0) {
        await fetchLikeData(posts);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setError("Failed to load your posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLikeData = async (posts: any[]) => {
    try {
      // Filter out profile posts and map to content items
      const contentItems = posts
        .filter((post) => post.type !== "profile")
        .map((post) => ({
          id: post.id,
          type: post.type as "article" | "podcast" | "video",
        }));

      if (contentItems.length === 0) return;

      // Fetch like statuses and counts
      const [likeStatuses, likeCounts] = await Promise.all([
        getUserLikeStatusBatch(contentItems),
        getLikeCountsBatch(contentItems),
      ]);

      // Update liked posts state
      const newLikedPosts = new Set<string>();
      Object.entries(likeStatuses).forEach(([key, isLiked]) => {
        if (isLiked) {
          const postId = key.split("_")[0]; // Extract post ID from "postId_type" format
          newLikedPosts.add(postId);
        }
      });

      setLikedPosts(newLikedPosts);

      // Update like counts state
      const newLikeCounts: { [key: string]: number } = {};
      Object.entries(likeCounts).forEach(([key, count]) => {
        const postId = key.split("_")[0]; // Extract post ID from "postId_type" format
        newLikeCounts[postId] = count;
      });

      setPostLikeCounts(newLikeCounts);

      // Update posts with actual like counts
      setUserPosts((prevPosts) =>
        prevPosts.map((post) => ({
          ...post,
          like_count: newLikeCounts[post.id] || post.like_count || 0,
          likes_count: newLikeCounts[post.id] || post.likes_count || 0,
        })),
      );
    } catch (error) {
      console.error("Error fetching like data:", error);
    }
  };

  const handleToggleLike = async (
    postId: string,
    postType: "article" | "podcast" | "video",
  ) => {
    if (!currentUser) return;

    try {
      const isCurrentlyLiked = likedPosts.has(postId);

      // Optimistic update
      if (isCurrentlyLiked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPostLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max((prev[postId] || 0) - 1, 0),
        }));
      } else {
        setLikedPosts((prev) => new Set(prev).add(postId));
        setPostLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }

      // Update the userPosts state as well
      setUserPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                like_count: isCurrentlyLiked
                  ? Math.max((post.like_count || 0) - 1, 0)
                  : (post.like_count || 0) + 1,
                likes_count: isCurrentlyLiked
                  ? Math.max((post.likes_count || 0) - 1, 0)
                  : (post.likes_count || 0) + 1,
              }
            : post,
        ),
      );

      // API call
      await apiToggleLike(postId, postType);

      // Fetch actual count from database
      const actualCount = await getLikeCount(postId, postType);

      // Update with actual count
      setPostLikeCounts((prev) => ({
        ...prev,
        [postId]: actualCount,
      }));

      setUserPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                like_count: actualCount,
                likes_count: actualCount,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic updates on error
      await fetchLikeData(userPosts);
    }
  };

  type Post = any;

  // Component to render video posts with actual video preview
  const VideoPostComponent = ({
    item,
    onPress,
  }: {
    item: Post;
    onPress: () => void;
  }) => {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoUrl = item.video_url || item.content_url || item.url;

    useEffect(() => {
      if (videoUrl) {
        const timer = setTimeout(() => {
          setIsVideoLoaded(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [videoUrl]);

    if (!videoUrl) {
      // Fallback to thumbnail if no video URL
      const videoThumbnail = item.thumbnail_url;
      return (
        <button style={styles.videoContainer} onClick={onPress}>
          <div style={styles.videoWrapper}>
            {videoThumbnail ? (
              <img
                src={videoThumbnail }
                style={styles.videoPlayer}
                defaultSource={"/assets/../assets/video1.jpg"}
              />
            ) : (
              <div style={{...(styles.videoPlayer || {}), ...(styles.placeholderVideo || {})}}>
                <MdCheck />
              </div>
            )}
            <div style={styles.videoOverlay}>
              <IoChevronBack />
            </div>
          </div>
        </button>
      );
    }

    return (
      <button style={styles.videoContainer} onClick={onPress}>
        <div style={styles.videoWrapper}>
          <Video
            src={videoUrl }
            style={styles.videoPlayer}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isPlaying}
            isMuted={true}
            isLooping={true}
          />
          {!isVideoLoaded && (
            <div style={styles.videoLoadingOverlay}>
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            </div>
          )}
          <button
            style={styles.videoOverlay}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            <IoChevronBack />
          </button>
        </div>
      </button>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
  const router = useRouter();
    const userName = item.profiles?.full_name || item.user || "Your Name";
    const userAvatar =
      item.profiles?.avatar_url || "/assets/../assets/avatar.jpg";
    const postTime = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "8:00 am";

    // Ensure profile data includes verification status from current user if available
    const enhancedItem = {
      ...item,
      profiles: {
        ...item.profiles,
        is_verified:
          item.profiles?.is_verified ||
          currentUser?.user_metadata?.is_verified ||
          currentUserProfile?.is_verified ||
          false,
        full_name: item.profiles?.full_name || userName,
        avatar_url: item.profiles?.avatar_url,
      },
    };

    const postImage = item.cover_image_url || item.thumbnail_url;
    const videoThumbnail = item.thumbnail_url || item.video_url;

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
        .replace(/^\d+\.\s+/gm, "");
    };

    // Truncate content to show preview only
    const fullContent = item.content || item.description || "";
    const cleanContent = stripMarkdown(fullContent);
    const postContent =
      cleanContent.length > 150
        ? cleanContent.substring(0, 150) + "..."
        : cleanContent;

    // Use actual like counts from state, fallback to item data
    const likeCount =
      postLikeCounts[item.id] || item.likes_count || item.like_count || 0;
    const commentCount = item.comments_count || item.comment_count || 0;
    const isLiked = likedPosts.has(item.id);

    return (
      <div style={styles.postCard}>
        <div style={styles.postHeader}>
          <button>
            <img
              src={
                typeof userAvatar === "string"
                  ? { uri: userAvatar }
                  : userAvatar
              }
              style={styles.postAvatar}
            />
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ flexDirection: "row", alignItems: "center" }}>
              <span style={styles.username}>{userName}</span>
              {(item.profiles?.is_verified ||
                currentUser?.user_metadata?.is_verified ||
                currentUserProfile?.is_verified) && (
                <MdCheck />
              )}
            </div>
            <span style={{ fontSize: fontSize.sm, color: "#888" }}>{postTime}</span>
          </div>
          <TbDots />
        </div>

        <div style={styles.titleRow}>
          {item.type === "video" ? (
            <button
              onClick={() =>
                router.push("/reel-video")
              }
              style={{ flex: 1 }}
            >
              <span style={styles.postTitle}>{item.title}</span>
            </button>
          ) : (
            <span style={{...(styles.postTitle || {}), flex: 1}}>{item.title}</span>
        )}
          {/* Check if this post is promoted */}
          {isPostPromoted(item.id, item.type) && (
            <PromotedBadge size="small" style={styles.promotedBadge} />
          )}
        </div>

        {item.type === "article" && (
          <button
            onClick={() =>
              router.push("/article-post")
            }
          >
            <div style={styles.rowContent}>
              {postImage ? (
                <img
                  src={postImage }
                  style={styles.thumbnail}
                  defaultSource={"/assets/../assets/article1.jpg"}
                />
              ) : (
                <div style={{...(styles.thumbnail || {}), ...(styles.placeholderThumbnail || {})}}>
                  <MdCheck />
                </div>
            )}
              <span style={styles.postText}>{postContent}</span>
            </div>
          </button>
      )}
        {item.type === "video" && (
          <div style={styles.fullWidthVideoWrapper}>
            <VideoPostComponent
              item={enhancedItem}
              onClick={() =>
                router.push("/reel-video")
              }
            />
          </div>
      )}
        {item.type === "podcast" && (
          <button
            onClick={() =>
              router.push("/podcasts-post")
            }
          >
            <div style={styles.rowContent}>
              <div style={{ position: "relative" }}>
                {postImage ? (
                  <img
                    src={postImage }
                    style={styles.thumbnail}
                    defaultSource={"/assets/../assets/podcast1.jpg"}
                  />
                ) : (
                  <div style={{...(styles.thumbnail || {}), ...(styles.placeholderThumbnail || {})}}>
                    <MdCheck />
                  </div>
                )}
              </div>
              <span style={styles.postText} >
                {postContent}
              </span>
            </div>
          </button>
      )}
        <div style={styles.iconRow}>
          <button
            onClick={() => handleToggleLike(item.id, item.type)}
          >
            <IoChevronBack />
          </button>
          <span>{likeCount}</span>

          <button>
            <FiSearch />
          </button>
          <span>{commentCount}</span>

          <button>
            <FiSearch />
          </button>

          <button>
            <FiSearch />
          </button>

          <span style={styles.dateText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                })
              : "08 July"}
          </span>

          {item.type === "article" && (
            <div style={styles.readMoreCircle}>
              <button
                onClick={() =>
                  router.push("/article-post")
                }
              >
                <MdCheck />
              </button>
            </div>
        )}
          {item.type === "video" && (
            <div style={{...(styles.readMoreCircle || {}), borderColor: "#FF6347"}}>
              <button
                onClick={() =>
                  router.push("/reel-video")
                }
              >
                <IoChevronBack />
              </button>
            </div>
        )}
          {item.type === "podcast" && (
            <div style={{...(styles.readMoreCircle || {}), borderColor: "#32CD32"}}>
              <button
                onClick={() =>
                  router.push("/podcasts-post")
                }
              >
                <IoMic />
              </button>
            </div>
                )}
        </div>

        {/* Boost Post Button */}
        <button
          style={styles.boostButton}
          onClick={() => router.push("/boost-goal")}
        >
          <span style={styles.boostButtonText}>Boost Post</span>
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerText}>My Posts</span>
      </div>

      {/* Back Button */}
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>

      <span style={styles.heading}>Select a post to boost</span>
      <span style={styles.subText}>
        Kindly select the post you would like to boost
      </span>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          <span style={styles.loadingText}>Loading your posts...</span>
        </div>
      ) : error ? (
        <div style={styles.emptyStateContainer}>
          <MdCheck />
          <span style={styles.emptyStateText}>{error}</span>
          <button
            style={styles.retryButton}
            onClick={fetchCurrentUserAndPosts}
          >
            <span style={styles.retryButtonText}>Try Again</span>
          </button>
        </div>
      ) : userPosts.length > 0 ? (
        <FlatList
          data={userPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <div style={styles.separator} />}
          refreshing={loading}
        />
      ) : (
        <div style={styles.emptyStateContainer}>
          <img
            src={"/assets/../assets/no_ads.png"}
            style={styles.emptyStateImage}
            
          />
          <span style={styles.emptyStateText}>
            So sorry, you have no post to run an advertisement on!
          </span>
          <span style={styles.emptyStateSubText}>
            Create some content first to boost your posts.
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",

    paddingTop: spacing.xl5,
  },
  header: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -5,
  },
  postContainer: {
    marginBottom: spacing.lg,
    backgroundColor: "#fff",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  time: {
    fontSize: fontSize.md,
    color: "#888",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  postTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    color: "#222",
  },
  promotedBadge: {
    marginLeft: spacing.sm,
    marginTop: spacing.px,
  },
  postText: {
    fontSize: fontSize.base,
    fontWeight: "300",
    color: "#333",
    flex: 1,
    flexWrap: "wrap",
    lineHeight: 24,
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
    marginRight: spacing.md,
    backgroundColor: "#f0f0f0",
  },

  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
    justifyContent: "space-between",
    gap: spacing.md,
  },

  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginTop: spacing.px,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  readMoreCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },
  dateText: {
    fontSize: fontSize.sm,
    color: "#888",
    marginLeft: spacing.sm,
  },
  icon: {
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    paddingBottom: 80,
  },
  fabMenu: {
    alignItems: "flex-end",
    marginRight: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  menuText: {
    color: "#fff",
    fontSize: fontSize.xl,
    marginRight: spacing.base,
  },
  iconCircleWhite: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleBlue: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    textAlign: "center",
    marginTop: spacing.base,
    marginBottom: spacing.lg,
    color: "#000",
  },
  backButton: {
    position: "absolute",
    top: 72,
    left: 20,
    zIndex: 10,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    alignSelf: "flex-start",
    marginLeft: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    fontFamily: "InstrumentSans-Bold",
  },
  subText: {
    fontSize: fontSize.base,
    alignSelf: "flex-start",
    marginLeft: spacing.lg,
    color: "#666",
    marginBottom: spacing.base,
  },
  button: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    marginTop: 220,
    paddingLeft: 120,
    paddingRight: 120,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "400",
    fontFamily: "InstrumentSans-Bold",
  },
  boostButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: 90,
    paddingRight: 90,
    alignSelf: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  boostButtonText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "400",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: "#666",
    marginTop: spacing.md,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingLeft: spacing.xl3,
    paddingRight: spacing.xl3,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    textAlign: "center",
    color: "#333",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyStateSubText: {
    fontSize: fontSize.md,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "400",
  },
  placeholderThumbnail: {
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderVideo: {
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: "#fff",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    marginRight: spacing.sm,
  },
  username: {
    fontSize: fontSize.base,
    fontWeight: "400",
    color: "#111",
  },
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
  videoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  },
  emptyStateImage: {
    width: 150,
    height: 150,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
};
