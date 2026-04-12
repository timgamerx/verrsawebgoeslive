// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { MdClose, MdSend } from 'react-icons/md';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import {
  getComments,
  createComment,
  toggleCommentLike,
  getCommentLikeStatus,
  createReplyComment,
  deleteComment,
  Comment,
} from './api';
import { supabase } from '../components/supabase';
import ReportContentModal from './ReportContentModal';
import VerificationBadge from './VerificationBadge';
// activityTracker: inline throttled last-active update
let _lastActiveTs = 0;
const updateLastActive = () => {
  const now = Date.now();
  if (now - _lastActiveTs < 60000) return;
  _lastActiveTs = now;
  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user?.id;
    if (uid) supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', uid).then(() => {});
  });
};
import { useTheme } from '../context/ThemeProvider';
import { spacing, radius } from '../lib/theme';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: "article" | "podcast" | "video" | "community" | "community_post" | "verse";
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export default function CommentModal({
  visible,
  onClose,
  contentId,
  contentType,
  onCommentAdded,
  onCommentDeleted,
}: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContext, setReportContext] = useState<{
    contentId: string;
    reportedUserId: string | null;
  } | null>(null);

  // Build a simple replies map from markers in content: [reply-to:<commentId>] text
  const [repliesMap, setRepliesMap] = useState<{ [key: string]: Comment[] }>({});
  const { theme } = useTheme();
  const commentsListRef = useRef<HTMLDivElement>(null);

  // Fetch comments when modal opens
  useEffect(() => {
    if (visible && contentId) {
      fetchComments();
    }
  }, [visible, contentId]);

  useEffect(() => {
    // Get current user id to check ownership for delete
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (e) {
        setCurrentUserId(null);
      }
    };
    loadUser();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(contentId, contentType);

      // Initialize like states with actual status
      const likeStates: { [key: string]: boolean } = {};
      await Promise.all(
        fetchedComments.map(async (comment) => {
          try {
            const liked = await getCommentLikeStatus(comment.id);
            likeStates[comment.id] = !!liked;
          } catch {
            likeStates[comment.id] = false;
          }
        }),
      );
      setCommentLikes(likeStates);

      // Build replies map from content markers
      const map: { [key: string]: Comment[] } = {};
      fetchedComments.forEach((c) => {
        const match = c.content.match(/^\[reply-to:(.+?)\]\s+/);
        if (match) {
          const parentId = match[1];
          c.parent_comment_id = parentId;
          map[parentId] = map[parentId] || [];
          map[parentId].push({
            ...c,
            content: c.content.replace(match[0], ""),
          });
        }
      });
      setRepliesMap(map);

      // Filter out reply comments from the top-level list
      const topLevelComments = fetchedComments.filter(
        (c) => !/^\[reply-to:(.+?)\]\s+/.test(c.content),
      );
      setComments(topLevelComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() === "" || submitting) return;

    setSubmitting(true);
    try {
      // Track user activity
      updateLastActive();

      const createdComment = await createComment(
        contentId,
        contentType,
        newComment,
      );
      if (createdComment) {
        // Call the callback to increment count in parent component
        if (onCommentAdded) {
          onCommentAdded();
        }
        // Refresh comments to get the updated list
        await fetchComments();
        setNewComment("");
        // Auto-scroll to bottom to show new comment
        setTimeout(() => {
          if (commentsListRef.current) {
            commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (commentId: string) => {
    try {
      const wasLiked = commentLikes[commentId];

      // Optimistic update
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: !wasLiked,
      }));

      // Update comment like count optimistically
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                like_count: comment.like_count + (wasLiked ? -1 : 1),
              }
            : comment,
        ),
      );

      const isLiked = await toggleCommentLike(commentId);

      // Update with actual result
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: isLiked,
      }));

      // Refresh comments to get accurate counts
      await fetchComments();
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));
    }
  };

  const handleReply = async () => {
    if (!replyTargetId || replyText.trim() === "" || submitting) return;
    setSubmitting(true);
    try {
      await createReplyComment(
        contentId,
        contentType,
        replyTargetId,
        replyText.trim(),
      );
      // Refresh comments to rebuild threads
      await fetchComments();
      setReplyText("");
      setReplyTargetId(null);
      // Inform parent on new comment
      if (onCommentAdded) onCommentAdded();
    } catch (e) {
      console.error("Error adding reply:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const success = await deleteComment(commentId);
      if (success) {
        await fetchComments();
        if (onCommentDeleted) onCommentDeleted();
      }
    } catch (e) {
      console.error("Error deleting comment:", e);
    }
  };

  return (
    <div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
      <div>
        <div style={{...(styles.modal || {}), backgroundColor: theme.cardBackground}}>
          {/* Header */}
          <div style={{ ...styles.header, borderBottomColor: theme.border }}>
            <span style={{ ...styles.title, color: theme.text }}>{comments.length} comments</span>
            <button onClick={onClose} style={styles.cancelBtn}>
              <MdClose size={24} color={theme.text} />
            </button>
          </div>

          {/* Comment List */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
              </div>
            </div>
          ) : (
            <div ref={commentsListRef} style={{ ...styles.commentsList, paddingBottom: 70 }}>
              {comments.map((item) => (
                <div key={item.id} style={{ ...styles.commentRow, borderBottomColor: theme.border }}>
                  <img
                    src={item.profiles?.avatar_url || "/assets/avatar.jpg"}
                    alt="avatar"
                    style={styles.avatar}
                  />
                  <div style={styles.commentBox}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <span style={{ ...styles.username, color: theme.text }}>
                        {item.profiles?.full_name || item.profiles?.username || "Anonymous"}
                      </span>
                      {item.profiles?.is_verified && <VerificationBadge size={12} />}
                    </div>
                    <span style={{ ...styles.commentText, color: theme.text }}>
                      {item.content.replace(/^\[reply-to:(.+?)\]\s+/, "")}
                    </span>
                    
                    {/* Reply and Delete controls */}
                    <div style={{ display: "flex", flexDirection: "row", marginTop: 6 }}>
                      <button
                        onClick={() => setReplyTargetId(item.id)}
                        style={{ marginRight: 14, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <span style={{ color: "#00bfff", fontFamily: "'Instrument Sans', sans-serif" }}>Reply</span>
                      </button>
                      {currentUserId && item.user_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          <span style={{ color: "#FF3B30", fontFamily: "'Instrument Sans', sans-serif" }}>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Inline reply input for this comment */}
                    {replyTargetId === item.id && (
                      <div style={styles.inlineReplyRow}>
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          style={{ ...styles.inlineReplyInput, borderColor: theme.border, color: theme.text }}
                        />
                        <button
                          onClick={handleReply}
                          style={{
                            ...styles.inlineSendBtn,
                            ...(submitting ? styles.sendBtnDisabled : {})
                          }}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #fff", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                            </div>
                          ) : (
                            <span style={{ color: "#fff", fontFamily: "'Instrument Sans', sans-serif" }}>Send</span>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Render replies for this comment */}
                    {(repliesMap[item.id] || []).map((reply) => (
                      <div key={reply.id} style={{ ...styles.replyRow, borderTopColor: theme.border }}>
                        <img
                          src={reply.profiles?.avatar_url || "/assets/avatar.jpg"}
                          alt="avatar"
                          style={styles.replyAvatar}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                            <span style={{ ...styles.replyUsername, color: theme.text }}>
                              {reply.profiles?.full_name || reply.profiles?.username || "Anonymous"}
                            </span>
                            {reply.profiles?.is_verified && <VerificationBadge size={10} />}
                          </div>
                          <span style={{ ...styles.replyText, color: theme.text }}>{reply.content}</span>
                        </div>
                        <button
                          onClick={() => toggleLike(reply.id)}
                          style={{ display: "flex", flexDirection: "row", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {commentLikes[reply.id] ? (
                            <IoHeart size={16} color="#FF3B30" />
                          ) : (
                            <IoHeartOutline size={16} color={theme.secondaryText} />
                          )}
                          <span style={{ ...styles.replyLikeCount, color: theme.secondaryText }}>
                            {typeof reply.like_count === "number" ? reply.like_count : 0}
                          </span>
                        </button>
                        {currentUserId && reply.user_id === currentUserId && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer" }}
                          >
                            <span style={{ color: "#FF3B30", fontFamily: "'Instrument Sans', sans-serif" }}>Delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => toggleLike(item.id)}
                    style={{ display: "flex", flexDirection: "row", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {commentLikes[item.id] ? (
                      <IoHeart size={18} color="#FF3B30" />
                    ) : (
                      <IoHeartOutline size={18} color={theme.secondaryText} />
                    )}
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 13,
                        color: theme.secondaryText,
                        minWidth: 18,
                        textAlign: "right",
                        fontFamily: "'Instrument Sans', sans-serif",
                      }}
                    >
                      {typeof item.like_count === "number" ? item.like_count : 0}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div style={{ ...styles.inputRow, borderTopColor: theme.border, backgroundColor: theme.cardBackground }}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{ ...styles.input, borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
            />
            <button
              onClick={handleAddComment}
              style={{
                ...styles.sendBtn,
                ...(submitting ? styles.sendBtnDisabled : {})
              }}
              disabled={submitting}
            >
              {submitting ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #fff", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <span style={{ color: "#fff", fontFamily: "'Instrument Sans', sans-serif" }}>Send</span>
              )}
            </button>
          </div>
        </div>
      </div>
      {showReportModal && reportContext && currentUserId && (
        <ReportContentModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentId={reportContext.contentId}
          contentType="comment"
          reportedUserId={reportContext.reportedUserId || ""}
          reporterUserId={currentUserId}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    display: "flex",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
    height: "65%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottom: "1px solid",
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  commentsList: {
    flex: 1,
    overflowY: "auto",
  },
  commentRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderBottom: "1px solid",
    borderBottomColor: "#f2f2f2",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    marginRight: 10,
    objectFit: "cover",
  },
  commentBox: {
    flex: 1,
    marginBottom: 5,
    marginTop: 7,
  },
  username: {
    fontWeight: "500",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  commentText: {
    marginTop: 3,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  inputRow: {
    position: "absolute",
    bottom: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTop: "1px solid",
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    width: "100%",
  },
  inlineReplyRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  inlineReplyInput: {
    flex: 1,
    border: "1px solid",
    borderColor: "#ddd",
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  inlineSendBtn: {
    backgroundColor: "#00bfff",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
  },
  replyRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1px solid",
    borderTopColor: "#f2f2f2",
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    marginRight: 8,
    objectFit: "cover",
  },
  replyUsername: {
    fontWeight: "500",
    fontSize: 13,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  replyText: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  replyLikeCount: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
    minWidth: 16,
    textAlign: "right",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  input: {
    flex: 1,
    border: "1px solid",
    borderColor: "#ddd",
    borderRadius: 20,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: 10,
    marginBottom: 20,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  sendBtn: {
    backgroundColor: "#00bfff",
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 20,
    marginBottom: 20,
    border: "none",
    cursor: "pointer",
  },
  cancelBtn: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  loadingContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sendBtnDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
};
