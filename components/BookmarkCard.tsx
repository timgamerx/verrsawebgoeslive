// @ts-nocheck
import React from "react";
import { useRouter } from "next/router";
import { spacing, fontSize } from "../lib/theme";
import ExclusiveEarlyCreatorBadge from "./ExclusiveEarlyCreatorBadge";
import PromotedBadge from "./PromotedBadge";
import VerificationBadge from "./VerificationBadge";
import BookmarkCardBody from "./BookmarkCardBody";
import BookmarkCardActions from "./BookmarkCardActions";
import { isExclusiveEarlyCreator } from "../lib/profileUtils";
import { cleanName, formatTime } from "../lib/bookmarkHelpers";

const DEFAULT_AVATAR = "/avatar.jpg";

export default function BookmarkCard(props) {
  const { item, theme, s, enforcement } = props;
  const router = useRouter();
  const isEnforced = !!(enforcement && enforcement.action && enforcement.action !== "none");

  const userName =
    item.type === "community"
      ? cleanName(item.name, "Community") || "Community"
      : cleanName(item.profiles?.full_name || item.profiles?.username || item.username, item.user) || "Unknown User";
  const postTime =
    formatTime(item.type === "podcast" ? item.created_at : item.time || item.created_at) || "8:00 am";
  const avatar =
    item.type === "community"
      ? item.avatar_url || item.cover_image_url
      : item.profiles?.avatar_url || item.profile?.avatar_url || item.userAvatar || item.avatar_url;

  return (
    <div style={s.postContainer}>
      <div style={s.postHeader}>
        <img
          src={avatar && typeof avatar === "string" ? avatar : DEFAULT_AVATAR}
          alt=""
          style={{ ...s.avatar, cursor: item.user_id ? "pointer" : "default" }}
          onClick={() => item.user_id && router.push(`/user/${item.user_id}`)}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR;
          }}
        />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ ...s.username, color: theme.text }}>{userName}</span>
          {isExclusiveEarlyCreator(item.profiles) && <ExclusiveEarlyCreatorBadge compact />}
          {(item.profiles?.is_verified || item.is_verified) && <VerificationBadge size={14} />}
          {item.is_boosted && <PromotedBadge size="small" style={{ marginLeft: spacing.sm }} />}
        </div>
        <span style={{ color: theme.secondaryText, fontSize: fontSize.sm }}>{postTime}</span>
      </div>

      <BookmarkCardBody {...props} />
      <BookmarkCardActions {...props} isEnforced={isEnforced} />
    </div>
  );
}
