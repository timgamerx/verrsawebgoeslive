// @ts-nocheck
import React from "react";
import { FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { spacing, radius, fontSize } from "../lib/theme";

const TYPE_COLOR = {
  article: "#00BFFF",
  podcast: "#32CD32",
  video: "#FF6347",
  verse: "#9B59B6",
};

export default function DeletedPostCard({
  post,
  remaining,
  busy,
  theme,
  onRestore,
  onDelete,
}) {
  const color = TYPE_COLOR[post.post_type] ?? "#00BFFF";
  return (
    <div
      style={{
        ...s.card,
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <div style={s.cardHeader}>
        <div style={{ ...s.typeBadge, backgroundColor: color + "22", color }}>
          {post.post_type.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: fontSize.sm,
            fontWeight: 600,
            color: remaining <= 3 ? "#FF3B30" : theme.secondaryText,
          }}
        >
          {remaining === 0 ? "Expires today" : `${remaining}d left`}
        </div>
      </div>

      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt="" style={s.thumbnail} />
      ) : null}

      <div
        style={{
          fontSize: fontSize.base,
          fontWeight: 500,
          marginBottom: spacing.xs,
          color: theme.text,
        }}
      >
        {post.title || post.content?.substring(0, 80) || "Untitled"}
      </div>
      <div
        style={{
          fontSize: fontSize.sm,
          marginBottom: spacing.md,
          color: theme.secondaryText,
        }}
      >
        Deleted{" "}
        {new Date(post.deleted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>

      <div style={{ display: "flex", gap: spacing.sm }}>
        <button
          disabled={busy}
          onClick={onRestore}
          style={{ ...s.actionBtn, backgroundColor: "#00BFFF", opacity: busy ? 0.6 : 1 }}
        >
          <FiRotateCcw size={14} /> Restore
        </button>
        <button
          disabled={busy}
          onClick={onDelete}
          style={{ ...s.actionBtn, backgroundColor: "#FF3B30", opacity: busy ? 0.6 : 1 }}
        >
          <FiTrash2 size={14} /> Delete Forever
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: radius.lg,
    border: "1px solid",
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  typeBadge: {
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radius.xs,
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  thumbnail: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: "#f0f0f0",
    display: "block",
  },
  actionBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: `${spacing.md}px 0`,
    borderRadius: radius.md,
    border: "none",
    cursor: "pointer",
    color: "#fff",
    fontSize: fontSize.sm2,
    fontWeight: 600,
  },
};
