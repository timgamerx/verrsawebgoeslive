// @ts-nocheck
import React from "react";
import { spacing, radius } from "../lib/theme";

/** 6-digit two-factor confirmation dialog (used before withdrawals). */
export default function TwoFactorModal({ theme, code, setCode, busy, onCancel, onVerify }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          borderRadius: radius.md,
          padding: spacing.lg,
          width: "100%",
          maxWidth: 400,
          backgroundColor: theme.cardBackground,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: theme.text }}>
          Two-factor verification
        </div>
        <div style={{ fontSize: 14, marginBottom: spacing.md, color: theme.secondaryText }}>
          Enter your 6-digit code to confirm this withdrawal.
        </div>
        <input
          placeholder="000000"
          maxLength={6}
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: `1px solid ${theme.border}`,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 20,
            textAlign: "center",
            letterSpacing: 6,
            marginBottom: spacing.md,
            color: theme.text,
            backgroundColor: theme.background,
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 15,
              background: "none",
              border: `1px solid ${theme.border}`,
              color: theme.text,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onVerify}
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              backgroundColor: "#00bfff",
              color: "#000",
            }}
          >
            Verify &amp; Submit
          </button>
        </div>
      </div>
    </div>
  );
}
