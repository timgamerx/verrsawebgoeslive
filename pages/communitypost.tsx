// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { supabase } from '../components/supabase';
import SharePostModal from '../components/SharePostModal.web';
import ReportContentModal from '../components/ReportContentModal';
import MetaTags from '../components/MetaTags';
import { createComment, getComments, trackView } from '../components/api';
import { fetchCurrentUserProfile, UserProfile } from '../lib/profileUtils';
import { renderTextWithLinks } from '../lib/linkUtils';
import { updateLastActive } from '../lib/activityTracker';
import { getActiveModerationExclusions } from '../lib/moderationExclusions';
import { FiSearch } from 'react-icons/fi'
import { TbChevronLeft } from 'react-icons/tb'
import { IoChevronBack } from 'react-icons/io5'

export default function CommunityPost() {
  const router = useRouter();
  const { postId, communityId } = router.query as {
    postId?: string;
    communityId?: string;
  };
  const passedPost = null;

  const [post, setPost] = useState<any>(passedPost || null); // Initialize with passed data
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Always load to get complete post data
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0); // Real-time like count from database
  const [showShareModal, setShowShareModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Helper function to parse images
  const getPostImages = (post: any) => {
    if (!post.images) return [];

    // If images is already an array, return it
    if (Array.isArray(post.images)) {
      return post.images.filter((url) => url && typeof url === "string");
    }

    // If images is a string (JSON), try to parse it
    if (typeof post.images === "string") {
      try {
        const parsed = JSON.parse(post.images);
        if (Array.isArray(parsed)) {
          return parsed.filter((url) => url && typeof url === "string");
        }
      } catch (e) {
        // If parsing fails, treat as single URL
        return [post.images];
      }
    }

    return [];
  };

  const checkLiveStatus = async () => {
    if (!communityId) return;

    try {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, is_active")
        .eq("community_id", communityId)
        .eq("is_active", true)
        .single();

      if (error) {
        // PGRST116 means no rows found, which is normal when not live
        if (error.code === "PGRST116") {
          setIsLive(false);
        } else {
          console.error("Error checking live status:", error);
          setIsLive(false);
        }
        return;
      }

      // Only set to true if we actually have data and it's active
      setIsLive(data && data.is_active === true);
    } catch (error) {
      console.error("Error checking live status:", error);
      setIsLive(false);
    }
  };

  useEffect(() => {
    fetchCurrentUserProfile().then(setUserProfile);

    if (postId) {
      // Track view when post is accessed - ensure postId is string
      trackView(String(postId), "community");

      // Always fetch post to ensure we have complete data including video fields
      // This ensures video_url and video_duration are available
      fetchPost();

      fetchComments();
      checkLikeStatus();
      fetchLikeCount();
      checkLiveStatus();
    }
  }, [postId, communityId]);

  const fetchLikeCount = async () => {
    try {
      const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("content_id", postId)
        .eq("content_type", "community_post");

      if (error) throw error;
      setLikeCount(count || 0);
    } catch (error) {
      console.error("Error fetching like count:", error);
      setLikeCount(0);
    }
  };

  const checkLikeStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("content_id", postId)
        .eq("content_type", "community_post")
        .single();

      setIsLiked(!!data);
    } catch (error) {
      console.log("Error checking like status:", error);
      setIsLiked(false);
    }
  };

  const fetchPost = async () => {
    setLoading(true);
    const { excludedPostKeys, excludedUserIds } = await getActiveModerationExclusions();
    const { data } = await supabase
      .from("posts")
      .select("*, video_url, video_duration")
      .eq("id", postId)
      .single();

    if (data) {
      const postKey = `${data.id}_${data.post_type || "community_post"}`;
      if (
        excludedUserIds.has(String(data.user_id || "")) ||
        excludedPostKeys.has(postKey)
      ) {
        setPost(null);
        setLoading(false);
        return;
      }
    }

    setPost(data);
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const commentsData = await getComments(postId, "community_post");
      setComments(commentsData || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  };

  const handleLike = async () => {
    try {
      // Track user activity
      updateLastActive();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistic update
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));

      if (wasLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("content_id", postId)
          .eq("content_type", "community_post");

        if (deleteError) throw deleteError;

        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("content_id", postId)
          .eq("content_type", "community_post");

        const newCount = count || 0;
        setLikeCount(newCount);
        await supabase
          .from("posts")
          .update({ like_count: newCount })
          .eq("id", postId);
      } else {
        // Like
        const { error: insertError } = await supabase
          .from("likes")
          .insert({ user_id: user.id, content_id: postId, content_type: "community_post" });

        if (insertError) throw insertError;

        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("content_id", postId)
          .eq("content_type", "community_post");

        const newCount = count || 0;
        setLikeCount(newCount);
        await supabase
          .from("posts")
          .update({ like_count: newCount })
          .eq("id", postId);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error and fetch actual count
      setIsLiked(!isLiked);
      await fetchLikeCount();
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() === "" || submittingComment) return;

    setSubmittingComment(true);
    try {
      const createdComment = await createComment(
        postId,
        "community_post",
        newComment.trim(),
      );
      if (createdComment) {
        await fetchComments();
        setNewComment("");
        // Update comment_count from comments table
        const { count } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("content_id", postId)
          .eq("content_type", "community_post");
        const newCount = count || 0;
        setPost((prev: any) => ({ ...prev, comment_count: newCount }));
        await supabase
          .from("posts")
          .update({ comment_count: newCount })
          .eq("id", postId);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={{ margin: spacing.xl2, color: "#888" }}>Loading post...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={styles.container}>
        <span style={{ margin: spacing.xl2, color: "#888" }}>This post is unavailable.</span>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title={post?.content ? (post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content) : "Community Post - Verrsa"}
        description={post?.content || "View this post on Verrsa"}
        image={post?.id ? `https://www.verrsa.org/api/post?id=${encodeURIComponent(post.id)}` : (post?.images?.[0] || post?.video_url)}
        url={typeof window !== "undefined" ? window.location.href : ""}
        type={post?.video_url ? "video.other" : "article"}
        video={post?.video_url}
      />
      <div>
      <div
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.base,
          marginTop: 55,
          position: "relative",
          alignSelf: "flex-start",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ left: 0, zIndex: 1 }}
        >
          <TbChevronLeft />
        </button>

        <div style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <img
            src={
              post?.author_profile?.avatar_url
                ? { uri: post.author_profile.avatar_url }
                : "/assets/../assets/avatar.jpg"
            }
            style={{...(styles.headerImage || {}), marginRight: spacing.md}}
          />
          <span style={styles.headerTitle}>
            {post?.title || "Community Post"}
          </span>
          {isLive && (
            <div style={styles.liveBadge}>
              <span style={styles.liveText}>🟢 LIVE</span>
            </div>
        )}
          {/* Report button */}
          <button
            onClick={() => setShowReportModal(true)}
            style={{ marginLeft: "auto", padding: spacing.md }}
          >
            <IoChevronBack />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div>
          {/* Post content with clickable links */}
          {renderTextWithLinks(post?.content, styles.content, "#00bfff")}

          {/* Post Images */}
          {(() => {
            const images = getPostImages(post);
            if (images.length === 0) return null;

            if (images.length === 1) {
              return (
                <img
                  src={images[0] }
                  style={{
                    width: "100%",
                    height: undefined,
                    aspectRatio: 1,
                    borderRadius: radius.md,
                    marginTop: spacing.base,
    marginBottom: spacing.base,
                  }}
                  
                />
              );
            }

            return (
              <div style={{overflowY: "auto", flex: 1}}>
                {images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl }
                    style={{
                      width: 300,
                      height: 300,
                      borderRadius: radius.md,
                      marginRight: index === images.length - 1 ? 0 : 10,
                    }}
                    
                  />
                ))}
              </div>
            );
          })()}

          {/* Fallback for legacy image_url field */}
          {!getPostImages(post).length && post?.image_url && (
            <img
              src={post.image_url }
              style={{
                width: "100%",
                height: undefined,
                aspectRatio: 1,
                borderRadius: radius.md,
                marginTop: spacing.base,
    marginBottom: spacing.base,
              }}
              
            />
          )}

          {/* Post Video */}
          {post?.video_url && (
            <div
              style={{
                width: "100%",
                height: 350,
                borderRadius: radius.none,
                overflow: "hidden",
                backgroundColor: "#000",
                marginTop: spacing.base,
    marginBottom: spacing.base,

                position: "relative",
              }}
            >
              <video
                src={post.video_url}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                controls
                playsInline
              />
              {post.video_duration && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
                    borderRadius: radius.xs,
                  }}
                >
                  <span style={{ color: "#fff", fontSize: fontSize.sm }}>
                    {Math.ceil(post.video_duration / 60000)} min
                  </span>
                </div>
                  )}
            </div>
        )}
          <div style={styles.iconRow}>
            <button
              onClick={handleLike}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {isLiked ? (
                <IoChevronBack />
              ) : (
                <IoChevronBack />
              )}
              <span style={{ marginLeft: spacing.sm, color: "#666" }}>{likeCount}</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: spacing.base,
              }}
            >
              <FiSearch />
            </button>
          </div>
          <div
            style={{
              height: 1,
              backgroundColor: "#d3d3d3",
              marginTop: 13,
    marginBottom: 13,
              alignSelf: "stretch",
            }}
          />

          {/* Comments */}
          <span
            style={{
              fontWeight: "400",
              fontSize: fontSize.base,
              marginTop: spacing.base,
              marginLeft: spacing.base,
              marginBottom: spacing.sm,
            }}
          >
            Feedbacks ({comments.length})
          </span>
          {comments.map((comment) => (
            <div key={comment.id} style={{ marginBottom: spacing.lg }}>
              <div
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: spacing.base,
                  marginTop: spacing.base,
                }}
              >
                <img
                  src={
                    comment.profiles?.avatar_url
                      ? { uri: comment.profiles.avatar_url }
                      : "/assets/../assets/avatar.jpg"
                  }
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: radius.xl2,
                    marginRight: spacing.sm,
                  }}
                />
                <span style={{ fontWeight: "400", fontSize: fontSize.base }}>
                  {comment.profiles?.full_name ||
                    comment.profiles?.username ||
                    "Anonymous"}
                </span>
                <span style={styles.feedbacksTime}>
                  {new Date(comment.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span
                style={{
                  marginTop: spacing.sm,
                  fontSize: fontSize.md,
                  marginLeft: spacing.base,
                  lineHeight: 21,
                  color: "#333",
                }}
              >
                {comment.content}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input Box */}
      <div style={styles.commentInputContainer}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={styles.commentInput}
          
          maxLength={500}
        />
        <button
          onClick={handleAddComment}
          style={{...(styles.sendButton || {}), ...(submittingComment ? styles.sendButtonDisabled : {})}}
          disabled={submittingComment || newComment.trim() === ""}
        >
          {submittingComment ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : (
            <span style={styles.sendButtonText}>Send</span>
          )}
        </button>
      </div>

      {/* Share Modal */}
      <SharePostModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={post?.title || "Community Post"}
        url={`https://www.verrsa.org/community/${communityId}/post/${postId}`}
        postType="communitypost"
        cover_image_url={post?.cover_image_url}
        postId={post?.id}
      />

      {/* Report Content Modal */}
      {showReportModal && userProfile && post && userProfile.id && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentId={post.id}
          contentType="community"
          reportedUserId={post.author_id}
          reporterUserId={userProfile.id}
        />
      )}
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,

    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerImage: {
    width: 30,
    height: 30,
    marginLeft: -4,
    borderRadius: radius.full,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
  },
  liveText: {
    fontSize: fontSize.sm,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    fontSize: fontSize.md2,
    lineHeight: 26,
    marginBottom: spacing.base,
    marginLeft: spacing.base,
    fontWeight: "300",
  },
  profileName: {
    fontSize: fontSize.md2,
    fontWeight: "400",
    fontFamily: "InstrumentSans-Medium",
  },
  highlight: {
    color: "#00BFFF",
    fontWeight: "400",
    fontFamily: "InstrumentSans-Medium",
  },
  profileImage: {
    width: 35,
    height: 35,

    borderRadius: radius.full,
  },
  profileOwnerName: {
    fontSize: fontSize.sm2,
    fontWeight: "500",
    marginTop: -3,
    lineHeight: 20,
    color: "#666",
    fontFamily: "InstrumentSans-Medium",
  },
  articleTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: spacing.lg,
  },
  articleSubtitle: {
    fontSize: fontSize.md,
    fontWeight: "100",
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    lineHeight: 20,
    marginBottom: spacing.sm,
    color: "#666",
  },
  articlePublishedTime: {
    fontSize: fontSize.base,
    fontWeight: "100",
    color: "#666",
    alignSelf: "flex-start",
    marginTop: spacing.px,
  },
  feedbacksTime: {
    fontSize: fontSize.sm,
    fontWeight: "400",
    color: "#666",
    marginLeft: spacing.sm,
  },
  followUserProfile: {
    fontSize: fontSize.sm2,
    fontWeight: "400",
    color: "#00BFFF",
    marginLeft: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.base,
    marginBottom: spacing.base,
    marginLeft: spacing.base,
  },
  icon: {
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  joinBtn: {
    backgroundColor: "#00BFFF",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    marginRight: spacing.base,
  },
  joinText: {
    color: "#fff",
    fontSize: fontSize.md,
  },
  responseBtn: {
    backgroundColor: "#f8f8f8",
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  responseText: { color: "#333", fontWeight: "500" },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: radius.xl2,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginRight: spacing.md,
    maxHeight: 100,
    fontSize: fontSize.base,
  },
  sendButton: {
    backgroundColor: "#00bfff",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.xl2,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  liveBadge: {
    backgroundColor: "green",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
};

