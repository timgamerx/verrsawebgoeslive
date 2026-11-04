// @ts-nocheck
import React from "react";
import { spacing, radius } from "../lib/theme";

export default function TipCard({ tip, theme }) {
  const name = tip.sender?.full_name || tip.sender?.username || "A supporter";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.cardBackground,
        marginBottom: spacing.sm,
      }}
    >
      <img
        src={tip.sender?.avatar_url || "/avatar.jpg"}
        alt=""
        style={{ width: 42, height: 42, borderRadius: 21, objectFit: "cover", flexShrink: 0 }}
      />
      <div style={{ flex: 1, margin: `0 ${spacing.md}px`, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{name}</div>
        {tip.message ? (
          <div style={{ fontSize: 13, marginTop: 2, color: theme.secondaryText }}>{tip.message}</div>
        ) : null}
        <div style={{ fontSize: 11, marginTop: 4, color: theme.secondaryText }}>
          {new Date(tip.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#34C759" }}>
        +${tip.amount.toFixed(2)}
      </div>
    </div>
  );
}
