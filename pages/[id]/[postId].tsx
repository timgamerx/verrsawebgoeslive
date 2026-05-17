// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { spacing, radius, fontSize } from '../../lib/theme';
import {
  createComment,
  getComments,
  toggleCommentLike,
  getCommentLikeStatus,
  createReplyComment,
  deleteComment,
  incrementViewCount,
} from '../../components/api';
import CommentModal from '../../components/CommentModal';
import ReportContentModal from '../../components/ReportContentModal';
import MetaTags from '../../components/MetaTags';
import { useTheme } from '../../context/ThemeProvider';
import { MdCheck } from 'react-icons/md';
import { MdReport } from 'react-icons/md';
import EnforcementBanner from '../../components/EnforcementBanner';
import VerificationBadge from '../../components/VerificationBadge';
import { supabase } from '../../components/supabase';
import { FiSend, FiShare2 } from 'react-icons/fi';
import SharePostModal from '../../components/SharePostModal.web';
import { TbChevronLeft } from 'react-icons/tb';
import { IoThumbsUp, IoThumbsUpOutline } from 'react-icons/io5';
import FollowPromptModal, {
  shouldShowFollowPrompt,
  markFollowPromptShown,
} from '../../components/FollowPromptModal';

// Helper function to parse and render formatted text
const renderFormattedText = (text: string, textStyle: any): React.ReactNode => {
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
        <span key={key++} style={textStyle}>
          {normalizedText.substring(lastIndex, match.index)}
        </span>,
      );
    }

    const matchedText = match[0];

    // Check if it's bold (**text**)
    if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
      parts.push(
        <span key={key++} style={{...(textStyle || {}), fontWeight: "bold"}}>
          {matchedText.slice(2, -2)}
        </span>,
      );
    }
    // Check if it's italic (*text*)
    else if (matchedText.startsWith("*") && matchedText.endsWith("*")) {
      parts.push(
        <span key={key++} style={{...(textStyle || {}), fontStyle: "italic"}}>
          {matchedText.slice(1, -1)}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < normalizedText.length) {
    parts.push(
      <span key={key++} style={textStyle}>
        {normalizedText.substring(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? (
    parts
  ) : (
    <span style={textStyle}>{normalizedText}</span>
  );
};

interface ArticleItem {
  id: string;
  title: string;
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.verrsa.org';

const ArticlePost: React.FC<any> = ({ initialMeta }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = router.query
  const passedArticle = (router.query as any)?.article as ArticleItem | undefined;

  const [article, setArticle] = useState<ArticleItem | null>(passedArticle || null);
  const [loading, setLoading] = useState(!passedArticle);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Comments state - MUST be declared before any conditional returns
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
  // Track like status for each comment
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [repliesMap, setRepliesMap] = useState<
    Record<string, ArticleComment[]>
  >({});

  // State for logged-in user profile
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportParams, setReportParams] = useState<{
    contentId: string;
    contentType: "post" | "comment";
    reportedUserId: string;
  } | null>(null);
  const [contentRestricted, setContentRestricted] = useState(false);

  // ── Follow prompt state ───────────────────────────────────────────────────────
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
        if (data) { articleFollowingSetRef.current.add(authorId); return; }
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
    } catch { /* silent */ }
  };

  const handleArticleFollowFromPrompt = async () => {
    if (!followPromptUser || !userProfile?.id) { setShowFollowPrompt(false); return; }
    setFollowingArticleAuthor(true);
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: userProfile.id,
        following_id: followPromptUser.id,
      });
      if (!error) articleFollowingSetRef.current.add(followPromptUser.id);
    } catch { /* silent */ }
    finally { setFollowingArticleAuthor(false); setShowFollowPrompt(false); setFollowPromptUser(null); }
  };
  // ───────────────────────────────────────────────────────────────────────

  // Track article read time
  const readStartTimeRef = React.useRef<number>(0);

  useEffect(() => {
    if (!article) return;

    // Fetch current user profile from Supabase auth
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setUserProfile(profile || { id: user.id });
      }
    })();
    fetchArticleComments();

    // Start tracking read time
    readStartTimeRef.current = Date.now();

    // Cleanup
    return () => {
      readStartTimeRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, userProfile?.id]);

  // Fetch like status for each comment after comments are loaded
  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  const fetchCommentLikes = async () => {
    const likeStates: { [key: string]: boolean } = {};
    // Top-level comments
    for (const comment of comments) {
      likeStates[comment.id] = await getCommentLikeStatus(comment.id);
      // Replies under this comment
      const replies = repliesMap[comment.id] || [];
      for (const reply of replies) {
        likeStates[reply.id] = await getCommentLikeStatus(reply.id);
      }
    }
    setCommentLikes(likeStates);
  };
  // Handle like toggle for a comment
  const handleToggleCommentLike = async (commentId: string) => {
    // Optimistic update
    setCommentLikes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              like_count:
                (comment.like_count || 0) + (commentLikes[commentId] ? -1 : 1),
            }
          : comment,
      ),
    );
    // Call API
    await toggleCommentLike(commentId);
    // Optionally, refresh like status and count from server
    // await fetchArticleComments();
  };

  // Fetch comments for this article
  const fetchArticleComments = async () => {
    if (!article) return; // Don't fetch if article not loaded
    setLoadingComments(true);
    try {
      const fetched = await getComments(String(article.id), "article");
      // Build replies map and clean markers
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
        replyText.trim(),
      );
      await fetchArticleComments();
      setReplyText("");
      setReplyTargetId(null);
    } catch (e) {
      // silent
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
    // Optimistic update
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
          : r,
      );
      return { ...prev, [parentId]: updated };
    });
    await toggleCommentLike(replyId);
  };

  // Handle comment submit
  const handleSubmitComment = async () => {
    if (!article || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await createComment(String(article.id), "article", newComment.trim());
      setNewComment("");
      await fetchArticleComments();
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch article by id if not passed via state (direct URL / deep link)
  useEffect(() => {
    if (passedArticle) return; // already have it
    if (!id) return;
    const fetchArticle = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*, profiles:user_id(*)")
          .eq("id", id)
          .eq("post_type", "article")
          .single();
        if (error) throw error;
        if (data) setArticle(data);
      } catch (error) {
        console.error("Error fetching article:", error);
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  // Show loading state
  if (loading || !article) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{initialMeta?.title || article?.title || "Post - Verrsa"}</title>
        <meta name="description" content={initialMeta?.description || (article?.content ? article.content.substring(0, 160) : "View this post on Verrsa")} />
        <link rel="canonical" href={initialMeta?.url || `${SITE_URL}/post/${article?.id || ''}`} />
        <meta property="og:type" content={initialMeta?.type || "article"} />
        <meta property="og:site_name" content="Verrsa" />
        <meta property="og:url" content={initialMeta?.url || `${SITE_URL}/post/${article?.id || ''}`} />
        <meta property="og:title" content={initialMeta?.title || article?.title || "Post - Verrsa"} />
        <meta property="og:description" content={initialMeta?.description || (article?.content ? article.content.substring(0, 160) : "View this post on Verrsa")} />
        <meta property="og:image" content={initialMeta?.image || `${SITE_URL}/api/post?id=${encodeURIComponent(article?.id || '')}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {initialMeta?.video ? <meta property="og:video" content={initialMeta.video} /> : null}
        {initialMeta?.video ? <meta property="og:video:secure_url" content={initialMeta.video} /> : null}
        {initialMeta?.video ? <meta property="og:video:type" content="video/mp4" /> : null}
        <meta name="twitter:card" content={initialMeta?.video ? "summary_large_image" : "summary_large_image"} />
        <meta name="twitter:url" content={initialMeta?.url || `${SITE_URL}/post/${article?.id || ''}`} />
        <meta name="twitter:title" content={initialMeta?.title || article?.title || "Post - Verrsa"} />
        <meta name="twitter:description" content={initialMeta?.description || (article?.content ? article.content.substring(0, 160) : "View this post on Verrsa")} />
        <meta name="twitter:image" content={initialMeta?.image || `${SITE_URL}/api/post?id=${encodeURIComponent(article?.id || '')}`} />
      </Head>
      <MetaTags
        title={initialMeta?.title || article?.title || "Article - Verrsa"}
        description={initialMeta?.description || (article?.content ? article.content.substring(0, 160) : "Read this article on Verrsa")}
        image={initialMeta?.image || (article?.id ? `${SITE_URL}/api/post?id=${encodeURIComponent(article.id)}` : article?.cover_image_url)}
        url={initialMeta?.url || `${SITE_URL}/post/${article?.id || ''}`}
        type={initialMeta?.type || "article"}
        video={initialMeta?.video}
      />
      <div style={{ minHeight: "100vh", backgroundColor: theme.background, fontFamily: "'Instrument Sans', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: `${spacing.base}px`,
          paddingTop: "20px",
          gap: "12px",
          position: "sticky",
          top: 0,
          backgroundColor: theme.background,
          zIndex: 10,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
        >
          <TbChevronLeft size={22} color={theme.text} />
        </button>

        <button
          onClick={() => {
            if (article.user_id) {
              maybeShowArticleAuthorPrompt(article.user_id).catch(() => {});
              router.push(`/user/${article.user_id}`);
            }
          }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <img
            src={article.profiles?.avatar_url || "/avatar.jpg"}
            alt="Author"
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.src = "/avatar.jpg"; }}
          />
        </button>

        <span style={{ flex: 1, fontSize: fontSize.base, fontWeight: "500", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {article?.title || ""}
        </span>



{/*share icon here  */}

        <button
          onClick={() => {
            setShowShareModal(true);
          }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
        >
          <FiShare2 size={20} color={theme.secondaryText} />
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
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
        >
          <MdReport size={20} color={theme.secondaryText} />
        </button>
      </div>

      {/* Enforcement banner */}
      <EnforcementBanner
        postId={article.id}
        postType={"article"}
        onStatusChange={(active) => setContentRestricted(active)}
      />

      {/* Scrollable content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: `0 ${spacing.base}px ${spacing.base * 4}px` }}>
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={article.title}
            style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: radius.md, marginBottom: `${spacing.base}px` }}
          />
        )}

        <div style={{ padding: `${spacing.base}px 0` }}>
          <h1 style={{ fontSize: fontSize.xl2, fontWeight: "500", color: theme.text, marginBottom: `${spacing.md}px`, lineHeight: 1.3 }}>
            {article.title}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: `${spacing.sm}px` }}>
            <span style={{ fontSize: fontSize.base, color: theme.secondaryText }}>
              By{" "}
              {article.profiles?.full_name ||
                article.profiles?.username ||
                article.user ||
                "Unknown Author"}
            </span>
            {article.profiles?.is_verified && <MdCheck size={14} color="#00BFFF" />}
          </div>

          {article.category && (
            <span style={{ fontSize: fontSize.md, color: theme.accent, textTransform: "capitalize", display: "block", marginBottom: `${spacing.base}px` }}>
              {article.category}
            </span>
          )}

          <div style={{ fontSize: fontSize.lg, lineHeight: 1.7, color: theme.text, marginBottom: `${spacing.base}px` }}>
            {renderFormattedText(article.content || "", { fontSize: fontSize.lg, lineHeight: "1.7", color: theme.text })}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: theme.border, margin: `${spacing.base}px 0` }} />

        {/* Comment input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: `${spacing.base}px` }}>
          <img
            src={userProfile?.avatar_url || "/avatar.jpg"}
            alt="You"
            style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            onError={(e) => { e.currentTarget.src = "/avatar.jpg"; }}
          />
          <span style={{ fontWeight: "400", fontSize: fontSize.base, color: theme.text }}>
            {userProfile?.full_name || userProfile?.username || "You"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "27px" }}>
          <input
            style={{
              flex: 1,
              border: `0.5px solid ${theme.border}`,
              backgroundColor: theme.cardBackground,
              borderRadius: `${radius.md}px`,
              padding: `${spacing.sm}px ${spacing.base}px`,
              height: 43,
              fontSize: `${fontSize.md2}px`,
              color: theme.text,
              outline: "none",
              fontFamily: "'Instrument Sans', sans-serif",
            }}
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting || contentRestricted}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmitComment(); }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim() || contentRestricted}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: submitting || !newComment.trim() || contentRestricted ? 0.4 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <FiSend size={20} color={theme.accent} />
          </button>
        </div>

        <p style={{ fontWeight: "400", fontSize: `${fontSize.base}px`, marginTop: `${spacing.base}px`, marginBottom: `${spacing.sm}px`, color: theme.text }}>
          Feedbacks ({comments.length})
        </p>

        {/* Comments list */}
        {loadingComments ? (
          <p style={{ color: theme.secondaryText }}>Loading comments...</p>
        ) : (
          comments.slice(0, 5).map((comment, idx) => (
            <div key={comment.id}>
              {idx > 0 && (
                <div style={{ height: 1, backgroundColor: theme.border, margin: `${spacing.sm}px 0`, opacity: 0.4 }} />
              )}
              {/* Comment header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: `${spacing.base}px` }}>
                <button
                  onClick={() => comment.user_id && router.push(`/user/${comment.user_id}`)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <img
                    src={comment.profiles?.avatar_url || "/avatar.jpg"}
                    alt=""
                    style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.src = "/avatar.jpg"; }}
                  />
                </button>
                <span style={{ fontWeight: "400", fontSize: `${fontSize.base}px`, color: theme.text }}>
                  {comment.profiles?.full_name || comment.profiles?.username || "Anonymous"}
                </span>
                {comment.profiles?.is_verified && <VerificationBadge size={12} />}
                <span style={{ fontSize: `${fontSize.sm}px`, color: theme.secondaryText, marginLeft: `${spacing.sm}px` }}>
                  {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => handleToggleCommentLike(comment.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {commentLikes[comment.id]
                    ? <IoThumbsUp size={14} color={theme.accent} />
                    : <IoThumbsUpOutline size={14} color={theme.secondaryText} />}
                  <span style={{ fontSize: `${fontSize.sm2}px`, color: theme.secondaryText }}>
                    {typeof comment.like_count === "number" ? comment.like_count : 0}
                  </span>
                </button>
              </div>

              {/* Comment content */}
              <p style={{ marginTop: `${spacing.sm}px`, fontSize: `${fontSize.md}px`, lineHeight: "1.5", marginBottom: `${spacing.sm}px`, color: theme.text }}>
                {comment.content.replace(/^\[reply-to:(.+?)\]\s+/, "")}
              </p>

              {/* Reply / Delete */}
              <div style={{ display: "flex", gap: "12px", marginBottom: `${spacing.md}px` }}>
                <button
                  onClick={() => setReplyTargetId(comment.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: `${fontSize.sm2}px` }}
                >
                  Reply
                </button>
                {userProfile?.id && comment.user_id === userProfile.id && (
                  <button
                    onClick={() => handleDeleteCommentLocal(comment.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#FF3B30", fontSize: `${fontSize.sm2}px` }}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Inline reply input */}
              {replyTargetId === comment.id && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: `${spacing.md}px` }}>
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    style={{
                      flex: 1,
                      border: `0.5px solid ${theme.border}`,
                      backgroundColor: theme.cardBackground,
                      borderRadius: "20px",
                      padding: "8px 16px",
                      color: theme.text,
                      outline: "none",
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={submitting}
                    style={{
                      backgroundColor: theme.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      cursor: "pointer",
                      opacity: submitting ? 0.6 : 1,
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  >
                    Send
                  </button>
                </div>
              )}

              {/* Replies */}
              {(repliesMap[comment.id] || []).length > 0 && (
                <div style={{ height: 1, backgroundColor: theme.border, margin: `${spacing.xs}px 0 ${spacing.sm}px 38px`, opacity: 0.4 }} />
              )}
              {(repliesMap[comment.id] || []).map((reply, rIdx) => (
                <div key={reply.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: `${spacing.sm}px`, marginLeft: "38px", paddingTop: rIdx > 0 ? `${spacing.sm}px` : 0, borderTop: rIdx > 0 ? `1px solid ${theme.border}` : "none" }}>
                  <img
                    src={reply.profiles?.avatar_url || "/avatar.jpg"}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    onError={(e) => { e.currentTarget.src = "/avatar.jpg"; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: "500", fontSize: `${fontSize.sm2}px`, color: theme.text }}>
                        {reply.profiles?.full_name || reply.profiles?.username || "Anonymous"}
                      </span>
                      {reply.profiles?.is_verified && <VerificationBadge size={10} />}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => handleToggleReplyLike(reply.id, comment.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                      >
                        {commentLikes[reply.id]
                          ? <IoThumbsUp size={12} color={theme.accent} />
                          : <IoThumbsUpOutline size={12} color={theme.secondaryText} />}
                        <span style={{ fontSize: `${fontSize.sm}px`, color: theme.secondaryText }}>
                          {typeof reply.like_count === "number" ? reply.like_count : 0}
                        </span>
                      </button>
                      {userProfile?.id && reply.user_id === userProfile.id && (
                        <button
                          onClick={() => handleDeleteCommentLocal(reply.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#FF3B30", fontSize: `${fontSize.sm}px`, marginLeft: `${spacing.md}px` }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p style={{ marginTop: "3px", fontSize: `${fontSize.sm2}px`, color: theme.text }}>{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* See All Responses button */}
        <button
          style={{
            width: "100%",
            padding: `${spacing.md}px`,
            borderRadius: "999px",
            backgroundColor: theme.cardBackground,
            border: "none",
            cursor: "pointer",
            margin: `${spacing.lg}px 0`,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
          onClick={() => setShowCommentModal(true)}
        >
          <span style={{ fontWeight: "500", color: theme.text }}>See All Responses</span>
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <SharePostModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={article.title}
          postId={article.id}
          postType="article"
          postUrl={`https://www.verrsa.org/article/${article.id}`}
          description={article.content ? article.content.substring(0, 160) : undefined}
          imageUrl={article.cover_image_url}
        />
      )}

      {/* CommentModal */}
      {showCommentModal && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          contentId={article.id}
          contentType="article"
        />
      )}

      {/* Report Content Modal */}
      {showReportModal && userProfile?.id && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => { setShowReportModal(false); setReportParams(null); }}
          contentId={reportParams?.contentId || article.id}
          contentType={reportParams?.contentType || "post"}
          reportedUserId={reportParams?.reportedUserId || article.user_id}
          reporterUserId={userProfile.id}
        />
      )}

      {/* Follow Prompt Modal */}
      <FollowPromptModal
        user={followPromptUser}
        visible={showFollowPrompt}
        following={followingArticleAuthor}
        onFollow={handleArticleFollowFromPrompt}
        onDismiss={() => { setShowFollowPrompt(false); setFollowPromptUser(null); }}
      />
    </div>
    </>
  );
};

export default ArticlePost;

export async function getServerSideProps(context: any) {
  const { params } = context;
  const section = String(params?.id || 'post').toLowerCase();
  const postId = String(params?.postId || '');

  const fallbackMeta = {
    title: 'Verrsa Post',
    description: 'Discover this post on Verrsa.',
    image: `${SITE_URL}/api/post?id=${encodeURIComponent(postId)}`,
    url: `${SITE_URL}/${section}/${postId}`,
    type: 'article',
    video: null,
  };

  if (!postId) {
    return { props: { initialMeta: fallbackMeta } };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { props: { initialMeta: fallbackMeta } };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('posts')
      .select('id, post_type, title, content, description, cover_image_url, thumbnail_url, video_url')
      .eq('id', postId)
      .maybeSingle();

    if (!data) {
      return { props: { initialMeta: fallbackMeta } };
    }

    const title = (data.title || data.content || 'Verrsa Post').toString();
    const description = (data.description || data.content || 'Discover this post on Verrsa.').toString();
    const image = data.cover_image_url || data.thumbnail_url || `${SITE_URL}/api/post?id=${encodeURIComponent(postId)}`;
    const postType = String(data.post_type || '').toLowerCase();
    const type = postType === 'video' ? 'video.other' : 'article';
    const canonicalSection =
      postType === 'video' ? 'reel' :
      postType === 'podcast' ? 'podcast' :
      postType === 'article' ? 'article' :
      postType === 'verse' ? 'verse' :
      section;

    return {
      props: {
        initialMeta: {
          title: title.length > 120 ? `${title.slice(0, 117)}...` : title,
          description: description.length > 180 ? `${description.slice(0, 177)}...` : description,
          image,
          url: `${SITE_URL}/${canonicalSection}/${postId}`,
          type,
          video: postType === 'video' ? data.video_url || null : null,
        },
      },
    };
  } catch {
    return { props: { initialMeta: fallbackMeta } };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
  },
  headerImage: {
    width: 30,
    height: 30,
    borderRadius: "50%",
  },
  headerTitleContainer: {
    flex: 1,
  },
  authorContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: `${spacing.xs}px`,
  },
  authorName: {
    fontSize: `${fontSize.md}px`,
    fontWeight: "500",
    color: "#333",
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
  },
  content: {
    fontSize: fontSize.lg,
    lineHeight: 26,
    marginBottom: spacing.base,
    fontWeight: "400",
  },
  profileName: {
    fontSize: fontSize.base,
    fontWeight: "400",
    fontFamily: "InstrumentSans-Medium",
  },
  highlight: {
    color: "#00BFFF",
    fontWeight: "400",
    fontFamily: "InstrumentSans-Medium",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
  },
  profileStats: {
    fontSize: fontSize.md,
    fontWeight: 300,
    lineHeight: 20,
    color: "#666",
  },
  articleTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "400",
    alignSelf: "flex-start",
    marginTop: spacing.lg,
  },
  articleSubtitle: {
    fontSize: fontSize.md,
    fontWeight: "300",
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    lineHeight: 20,
    marginBottom: spacing.sm,
    color: "#666",
  },
  articlePublishedTime: {
    fontSize: fontSize.base,
    fontWeight: "300",
    color: "#666",
    alignSelf: "flex-start",
    marginTop: spacing.px,
  },
  feedbacksTime: {
    fontSize: fontSize.sm,
    fontWeight: "400",
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
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  icon: {
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  responseBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  responseText: { fontWeight: "500" },
  coverImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
  },
  contentContainer: {
    padding: spacing.base,
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  articleAuthorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  author: {
    fontSize: fontSize.base,
  },
  category: {
    fontSize: fontSize.md,
    marginBottom: spacing.base,
    textTransform: "capitalize",
  },
};
