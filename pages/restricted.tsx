'use client';

// @ts-nocheck
import React from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { supabase, signOut } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";

type RestrictedRoute = {
  params?: {
    action?: string;
    title?: string;
    message?: string;
    content?: string;
    description?: string;
  };
};

export default function Restricted({
  route,
}: {
  route?: RestrictedRoute;
}) {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const { action, title, message, content, description } = route?.params || {
    action: "restricted",
    title: undefined,
    message: undefined,
    content: undefined,
    description: undefined,
  };

  const onSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push('/home');
    }
  };

  const goToSupport = () => {
    try {
      window.open("mailto:hello@verrsa.org", "_blank");
    } catch (e) {
      // Fallback to in-app support if mail client fails
      router.push('/support');
    }
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      <AppText style={{ ...(styles.title || {}), color: theme.text }}>
        {title ||
          (action === "banned" ? "Account Banned" : "Account Restricted")}
      </AppText>
      <AppText style={{ ...(styles.message || {}), color: theme.secondaryText }}>
        {message ||
          (action === "banned"
            ? "Your account has been banned for violating our terms."
            : "Your account has been temporarily restricted due to unusual activity, appeal if you think this is not right.")}
      </AppText>
      {!!content && (
        <AppText style={{ ...(styles.detail || {}), color: theme.secondaryText }}>
          {content}
        </AppText>
      )}
      {!!description && (
        <AppText style={{ ...(styles.detail || {}), color: theme.secondaryText }}>
          {description}
        </AppText>
      )}

      <div style={{ ...(styles.actions || {}), marginTop: spacing.xl }}>
        <button
          style={{ ...(styles.button || {}), ...(styles.primary || {}) }}
          onClick={goToSupport}
        >
          <AppText style={styles.buttonText}>Contact Support</AppText>
        </button>
        <button
          style={{ ...(styles.button || {}), ...(styles.secondary || {}) }}
          onClick={onSignOut}
        >
          <AppText style={styles.buttonText}>Sign Out</AppText>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl4,
    fontWeight: "700",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: fontSize.xl3,
    textAlign: "center",
    fontWeight: "300",
    lineHeight: 30,
    marginBottom: spacing.md,
  },
  detail: {
    fontSize: fontSize.base,
    textAlign: "center",
    fontWeight: "300",
    lineHeight: 22,
    marginBottom: spacing.sm,
    opacity: 0.75,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderRadius: radius.md,
  },
  primary: {
    backgroundColor: "#00BFFF",
  },
  secondary: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
};
