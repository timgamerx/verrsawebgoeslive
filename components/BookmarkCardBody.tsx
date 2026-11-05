// @ts-nocheck
import React from "react";
import { useRouter } from "next/router";
import { spacing, fontSize } from "../lib/theme";
import PromotedBadge from "./PromotedBadge";
import { stripMarkdown, truncateWords } from "../lib/bookmarkHelpers";

const DEFAULT_IMG = "/avatar.jpg";

export default function BookmarkCardBody({
  item, theme, s, enforcement, expandedTitle, onToggleTitle, onOpenArticle, onOpenPodcast,
}) {
  const router = useRouter();
  const isEnforced = !!(enforcement && enforcement.action && enforcement.action !== "none");
  const postImage = item.image || item.image_url || item.cover_image_url;
  const videoUrl = item.video || item.video_url;
  const raw = item.content || item.description || "";
  const clean = stripMarkdown(raw);
  let display = clean;
  if (item.type === "article") display = truncateWords(clean, 25);
  else if (item.type === "podcast") display = truncateWords(clean, 20);
  else if (item.type === "community") display = truncateWords(stripMarkdown(item.description || raw), 10);

  const goCommunity = () => router.push(`/community/${item.id}`);
  const sub = { ...s.postText, color: theme.secondaryText };

  const heading = () => {
    const full = (item.type === "community" ? item.name || item.title : item.title) || "";
    if (item.type !== "video") return <div style={s.postTitle}>{full}</div>;
    const isLong = full.length > 150;
    const shown = isLong && !expandedTitle ? full.slice(0, 150).trimEnd() + "..." : full;
    return (
      <div>
        <div style={s.postTitle}>{shown}</div>
        {isLong && (
          <button style={s.linkBtn} onClick={onToggleTitle}>
            {expandedTitle ? "See less" : "See more"}
          </button>
        )}
      </div>
    );
  };

  if (isEnforced) {
    const label =
      enforcement.title ||
      ({ under_review: "Under Review", blocked: "Blocked", removed: "Removed" }[enforcement.action] || "Restricted");
    const msg =
      enforcement.message ||
      (enforcement.action === "removed"
        ? "This post has been removed for violating our guidelines."
        : "This post is currently blocked and under review.");
    return (
      <>
        {item.type === "video" || item.type === "community" ? heading() : null}
        <div style={s.enforcement}>
          <div style={{ fontSize: fontSize.sm, fontWeight: 700, color: theme.secondaryText, marginBottom: spacing.sm, textTransform: "uppercase" }}>{label}</div>
          <div style={{ color: theme.text, fontSize: fontSize.sm2 }}>{msg}</div>
        </div>
      </>
    );
  }

  if (item.type === "article") {
    return (
      <div style={{ cursor: "pointer" }} onClick={onOpenArticle}>
        <div style={s.postTitle}>{item.title}</div>
        <div style={s.rowContent}>
          <img src={item.image || item.cover_image_url || DEFAULT_IMG} alt="" style={s.thumbnail} />
          <div style={sub}>{display}</div>
        </div>
      </div>
    );
  }

  if (item.type === "podcast") {
    return (
      <div style={{ cursor: "pointer" }} onClick={onOpenPodcast}>
        <div style={s.postTitle}>{item.title}</div>
        <div style={{ ...sub, marginBottom: spacing.sm }}>{display || "No description available"}</div>
        {item.cover_image_url && <img src={item.cover_image_url} alt="" style={s.thumbnail} />}
      </div>
    );
  }

  if (item.type === "community") {
    return (
      <>
        {heading()}
        <div style={{ cursor: "pointer" }} onClick={goCommunity}>
          <div style={sub}>{display}</div>
          <div style={s.communityStats}>
            <span style={{ color: theme.secondaryText, fontSize: fontSize.sm }}>{item.member_count || 0} members</span>
            {item.is_private && <span style={s.privateLabel}>Private</span>}
          </div>
          {postImage && <img src={postImage} alt="" style={s.thumbnail} />}
        </div>
      </>
    );
  }

  if (item.type === "verse") {
    return (
      <div style={{ cursor: "pointer" }} onClick={() => router.push(`/post/${item.id}`)}>
        {item.is_boosted && <PromotedBadge size="small" style={{ marginBottom: spacing.xs }} />}
        <div style={sub}>{display}</div>
        {postImage && <img src={postImage} alt="" style={s.verseImage} />}
      </div>
    );
  }

  // video
  return (
    <>
      {heading()}
      {videoUrl && (
        <video src={videoUrl} poster={item.thumbnail_url || undefined} controls muted playsInline preload="metadata" style={s.video} />
      )}
    </>
  );
}
