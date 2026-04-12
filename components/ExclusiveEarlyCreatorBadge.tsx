import React, { useState } from "react";
import AppText from "./AppText";
import { useTheme } from "../context/ThemeProvider";
import {
  EARLY_CREATOR_BADGE_DESCRIPTION,
  EARLY_CREATOR_BADGE_TITLE,
} from "../lib/earlyCreatorProgram";

interface ExclusiveEarlyCreatorBadgeProps {
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function ExclusiveEarlyCreatorBadge({
  style,
  compact = false,
}: ExclusiveEarlyCreatorBadgeProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <button
        onClick={() => setVisible(true)}
        style={{
          border: `1px solid ${theme.accent}55`,
          borderRadius: 999,
          padding: compact ? "3px 6px" : "4px 8px",
          marginRight: compact ? 4 : 6,
          backgroundColor: `${theme.accent}16`,
          cursor: "pointer",
          ...style,
        }}
      >
        <span style={{ color: theme.accent, fontSize: compact ? 11 : 13 }}>✦</span>
      </button>

      {visible && (
        <div
          onClick={() => setVisible(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.42)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              backgroundColor: theme.cardBackground,
              borderTop: `1px solid ${theme.border}`,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: "12px 20px 28px",
            }}
          >
            <AppText style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>
              {EARLY_CREATOR_BADGE_TITLE}
            </AppText>
            <AppText style={{ color: theme.text, fontSize: 15, lineHeight: "22px" }}>
              {EARLY_CREATOR_BADGE_DESCRIPTION}
            </AppText>
            <button
              onClick={() => setVisible(false)}
              style={{
                marginTop: 16,
                backgroundColor: theme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export { ExclusiveEarlyCreatorBadge };
