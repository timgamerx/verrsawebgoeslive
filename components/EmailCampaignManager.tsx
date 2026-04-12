// @ts-nocheck
import React from "react";
import AppText from "./AppText";
import { useTheme } from "../context/ThemeProvider";

export const EmailCampaignManager: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        border: `1px solid ${theme.border || "#ddd"}`,
        borderRadius: 12,
        padding: 16,
        backgroundColor: theme.cardBackground || "#fff",
      }}
    >
      <AppText style={{ color: theme.text, fontWeight: "700", fontSize: 18 }}>
        Email Campaign Manager
      </AppText>
      <AppText style={{ color: theme.secondaryText || theme.text, marginTop: 8 }}>
        Email campaign tools are temporarily simplified for the web migration build.
      </AppText>
    </div>
  );
};

export default EmailCampaignManager;
