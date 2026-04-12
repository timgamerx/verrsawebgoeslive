// @ts-nocheck
import React from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize, fontFamily } from "../lib/theme";
import AppText from "../components/AppText";
import { useTheme } from "../context/ThemeProvider";

const OnboardingStep2 = () => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  return (
    <div
      
      
      
      keyboardShouldPersistTaps="handled"
    >
      <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
        {/* Verrsa Logo */}
        <img src={require("../assets/verrsa.png")} style={styles.logo} />

        {/* Title & Subtitle */}
        <AppText style={[styles.title, { color: theme.text }]}>
          Personalize Your Verrsa Experience
        </AppText>
        <AppText style={[styles.subtitle, { color: theme.secondaryText }]}>
          Find people/topics to follow based on your interest
        </AppText>

        {/* Divider Line */}
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        {/* Avatar Image */}
        <img src={require("../assets/avatar1.png")}
          style={styles.avatarGroup}
        />

        {/* Continue Button */}
        <button
          style={styles.continueButton}
          onClick={() => router.push('/auth')}
        >
          <AppText style={styles.continueText}>Continue</AppText>
        </button>

        {/* Skip Button */}
        <button onClick={() => router.push('/auth')}>
          <AppText style={[styles.skipText, { color: theme.text }]}>Skip</AppText>
        </button>
      </div>
    </div>
  );
};

export default OnboardingStep2;

const styles: Record<string, React.CSSProperties> = {
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: spacing.xl3,
    paddingBottom: spacing.xl3,
    minHeight: "100%",
  },
  container: {
    flex: 1,
    paddingLeft: spacing.xl2,
    paddingRight: spacing.xl2,
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 30,
    objectFit: "contain",
    marginTop: spacing.xl2, // 👈 push logo down
    marginBottom: spacing.xl2,
  },
  title: {
    fontSize: fontSize.xl3,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: spacing.sm,
    fontFamily: "InstrumentSans-Bold",
  },
  subtitle: {
    fontSize: fontSize.lg,
    textAlign: "center",
    marginBottom: spacing.lg,
    fontWeight: "300",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: spacing.xl2,
  },
  avatarGroup: {
    width: 330,
    height: 330,
    objectFit: "contain",
    marginBottom: 50,
  },
  continueButton: {
    backgroundColor: "#23C9FF",
    width: "100%",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: spacing.base,
  },
  continueText: {
    color: "#fff",
    fontSize: fontSize.xl,
    fontWeight: "600",
    fontFamily: fontFamily.regular,
  },
  skipText: {
    fontSize: fontSize.xl2,
    fontFamily: fontFamily.regular,
  },
  };
