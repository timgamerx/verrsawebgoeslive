import React, { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../../components/supabase";
import DOMPurify from "dompurify";
import {
  IoShareSocialOutline,
  IoFlagOutline,
} from "react-icons/io5";
import CommentModal from "../../components/CommentModal";
import ReportContentModal from "../../components/ReportContentModal";
import FollowPromptModal, {
  shouldShowFollowPrompt,
  markFollowPromptShown,
} from "../../components/FollowPromptModal";
import VerificationBadge from "../../components/VerificationBadge";
import EnforcementBanner from "../../components/EnforcementBanner";
import { fetchCurrentUserProfile, UserProfile } from "../../lib/profileUtils";
import { trackArticleRead } from "../../lib/engagementTracking";
import {
  trackAdImpression,
  checkAdAvailability,
} from "../../lib/adImpressionTracking";
import { useTheme } from "../../context/ThemeProvider";
import {
  createComment,
  getComments,
  toggleCommentLike,
  getCommentLikeStatus,
  createReplyComment,
  deleteComment,
} from "../../components/api";
import { spacing, radius, fontSize } from "../../lib/theme";

interface Post {
  id: string;
  title: string;
  description?: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  created_at?: string;
  post_type?: string;
  category?: string;
  video_url?: string;
  audio_url?: string;
  view_count?: number;
  user_id: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

interface PostPageProps {
  post: Post | null;
  authorName: string;
}

type ArticleComment = {
  id: string;
  user_id?: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  content: string;
  created_at: string;
  like_count?: number;
};

export default function PostPage({ post: initialPost, authorName: initialAuthorName }: PostPageProps) {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(initialPost);
  const [authorName, setAuthorName] = useState<string>(initialAuthorName);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [repliesMap, setRepliesMap] = useState<Record<string, ArticleComment[]>>({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportParams, setReportParams] = useState<{
    contentId: string;
    contentType: "post" | "comment";
    reportedUserId: string;
  } | null>(null);
  const [contentRestricted, setContentRestricted] = useState(false);
  const [followPromptUser, setFollowPromptUser] = useState<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    description?: string;
  } | null>(null);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [followingArticleAuthor, setFollowingArticleAuthor] = useState(false);
  const articleFollowingSetRef = React.useRef<Set<string>>(new Set());
  const readStartTimeRef = React.useRef<number>(0);

  if (!post) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
          backgroundColor: theme.background,
          color: theme.text,
        }}
      >
        <h1>Post not found</h1>
      </div>
    );
  }

  // Load user profile and comments
  useEffect(() => {
    if (!post) return;

    fetchCurrentUserProfile().then(setUserProfile);
    fetchArticleComments();

    // Start tracking read time
    readStartTimeRef.current = Date.now();

    // Track ad impression
    (async () => {
      try {
        const adAvailable = await checkAdAvailability();
        const postType = (post.post_type as "article" | "video" | "podcast") || "article";
        if (adAvailable) {
          await trackAdImpression(
            post.id,
            postType,
            post.user_id,
            userProfile?.id || null
          );
        }
      } catch (e) {
        /* silent */
      }
    })();

    // Cleanup: Track read time when user leaves
    return () => {
      if (readStartTimeRef.current > 0) {
        const readDurationMs = Date.now() - readStartTimeRef.current;
        const readDurationMinutes = readDurationMs / (1000 * 60);

        if (userProfile?.id && post.user_id && readDurationMinutes > 0) {
          trackArticleRead(
            userProfile.id,
            post.id,
            post.user_id,
            readDurationMinutes
          ).catch((err) => console.warn("Failed to track article read:", err));
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, userProfile?.id]);

  // Fetch comment likes
  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  const fetchCommentLikes = async () => {
    const likeStates: { [key: string]: boolean } = {};
    const allCommentIds: string[] = [];

    // Collect all comment IDs (including replies)
    for (const comment of comments) {
      allCommentIds.push(comment.id);
      const replies = repliesMap[comment.id] || [];
      for (const reply of replies) {
        allCommentIds.push(reply.id);
      }
    }

    // Batch fetch likes
    for (const commentId of allCommentIds) {
      likeStates[commentId] = await getCommentLikeStatus(commentId);
    }
    setCommentLikes(likeStates);
  };

  const fetchArticleComments = async () => {
    if (!post) return;
    setLoadingComments(true);
    try {
      const contentType = (post.post_type as "article" | "video" | "podcast" | "community" | "community_post" | "verse") || "article";
      const fetched = await getComments(String(post.id), contentType);
      const map: Record<string, ArticleComment[]> = {};
      const topLevel = fetched.filter((c) => {
        const isReply = /^\[reply-to:(.+?)\]\s+/.test(c.content);
        if (isReply) {
          const match = c.content.match(/^\[reply-to:(.+?)\]\s+/);
          if (match) {
            const parentId = match[1];
            const cleaned: ArticleComment = {
              ...c,
              content: c.content.replace(match[0], ""),
            };
            map[parentId] = map[parentId] || [];
            map[parentId].push(cleaned);
          }
        }
        return !isReply;
      });
      const cleanedTopLevel = topLevel.map((c) => ({
        ...c,
        content: c.content.replace(/^\[reply-to:(.+?)\]\s+/, ""),
      }));
      setRepliesMap(map);
      setComments(cleanedTopLevel);
    } catch (err) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    setCommentLikes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              like_count:
                (comment.like_count || 0) + (commentLikes[commentId] ? -1 : 1),
            }
          : comment
      )
    );
    await toggleCommentLike(commentId);
  };

  const handleToggleReplyLike = async (replyId: string, parentId: string) => {
    setCommentLikes((prev) => ({ ...prev, [replyId]: !prev[replyId] }));
    setRepliesMap((prev) => {
      const list = prev[parentId] || [];
      const updated = list.map((r) =>
        r.id === replyId
          ? {
              ...r,
              like_count:
                (r.like_count || 0) + (commentLikes[replyId] ? -1 : 1),
            }
          : r
      );
      return { ...prev, [parentId]: updated };
    });
    await toggleCommentLike(replyId);
  };

  const handleSubmitComment = async () => {
    if (!post || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const contentType = (post.post_type as "article" | "video" | "podcast" | "community" | "community_post" | "verse") || "article";
      await createComment(String(post.id), contentType, newComment.trim());
      setNewComment("");
      alert("Your comment has been posted.");
      await fetchArticleComments();
    } catch (err) {
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!post || !replyTargetId || replyText.trim() === "" || submitting)
      return;
    setSubmitting(true);
    try {
      const contentType = (post.post_type as "article" | "video" | "podcast" | "community" | "community_post" | "verse") || "article";
      await createReplyComment(
        post.id,
        contentType,
        replyTargetId,
        replyText.trim()
      );
      await fetchArticleComments();
      setReplyText("");
      setReplyTargetId(null);
    } catch (e) {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCommentLocal = async (commentId: string) => {
    try {
      const success = await deleteComment(commentId);
      if (success) {
        await fetchArticleComments();
      }
    } catch {}
  };

  const handleShare = async () => {
    try {
      const postUrl = `https://verrsa.org/post/${post?.id}`;
      if (navigator.share) {
        await navigator.share({
          title: post?.title,
          text: post?.title,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        alert("Link copied to clipboard");
      }
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  const maybeShowArticleAuthorPrompt = async (authorId: string) => {
    try {
      if (!authorId || authorId === userProfile?.id) return;
      if (articleFollowingSetRef.current.has(authorId)) return;
      if (userProfile?.id) {
        const { data } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", userProfile.id)
          .eq("following_id", authorId)
          .maybeSingle();
        if (data) {
          articleFollowingSetRef.current.add(authorId);
          return;
        }
      }
      const show = await shouldShowFollowPrompt(authorId);
      if (!show) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .eq("id", authorId)
        .maybeSingle();
      setFollowPromptUser({
        id: authorId,
        name: profile?.full_name || profile?.username || "this creator",
        username: profile?.username,
        avatar: profile?.avatar_url || undefined,
        description: profile?.bio || undefined,
      });
      setShowFollowPrompt(true);
      await markFollowPromptShown(authorId);
    } catch {
      /* silent */
    }
  };

  const handleArticleFollowFromPrompt = async () => {
    if (!followPromptUser || !userProfile?.id) {
      setShowFollowPrompt(false);
      return;
    }
    setFollowingArticleAuthor(true);
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: userProfile.id,
        following_id: followPromptUser.id,
      });
      if (!error) articleFollowingSetRef.current.add(followPromptUser.id);
    } catch {
      /* silent */
    } finally {
      setFollowingArticleAuthor(false);
      setShowFollowPrompt(false);
      setFollowPromptUser(null);
    }
  };

 // const sanitizedContent = DOMPurify.sanitize(post.content || "");
  const description =
    authorName
      ? `By ${authorName} - ${(post.title || post.excerpt || post.content || "Discover amazing content on Verrsa").slice(0, 160)}`
      : (post.title || post.excerpt || post.content || "Discover amazing content on Verrsa").slice(0, 160);

  const image =
    post.cover_image_url && post.cover_image_url.trim() !== ""
      ? post.cover_image_url
      : "https://ik.imagekit.io/te9biwxvl/verrsa-team.png";

  const url = `https://verrsa.org/post/${post.id}`;

  
  const formatContent = (content: string = "") => {
  const words = content.trim().split(/\s+/);

  // If 200 words or less → return normal (or truncated if you want)
  if (words.length <= 200) {
    return content;
  }

  // Split into 4 equal parts
  const chunkSize = Math.ceil(words.length / 4);

  const paragraphs = [];

  for (let i = 0; i < 4; i++) {
    const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize).join(" ");
    if (chunk) paragraphs.push(chunk);
  }

  return paragraphs;
};

const formatted = formatContent(post.content || "");

  return (
    <>
      <Head>
        <title>{post.title || "Verrsa Post"}</title>
        <meta name="description" content={description} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title || "Verrsa Post"} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Verrsa" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title || "Verrsa Post"} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* Additional SEO */}
        <meta
          name="keywords"
          content={`Verrsa, ${post.category || "content"}, ${post.post_type || "post"}`}
        />

        <link rel="canonical" href={url} />
      </Head>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: theme.background,
          color: theme.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.base,
            marginTop: 55,
            paddingLeft: spacing.base,
            paddingRight: spacing.base,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: spacing.md,
              }}
            >
              ←
            </button>

            <a href={`/profile/${post.user_id}`}>
              <img
                src={post.profiles?.avatar_url || "/avatar.jpg"}
                alt="Author"
                onClick={() => {
                  if (post.user_id) {
                    maybeShowArticleAuthorPrompt(post.user_id).catch(() => {});
                  }
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  marginRight: spacing.md,
                  cursor: "pointer",
                }}
              />
            </a>

            <div style={{ flex: 1, marginRight: spacing.sm }}>

        <h1 style={{
                  fontSize: fontSize.lg,
                  fontWeight: "400",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: theme.text,
                }}>
          {typeof window !== "undefined" && window.innerWidth < 768
            ? (post?.title.slice(0, 0) || "").split(" ").slice(0, 30).join(" ") +
              ((post?.title || "").split(" ").length > 30 ? "..." : "")
            : post?.title || ""}
        </h1>
              {/*<h1
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: "400",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: theme.text,
                }}
              >
                {post?.title || ""}
              </h1> */}


            </div>
          </div>

          {/* Share and Report buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            <button
              onClick={handleShare}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: spacing.md,
                color: theme.icon,
                fontSize: fontSize.base,
              }}
            >
              <IoShareSocialOutline size={22} color="#fff" />
            </button>

            <button
              onClick={() => {
                setReportParams({
                  contentId: post.id,
                  contentType: "post",
                  reportedUserId: post.user_id,
                });
                setShowReportModal(true);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: spacing.md,
                color: theme.icon,
                fontSize: fontSize.base,
              }}
            >
              <IoFlagOutline size={20} color="#fff" />
            </button>
          </div>
        </div>

        {/* Enforcement banner */}
        <EnforcementBanner
          postId={post.id}
          postType={post.post_type as "article" | "video" | "podcast" | "forum"}
          onStatusChange={(active) => setContentRestricted(active)}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
          }}
        >
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt="Post cover"
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                marginBottom: spacing.base,
              }}
            />
          )}

          <div style={{ padding: spacing.base, backgroundColor: theme.background }}>
            <h2
              style={{
                fontSize: fontSize.xl2,
                fontWeight: "500",
                marginBottom: spacing.md,
                color: theme.text,
              }}
            >
              {post.title}
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: spacing.sm,
              }}
            >
              <span
                style={{
                  fontSize: fontSize.base,
                  color: theme.secondaryText,
                }}
              >
                By{" "}
                {post.profiles?.full_name ||
                  post.profiles?.username ||
                  authorName ||
                  "Unknown Author"}
              </span>
              {post.profiles?.is_verified && (
                <span style={{ marginLeft: spacing.xs, color: "#00BFFF" }}>✓</span>
              )}
            </div>




            {post.category && (
              <p
                style={{
                  fontSize: fontSize.md,
                  marginBottom: spacing.base,
                  textTransform: "capitalize",
                  color: theme.accent,
                }}
              >
                {post.category}
              </p>
            )}

 {Array.isArray(formatted) ? (
  formatted.map((para, index) => (
    <p
      key={index}
      style={{
        marginBottom: "16px",
        fontSize: "18px",
        lineHeight: "28px",
        color: theme.background === "#ffffff" ? "#1e293b" : "#cbd5e1",
      }}
    >
      {para}
    </p>
  ))
) : (
  <p
    style={{
      fontSize: "18px",
      lineHeight: "32px",
      color: "#1e293b",
    }}
  >
    {formatted}
  </p>
)}

            <p
              style={{
                fontSize: fontSize.lg,
                lineHeight: "26px",
                marginBottom: spacing.base,
                fontWeight: "400",
                color: theme.text,
              }}
         //     dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>

          <hr
            style={{
              backgroundColor: theme.border,
              marginTop: spacing.base,
              marginBottom: spacing.base,
              border: "none",
              height: 1,
            }}
          />

          {/* Comments section */}
          <div style={{ marginTop: spacing.base }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: spacing.base,
              }}
            >
              <img
                src={userProfile?.avatar_url || "/avatar.jpg"}
                alt="Your avatar"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  marginRight: spacing.sm,
                }}
              />
              <span
                style={{
                  fontWeight: "400",
                  fontSize: fontSize.base,
                  color: theme.text,
                }}
              >
                {userProfile?.full_name || userProfile?.username || "You"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: spacing.sm,
                marginBottom: 27,
              }}
            >
              <input
                type="text"
                style={{
                  flex: 1,
                  border: `0.5px solid ${theme.border}`,
                  backgroundColor: theme.cardBackground,
                  borderRadius: radius.md,
                  paddingTop: spacing.sm,
                  paddingBottom: spacing.sm,
                  paddingLeft: spacing.base,
                  paddingRight: spacing.base,
                  height: 43,
                  fontSize: fontSize.md2,
                  marginRight: spacing.sm,
                  color: theme.text,
                }}
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting || contentRestricted}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !submitting) {
                    handleSubmitComment();
                  }
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim() || contentRestricted}
                style={{
                  opacity: submitting || !newComment.trim() || contentRestricted ? 0.5 : 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#00BFFF",
                  fontSize: fontSize.base,
                }}
              >
                Send
              </button>
            </div>

            <h3
              style={{
                fontWeight: "400",
                fontSize: fontSize.base,
                marginTop: spacing.base,
                marginBottom: spacing.sm,
                color: theme.text,
              }}
            >
              Feedbacks ({comments.length})
            </h3>

            {loadingComments ? (
              <p style={{ color: theme.secondaryText, marginBottom: spacing.md }}>
                Loading comments...
              </p>
            ) : comments.length === 0 ? (
              <p style={{ color: theme.secondaryText, marginBottom: spacing.md }}>
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.slice(0, 5).map((comment, idx) => (
                <div key={comment.id}>
                  {idx > 0 && (
                    <hr
                      style={{
                        backgroundColor: theme.border,
                        opacity: 0.4,
                        border: "none",
                        height: 1,
                        margin: `${spacing.sm} 0`,
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: spacing.base,
                    }}
                  >
                    <img
                      src={comment.profiles?.avatar_url || "/avatar.jpg"}
                      alt="Commenter"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        marginRight: spacing.sm,
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span
                        style={{
                          fontWeight: "400",
                          fontSize: fontSize.base,
                          color: theme.text,
                        }}
                      >
                        {comment.profiles?.full_name ||
                          comment.profiles?.username ||
                          "Anonymous"}
                      </span>
                      {comment.profiles?.is_verified && (
                        <VerificationBadge size={12} />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: fontSize.sm,
                        fontWeight: "400",
                        marginLeft: spacing.sm,
                        color: theme.secondaryText,
                      }}
                    >
                      {new Date(comment.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => handleToggleCommentLike(comment.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          color: commentLikes[comment.id]
                            ? theme.accent
                            : theme.icon,
                        }}
                      >
                        👍
                      </span>
                      <span
                        style={{
                          marginLeft: spacing.xs,
                          fontSize: fontSize.sm2,
                          color: theme.secondaryText,
                          minWidth: 18,
                          textAlign: "right",
                        }}
                      >
                        {typeof comment.like_count === "number"
                          ? comment.like_count
                          : 0}
                      </span>
                    </button>
                  </div>

                  <p
                    style={{
                      marginTop: spacing.sm,
                      fontSize: fontSize.md,
                      lineHeight: "21px",
                      marginBottom: spacing.lg,
                      color: theme.text,
                    }}
                  >
                    {comment.content.replace(/^\[reply-to:(.+?)\]\s+/, "")}
                  </p>

                  <div style={{ display: "flex", marginBottom: spacing.md }}>
                    <button
                      onClick={() => setReplyTargetId(comment.id)}
                      style={{
                        marginRight: spacing.base,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: theme.accent,
                      }}
                    >
                      Reply
                    </button>
                    {userProfile?.id && comment.user_id === userProfile.id && (
                      <button
                        onClick={() => handleDeleteCommentLocal(comment.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#FF3B30",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {replyTargetId === comment.id && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: spacing.md,
                      }}
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        style={{
                          flex: 1,
                          border: `0.5px solid ${theme.border}`,
                          backgroundColor: theme.cardBackground,
                          borderRadius: radius.xl2,
                          paddingLeft: spacing.base,
                          paddingRight: spacing.base,
                          paddingTop: 11,
                          paddingBottom: 11,
                          marginRight: spacing.sm,
                          color: theme.text,
                        }}
                      />
                      <button
                        onClick={handleReply}
                        disabled={submitting}
                        style={{
                          backgroundColor: theme.accent,
                          paddingLeft: spacing.md,
                          paddingRight: spacing.md,
                          paddingTop: 11,
                          paddingBottom: 11,
                          borderRadius: radius.xl2,
                          opacity: submitting ? 0.6 : 1,
                          border: "none",
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {(repliesMap[comment.id] || []).length > 0 && (
                    <hr
                      style={{
                        backgroundColor: theme.border,
                        opacity: 0.4,
                        border: "none",
                        height: 1,
                        marginTop: spacing.xs,
                        marginBottom: spacing.sm,
                        marginLeft: 38,
                      }}
                    />
                  )}

                  {(repliesMap[comment.id] || []).map((reply, rIdx) => (
                    <div
                      key={reply.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        marginTop: spacing.sm,
                        marginLeft: 38,
                        paddingTop: spacing.sm,
                        borderTopWidth: rIdx > 0 ? 1 : 0,
                        borderTopColor: theme.border,
                      }}
                    >
                      <img
                        src={reply.profiles?.avatar_url || "/avatar.jpg"}
                        alt="Reply author"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          marginRight: spacing.sm,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <span
                            style={{
                              fontWeight: "500",
                              fontSize: fontSize.sm2,
                              color: theme.text,
                            }}
                          >
                            {reply.profiles?.full_name ||
                              reply.profiles?.username ||
                              "Anonymous"}
                          </span>
                          {reply.profiles?.is_verified && (
                            <VerificationBadge size={10} />
                          )}
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() =>
                              handleToggleReplyLike(reply.id, comment.id)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                color: commentLikes[reply.id]
                                  ? theme.accent
                                  : theme.icon,
                              }}
                            >
                              👍
                            </span>
                            <span
                              style={{
                                marginLeft: spacing.xs,
                                fontSize: fontSize.sm,
                                color: theme.secondaryText,
                                minWidth: 16,
                                textAlign: "right",
                              }}
                            >
                              {typeof reply.like_count === "number"
                                ? reply.like_count
                                : 0}
                            </span>
                          </button>
                          {userProfile?.id &&
                            reply.user_id === userProfile.id && (
                              <button
                                onClick={() =>
                                  handleDeleteCommentLocal(reply.id)
                                }
                                style={{
                                  marginLeft: spacing.md,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#FF3B30",
                                }}
                              >
                                Delete
                              </button>
                            )}
                        </div>
                        <p
                          style={{
                            marginTop: 3,
                            fontSize: fontSize.sm2,
                            color: theme.text,
                          }}
                        >
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            <button
              onClick={() => setShowCommentModal(true)}
              style={{
                backgroundColor: theme.cardBackground,
                border: "none",
                padding: spacing.md,
                borderRadius: radius.full,
                cursor: "pointer",
                marginTop: spacing.lg,
                marginBottom: spacing.lg,
                width: "100%",
                color: theme.text,
              }}
            >
              See All Responses
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCommentModal && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          contentId={post.id}
          contentType={(post.post_type as "article" | "podcast" | "video" | "community" | "community_post" | "verse") || "article"}
        />
      )}

      {showReportModal && userProfile && userProfile.id && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportParams(null);
          }}
          contentId={reportParams?.contentId || post.id}
          contentType={reportParams?.contentType || "comment"}
          reportedUserId={reportParams?.reportedUserId || post.user_id}
          reporterUserId={userProfile.id}
        />
      )}

      <FollowPromptModal
        user={followPromptUser}
        visible={showFollowPrompt}
        following={followingArticleAuthor}
        onFollow={handleArticleFollowFromPrompt}
        onDismiss={() => {
          setShowFollowPrompt(false);
          setFollowPromptUser(null);
        }}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { postId } = context.params as {
      postId: string;
    };

    const { data: post, error } = await supabase
      .from("posts")
      .select("*, profiles:user_id(*)")
      .eq("id", postId)
      .maybeSingle();

    if (error || !post) {
      return {
        notFound: true,
      };
    }

    // Normalize profiles from array to single object if needed
    if (Array.isArray(post.profiles)) {
      post.profiles = post.profiles[0];
    }

    // Fetch author name
    let authorName = "";
    if (post.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", post.user_id)
        .maybeSingle();
      authorName = profile?.full_name || profile?.username || "";
    }

    // Increment view count
    await supabase
      .from("posts")
      .update({
        view_count: (post.view_count || 0) + 1,
      })
      .eq("id", postId);

    return {
      props: {
        post,
        authorName,
      },
    };
  } catch (error) {
    console.error("Error loading post:", error);

    return {
      notFound: true,
    };
  }
};