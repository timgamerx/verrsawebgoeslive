// @ts-nocheck
import React from "react";
import { useRouter } from "next/router";
import {
  IoHeart, IoHeartOutline, IoChatbubbleOutline, IoShareSocialOutline,
  IoStatsChartOutline, IoChevronForward, IoMic, IoPlay, IoPeople,
} from "react-icons/io5";
import { fontSize } from "../lib/theme";
import { BookmarkButton } from "./BookmarkButton";
import { formatDate } from "../lib/bookmarkHelpers";

export default function BookmarkCardActions({
  item, theme, s, isEnforced, liked, likeCount, onLike, onComment, onShare, onOpenArticle, onOpenPodcast,
}) {
  const router = useRouter();
  const circle = (color, onClick, icon) => (
    <button onClick={onClick} style={{ ...s.readMoreCircle, borderColor: color }}>{icon}</button>
  );
  const muted = { color: theme.secondaryText };

  return (
    <div style={{ ...s.iconRow, opacity: isEnforced ? 0.4 : 1 }}>
      <button style={s.iconBtn} disabled={isEnforced} onClick={onLike}>
        {liked ? <IoHeart size={22} color="#FF2D78" /> : <IoHeartOutline size={22} color={theme.icon} />}
      </button>
      <span style={muted}>{likeCount}</span>

      <IoStatsChartOutline size={18} color={theme.iconSecondary || theme.secondaryText} />
      <span style={muted}>{item.view_count || 0}</span>

      <button style={s.iconBtn} disabled={isEnforced} onClick={onComment}>
        <IoChatbubbleOutline size={18} color={theme.icon} />
      </button>
      <span style={muted}>{item.comment_count || 0}</span>

      <div style={{ pointerEvents: isEnforced ? "none" : "auto", display: "flex" }}>
        <BookmarkButton post={item} />
      </div>

      <button style={s.iconBtn} disabled={isEnforced} onClick={onShare}>
        <IoShareSocialOutline size={18} color={theme.icon} />
      </button>

      <span style={{ ...muted, fontSize: fontSize.sm, marginLeft: "auto" }}>
        {formatDate(item.created_at || item.date) || "08 July"}
      </span>

      {!isEnforced && item.type === "article" && circle("#00BFFF", onOpenArticle, <IoChevronForward size={14} color="#00BFFF" />)}
      {!isEnforced && item.type === "podcast" && circle("#32CD32", onOpenPodcast, <IoMic size={14} color="#32CD32" />)}
      {!isEnforced && item.type === "video" && circle("#FF6347", () => router.push(`/Reels?id=${item.id}`), <IoPlay size={14} color="#FF6347" />)}
      {item.type === "community" && circle("#9B59B6", () => router.push(`/community/${item.id}`), <IoPeople size={14} color="#9B59B6" />)}
    </div>
  );
}
