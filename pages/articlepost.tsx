import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

import { 
IoShareSocialOutline,
IoFlagOutline
} from "react-icons/io5";


import {
  createComment,
  getComments,
  toggleCommentLike,
  getCommentLikeStatus,
  createReplyComment,
  deleteComment,
} from "../components/api";
import CommentModal from "../components/CommentModal";
import ReportContentModal from "../components/ReportContentModal";
import { fetchCurrentUserProfile, UserProfile } from "../lib/profileUtils";
import { trackArticleRead } from "../lib/engagementTracking";
import { useTheme } from "../context/ThemeProvider";
import {
  trackAdImpression,
  checkAdAvailability,
} from "../lib/adImpressionTracking";
import EnforcementBanner from "../components/EnforcementBanner";
import VerificationBadge from "../components/VerificationBadge";
import { supabase } from "../components/supabase";
import FollowPromptModal, {
  shouldShowFollowPrompt,
  markFollowPromptShown,
} from "../components/FollowPromptModal";

// Helper function to parse and render formatted text
const renderFormattedText = (text: string, textClass: string): React.ReactNode => {
  if (!text) return null;

  // Normalize spacing: replace multiple spaces and line breaks
  const normalizedText = text
    .replace(/\n\s*\n/g, "\n\n") // Preserve paragraph breaks
    .replace(/[ \t]+/g, " ") // Replace multiple spaces/tabs with single space
    .trim();

  // Split by markdown-style bold (**text**) and italic (*text*)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(normalizedText)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className={textClass}>
          {normalizedText.substring(lastIndex, match.index)}
        </span>
      );
    }

    const matchedText = match[0];

    // Check if it's bold (**text**)
    if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
      parts.push(
        <strong key={key++} className={textClass}>
          {matchedText.slice(2, -2)}
        </strong>
      );
    }
    // Check if it's italic (*text*)
    else if (matchedText.startsWith("*") && matchedText.endsWith("*")) {
      parts.push(
        <em key={key++} className={textClass}>
          {matchedText.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < normalizedText.length) {
    parts.push(
      <span key={key++} className={textClass}>
        {normalizedText.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span className={textClass}>{normalizedText}</span>;
};

interface ArticleItem {
  id: string;
  title: string;
  excerpt?: string;
  description?: string;
  content?: string;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  user_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  user?: string;
}

const ArticlePost: React.FC = () => {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const rawArticleId = router.query.id;
  const articleId =
    typeof rawArticleId === "string"
      ? rawArticleId
      : Array.isArray(rawArticleId)
      ? rawArticleId[0]
      : undefined;

  const [article, setArticle] = useState<ArticleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState<string>("");

  // Comments state
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

  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [repliesMap, setRepliesMap] = useState<Record<string, ArticleComment[]>>({});

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportParams, setReportParams] = useState<{
    contentId: string;
    contentType: "post" | "comment";
    reportedUserId: string;
  } | null>(null);
  const [contentRestricted, setContentRestricted] = useState(false);

  // Follow prompt state
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

  // Track article read time
  const readStartTimeRef = React.useRef<number>(0);

  // Fetch article on mount or when article ID changes
  useEffect(() => {
    if (!articleId || !router.isReady) return;

    const fetchArticle = async () => {
      try {
        // Try sessionStorage first on web
        try {
          const stored = sessionStorage.getItem(`article_${articleId}`);
          if (stored) {
            const articleData = JSON.parse(stored);
            setArticle(articleData);
            // Fetch author name if possible
            if (articleData.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", articleData.user_id)
                .maybeSingle();
              setAuthorName(profile?.full_name || profile?.username || "");
            }
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log("No cached article data, fetching from database");
        }

        // Fetch from database if not in cache
        const { data, error } = await supabase
          .from("posts")
          .select("*, profiles:user_id(*)")
          .eq("id", articleId)
          .eq("post_type", "article")
          .maybeSingle();

        if (error) throw error;
        if (data) {
          // Normalize profiles from array to single object if needed
          if (Array.isArray(data.profiles)) {
            data.profiles = data.profiles[0];
          }
          setArticle(data);
          // Fetch author name
          if (data.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", data.user_id)
              .maybeSingle();
            setAuthorName(profile?.full_name || profile?.username || "");
          }
        } else {
          alert("Article not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        alert("Failed to load article");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, router.isReady, router]);

  // Load user profile and comments
  useEffect(() => {
    if (!article) return;

    fetchCurrentUserProfile().then(setUserProfile);
    fetchArticleComments();

    // Start tracking read time
    readStartTimeRef.current = Date.now();

    // Track ad impression
    (async () => {
      try {
        const adAvailable = await checkAdAvailability();
        if (adAvailable) {
          await trackAdImpression(
            article.id,
            "article",
            article.user_id,
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

        if (userProfile?.id && article.user_id && readDurationMinutes > 0) {
          trackArticleRead(
            userProfile.id,
            article.id,
            article.user_id,
            readDurationMinutes
          ).catch((err) => console.warn("Failed to track article read:", err));
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, userProfile?.id]);

  // Fetch like status for comments
  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  const fetchCommentLikes = async () => {
    const likeStates: { [key: string]: boolean } = {};
    for (const comment of comments) {
      likeStates[comment.id] = await getCommentLikeStatus(comment.id);
      const replies = repliesMap[comment.id] || [];
      for (const reply of replies) {
        likeStates[reply.id] = await getCommentLikeStatus(reply.id);
      }
    }
    setCommentLikes(likeStates);
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

  const fetchArticleComments = async () => {
    if (!article) return;
    setLoadingComments(true);
    try {
      const fetched = await getComments(String(article.id), "article");
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

  const handleReply = async () => {
    if (!article || !replyTargetId || replyText.trim() === "" || submitting)
      return;
    setSubmitting(true);
    try {
      await createReplyComment(
        article.id,
        "article",
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
    if (!article || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await createComment(String(article.id), "article", newComment.trim());
      setNewComment("");
      alert("Your comment has been posted.");
      await fetchArticleComments();
    } catch (err) {
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      const articleUrl = `https://verrsa.org/${article?.id}`;
      if (navigator.share) {
        await navigator.share({
          title: article?.title,
          text: article?.title,
          url: articleUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(articleUrl);
        alert("Link copied to clipboard");
      }
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  if (loading || !article) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: theme.background,
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{article.title || "Verrsa Article"}</title>
        <meta
          name="description"
          content={
            authorName
              ? `By ${authorName} - ${(article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)}`
              : (article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)
          }
        />
        <meta property="og:title" content={article.title || "Verrsa Article"} />
        <meta
          property="og:description"
          content={
            authorName
              ? `By ${authorName} - ${(article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)}`
              : (article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)
          }
        />
        <meta
          property="og:image"
          content={
            article.cover_image_url && article.cover_image_url.trim() !== ""
              ? article.cover_image_url
              : "https://ik.imagekit.io/te9biwxvl/verrsa-team.png"
          }
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://verrsa.org/${article.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title || "Verrsa Article"} />
        <meta
          name="twitter:description"
          content={
            authorName
              ? `By ${authorName} - ${(article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)}`
              : (article.title || article.excerpt || article.content || "Read this article on Verrsa").slice(0, 160)
          }
        />
        <meta
          name="twitter:image"
          content={
            article.cover_image_url && article.cover_image_url.trim() !== ""
              ? article.cover_image_url
              : "https://ik.imagekit.io/te9biwxvl/verrsa-team.png"
          }
        />
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

            <Link href={`/profile/${article.user_id}`}>
              <img
                src={article.profiles?.avatar_url || "/avatar.jpg"}
                alt="Author"
                onClick={() => {
                  if (article.user_id) {
                    maybeShowArticleAuthorPrompt(article.user_id).catch(() => {});
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
            </Link>

            <div style={{ flex: 1, marginRight: spacing.sm }}>
              <h1
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
                {article?.title || ""}
              </h1>
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
                  contentId: article.id,
                  contentType: "post",
                  reportedUserId: article.user_id,
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
          postId={article.id}
          postType="article"
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
          {article.cover_image_url && (
            <img
              src={article.cover_image_url}
              alt="Article cover"
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
              {article.title}
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
                {article.profiles?.full_name ||
                  article.profiles?.username ||
                  article.user ||
                  "Unknown Author"}
              </span>
              {article.profiles?.is_verified && (
                <span style={{ marginLeft: spacing.xs, color: "#00BFFF" }}>✓</span>
              )}
            </div>

            {article.category && (
              <p
                style={{
                  fontSize: fontSize.md,
                  marginBottom: spacing.base,
                  textTransform: "capitalize",
                  color: theme.accent,
                }}
              >
                {article.category}
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
            >
              {renderFormattedText(article.content || "", "")}
            </p>
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
          contentId={article.id}
          contentType="article"
        />
      )}

      {showReportModal && userProfile && userProfile.id && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportParams(null);
          }}
          contentId={reportParams?.contentId || article.id}
          contentType={reportParams?.contentType || "post"}
          reportedUserId={reportParams?.reportedUserId || article.user_id}
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
};

export default ArticlePost;
