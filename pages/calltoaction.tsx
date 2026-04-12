// @ts-nocheck
import React from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { IoChevronBack, IoMic, IoPlay, IoThumbsUp } from "react-icons/io5";

export default function CallToAction() {
  const router = useRouter();

  const handleCallToActionSelection = (action: string) => {
    router.push("/audience-details", { state: { action } });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => router.back()}>
          <IoChevronBack size={24} color="#000" />
        </button>
        <AppText style={styles.headerTitle}>Call to Action</AppText>
        <div style={{ width: 24 }} />
      </div>

      <div style={styles.content}>
        <AppText style={styles.title}>Select Call to Action Label</AppText>
        <AppText style={styles.subtitle}>Choose a label shown to your audience.</AppText>

        <button style={styles.option} onClick={() => handleCallToActionSelection("listen_now")}>
          <IoMic size={18} color="#32CD32" />
          <AppText style={styles.optionText}>Listen Now (Podcasts)</AppText>
        </button>

        <button style={styles.option} onClick={() => handleCallToActionSelection("view_now")}>
          <IoPlay size={18} color="#FF6347" />
          <AppText style={styles.optionText}>View Now (Videos)</AppText>
        </button>

        <button style={styles.option} onClick={() => handleCallToActionSelection("like_now")}>
          <IoThumbsUp size={18} color="#00BFFF" />
          <AppText style={styles.optionText}>Like Now (General)</AppText>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: spacing.lg,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    border: "1px solid #ddd",
    borderRadius: radius.full,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.base,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  subtitle: {
    color: "#666",
  },
  option: {
    border: "1px solid #ddd",
    borderRadius: radius.md,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    background: "#fff",
  },
  optionText: {
    fontSize: fontSize.base,
  },
};
