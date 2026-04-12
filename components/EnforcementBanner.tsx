import React, { useEffect, useState } from "react";
import { supabase } from "../components/supabase";

type PostType = "article" | "podcast" | "video" | "forum";
type CommentScope = "regular" | "community";

interface EnforcementBannerProps {
  postId?: string;
  postType?: PostType;
  commentId?: string;
  commentScope?: CommentScope;
  onStatusChange?: (active: boolean) => void;
}

export default function EnforcementBanner(props: EnforcementBannerProps) {
  const { postId, postType, commentId, commentScope, onStatusChange } = props;
  const [title, setTitle] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [action, setAction] = useState<
    "none" | "under_review" | "blocked" | "removed"
  >("none");

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const isPost = !!postId && !!postType;
    const isComment = !!commentId && !!commentScope;

    const check = async () => {
      try {
        if (isPost) {
          const { data } = await supabase
            .from("post_enforcement_view")
            .select("enforcement_action, title, message, content, description")
            .eq("post_id", postId!)
            .eq("post_type", postType!)
            .maybeSingle();
          if (data) {
            setAction((data.enforcement_action as any) || "none");
            setTitle((data as any).title || null);
            setMessage((data as any).message || null);
            setContent((data as any).content || null);
            setDescription((data as any).description || null);
            onStatusChange?.(data.enforcement_action !== "none");
          } else {
            setAction("none");
            setTitle(null);
            setMessage(null);
            setContent(null);
            setDescription(null);
            onStatusChange?.(false);
          }
        } else if (isComment) {
          const { data } = await supabase
            .from("comment_enforcement_view")
            .select("enforcement_action, title, message, content, description")
            .eq("comment_id", commentId!)
            .eq("comment_scope", commentScope!)
            .maybeSingle();
          if (data) {
            setAction((data.enforcement_action as any) || "none");
            setTitle((data as any).title || null);
            setMessage((data as any).message || null);
            setContent((data as any).content || null);
            setDescription((data as any).description || null);
            onStatusChange?.(data.enforcement_action !== "none");
          } else {
            setAction("none");
            setTitle(null);
            setMessage(null);
            setContent(null);
            setDescription(null);
            onStatusChange?.(false);
          }
        }
      } catch (err) {
        // fail silently
      }
    };

    check();

    (async () => {
      if (isPost) {
        channel = supabase
          .channel(`post-enforcement:${postId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "reported_posts",
              filter: `post_id=eq.${postId}`,
            },
            () => check()
          )
          .subscribe();
      } else if (isComment) {
        channel = supabase
          .channel(`comment-enforcement:${commentId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "reported_comments",
              filter: `comment_id=eq.${commentId}`,
            },
            () => check()
          )
          .subscribe();
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [postId, postType, commentId, commentScope, onStatusChange]);

  if (action === "none") return null;

  const bg =
    action === "removed"
      ? "#FFEBEE"
      : action === "blocked"
      ? "#FFF3E0"
      : "#E3F2FD"; // under_review
  const color =
    action === "removed"
      ? "#C62828"
      : action === "blocked"
      ? "#EF6C00"
      : "#1565C0";

  return (
    <div style={{
      border: `1px solid ${color}`,
      borderRadius: 8,
      paddingTop: 10, paddingBottom: 10,
      paddingLeft: 12, paddingRight: 12,
      margin: "0 12px 12px",
      backgroundColor: bg,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color, margin: "0 0 4px" }}>
        {title ||
          (action === "removed"
            ? "Post Removed"
            : action === "blocked"
              ? "Post Blocked"
              : "Post Under Review")}
      </p>
      {!!message && <p style={{ fontSize: 13, marginBottom: 2, color, margin: "0 0 2px" }}>{message}</p>}
      {!!content && <p style={{ fontSize: 12, marginTop: 2, opacity: 0.85, color, margin: "2px 0 0" }}>{content}</p>}
      {!!description && <p style={{ fontSize: 12, marginTop: 2, opacity: 0.85, color, margin: "2px 0 0" }}>{description}</p>}
    </div>
  );
}
