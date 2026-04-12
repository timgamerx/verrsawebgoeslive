'use client';

// @ts-nocheck
import React, { useState } from "react";
import { Entypo, Image } from '../lib/reactNativeShim';
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";

const icons = [
  { id: 1, name: "verrsa-icon", path: require("../assets/verrsa-icon.png") },
  { id: 2, name: "verrsa-icon2", path: require("../assets/verrsa-icon2.png") },
  { id: 3, name: "verrsa-icon3", path: require("../assets/verrsa-icon3.png") },
  { id: 4, name: "verrsa-icon4", path: require("../assets/verrsa-icon4.png") },
  { id: 5, name: "verrsa-icon5", path: require("../assets/verrsa-icon5.png") },
  { id: 6, name: "verrsa-icon6", path: require("../assets/verrsa-icon6.png") },
  { id: 7, name: "verrsa-icon7", path: require("../assets/verrsa-icon7.png") },
  { id: 8, name: "verrsa-icon8", path: require("../assets/verrsa-icon8.png") },
  { id: 9, name: "verrsa-icon9", path: require("../assets/verrsa-icon9.png") },
  {
    id: 10,
    name: "verrsa-icon10",
    path: require("../assets/verrsa-icon10.png"),
  },
  {
    id: 11,
    name: "verrsa-icon11",
    path: require("../assets/verrsa-icon11.png"),
  },
];

export default function VerrsaIcons() {
  const router = useRouter();
  const [selectedIcon, setSelectedIcon] = useState<number | null>(null);

  const handleIconSelect = (iconId: number) => {
    setSelectedIcon(iconId);

    if (true) {
      window.alert(
        "Icon Selected\n\nApp icon changes are not supported on web. This feature is available on iOS and Android.",
      );
      return;
    }

    // For now, just show a confirmation
    // In production, you'd integrate with expo-application or native modules
    window.alert(
      `Icon Selected\n\nYou've selected icon ${iconId}. Note: Changing app icons requires native configuration and may need an app restart.`,
    );
  };

  const renderIcon = ({ item }: { item: (typeof icons)[0] }) => (
    <button
      style={{
        ...(styles.iconContainer || {}),
        ...(selectedIcon === item.id ? styles.selectedIconContainer || {} : {}),
      }}
      onClick={() => handleIconSelect(item.id)}
    >
      <Image source={item.path} style={styles.iconImage} />
      {selectedIcon === item.id && (
        <div style={styles.selectedBadge}>
          <Entypo name="check" size={20} color="white" />
        </div>
      )}
    </button>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => router.back()}
          style={styles.backButton}
        >
          <Entypo
            name="chevron-with-circle-left"
            size={24}
            color="black"
            style={{ marginTop: 15 }}
          />
        </button>
        <AppText style={styles.headerTitle}>App Icon</AppText>
      </div>

      <AppText style={styles.subtitle}>Select any Icon of your choice</AppText>

      <div style={styles.gridContainer}>
        <div style={styles.iconGrid}>
          {icons.map((item) => (
            <React.Fragment key={item.id}>{renderIcon({ item })}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: 26,
    paddingBottom: spacing.md,
    marginTop: spacing.xl2,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl3,
    fontWeight: "400",
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: "#666",
    textAlign: "center",
    marginTop: 1,
    marginBottom: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  gridContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingBottom: spacing.lg,
  },
  iconGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    justifyItems: "center",
    gap: spacing.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    margin: spacing.md,
    borderRadius: radius.xl2,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    position: "relative",
  },
  selectedIconContainer: {
    borderColor: "#007AFF",
    borderWidth: 3,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  selectedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#007AFF",
    borderRadius: radius.lg,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
};
