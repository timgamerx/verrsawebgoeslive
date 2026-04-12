// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { useTheme } from "../context/ThemeProvider";

interface OnboardingProps {
  navigation: any;
}

const Onboarding: React.FC<OnboardingProps> = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const handleContinue = () => {
    router.push('/onboardingstep2');
  };

  const handleSkip = () => {
    router.push('/auth');
  };

  const renderImage = () => {
    if (imageError) {
      return (
        <div style={{ ...styles.image, ...styles.imagePlaceholder }}>
          <span style={styles.placeholderSubtext}>Verrsa</span>
        </div>
      );
    }

    return (
      <img
        src={"/assets/onboarding-image.png"}
        style={styles.image}
        onError={() => setImageError(true)}
        alt="Onboarding"
      />
    );
  };

  return (
    <div style={{ ...styles.container, backgroundColor: theme.background }}>
      {renderImage()}

      <AppText style={{ ...styles.title, color: theme.text }}>
        Write, Post, Live, Earn
      </AppText>

      <AppText style={{ ...styles.subtitle, color: theme.secondaryText }}>
        Monetization-first creator platform for emerging creators. Write. Post. Go live. Monetize. All in one place.
      </AppText>

      <button style={styles.continueButton} onClick={handleContinue}>
        <AppText style={styles.continueText}>Continue</AppText>
      </button>

      <button onClick={handleSkip}>
        <AppText style={{ ...styles.skipText, color: theme.text }}>Skip</AppText>
      </button>
    </div>
  );
};

export default Onboarding;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: spacing.xl2,
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "100vh",
    maxWidth: 480,
    margin: "0 auto",
  },
  image: {
    width: 280,
    height: 280,
    objectFit: "contain",
    marginBottom: 25,
    alignSelf: "center",
  },

  imagePlaceholder: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eef9ff",
    borderRadius: radius.xl2,
  },
  placeholderSubtext: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: "#23C9FF",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "left",
    lineHeight: 36,
    marginBottom: spacing.xs,
    maxWidth: 400,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "left",
    marginBottom: 90,
    letterSpacing: 0.1,
    lineHeight: 26,
    fontWeight: "300",
    maxWidth: 400,
  },
  continueButton: {
    backgroundColor: "#23C9FF",
    width: "100%",
    maxWidth: 400,
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.base,
    cursor: "pointer",
    border: "none",
  },
  continueText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  skipText: {
    fontSize: 18,
    cursor: "pointer",
    textDecoration: "underline",
  },
};
