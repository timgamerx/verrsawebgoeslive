// @ts-nocheck
import React from "react";
import { spacing, radius } from "../lib/theme";

export const PRESETS = [1, 5, 10, 20, 50];
export const MIN_TIP = 1;
export const MAX_TIP = 1000;

/** Preset chips, custom amount, message and send button for a tip. */
export default function TipForm({
  theme, amount, setAmount, message, setMessage, value, validAmount, sending, onSend,
}) {
  const input = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${theme.border}`,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
    color: theme.text,
    backgroundColor: theme.cardBackground,
    fontFamily: "inherit",
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.base }}>
        {PRESETS.map((p) => {
          const active = amount === String(p);
          return (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 15,
                borderColor: active ? "#00bfff" : theme.border,
                backgroundColor: active ? "#00bfff" : "transparent",
                color: active ? "#000" : theme.text,
              }}
            >
              ${p}
            </button>
          );
        })}
      </div>

      <input
        style={input}
        placeholder="Custom amount (USD)"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        maxLength={7}
      />
      <textarea
        style={{ ...input, minHeight: 80, resize: "vertical" }}
        placeholder="Add a message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={200}
      />

      <button
        onClick={onSend}
        disabled={!validAmount || sending}
        style={{
          width: "100%",
          backgroundColor: "#00bfff",
          color: "#000",
          fontWeight: 700,
          fontSize: 16,
          border: "none",
          borderRadius: 999,
          padding: "14px 0",
          marginTop: spacing.sm,
          cursor: "pointer",
          opacity: !validAmount || sending ? 0.5 : 1,
        }}
      >
        {sending ? "Sending…" : validAmount ? `Send $${value.toFixed(2)}` : "Send Tip"}
      </button>
    </>
  );
}
