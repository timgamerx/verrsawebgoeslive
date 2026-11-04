// @ts-nocheck
import React from "react";
import { IoLockClosed } from "react-icons/io5";
import { spacing, radius, fontSize } from "../lib/theme";

const preview = (body: string) =>
  (body || "").replace(/\s+/g, " ").trim().slice(0, 110);

export default function NewsletterCard({ item, locked, isPaid, theme, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{
        ...s.card,
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <div style={s.authorRow}>
        <img src="/assets/verrsa-icon9.png" alt="Verrsa" style={s.authorIcon} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fontSize.base, fontWeight: 700, color: theme.text }}>
            Verrsa
          </div>
          <div style={{ color: theme.secondaryText, fontSize: fontSize.sm }}>
            {new Date(item.sent_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        {locked ? (
          <div style={s.pill}>
            <IoLockClosed size={12} color="#fff" />
            <span style={s.pillText}>Basic / Premium</span>
          </div>
        ) : !isPaid ? (
          <div style={{ ...s.pill, backgroundColor: "#34c759" }}>
            <span style={s.pillText}>Free</span>
          </div>
        ) : null}
      </div>

      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          style={{ ...s.cover, filter: locked ? "blur(12px)" : "none" }}
        />
      ) : null}

      <div style={{ padding: spacing.md }}>
        <div
          style={{
            fontSize: fontSize.lg,
            fontWeight: 600,
            marginBottom: 6,
            color: theme.text,
          }}
        >
          {item.subject}
        </div>
        <div
          style={{
            color: theme.secondaryText,
            fontSize: fontSize.md,
            lineHeight: "20px",
          }}
        >
          {locked
            ? "Upgrade to Basic or Premium to read this newsletter"
            : preview(item.body)}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: radius.lg,
    border: "1px solid",
    overflow: "hidden",
    marginBottom: spacing.base,
    cursor: "pointer",
  },
  authorRow: { display: "flex", alignItems: "center", padding: spacing.md },
  authorIcon: { width: 38, height: 38, borderRadius: 19, marginRight: spacing.md },
  cover: { width: "100%", height: 170, objectFit: "cover", display: "block" },
  pill: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#ff9500",
    padding: "3px 8px",
    borderRadius: 12,
    gap: 4,
  },
  pillText: { color: "#fff", fontSize: 11, fontWeight: 600 },
};
