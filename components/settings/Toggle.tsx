// @ts-nocheck
import React from "react";

export default function Toggle({ value, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={!!value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        padding: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: value ? "#00BFFF" : "#e0e0e0",
        display: "flex",
        justifyContent: value ? "flex-end" : "flex-start",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff" }} />
    </button>
  );
}
