'use client';

// @ts-nocheck
import { useRouter } from 'next/router';
import React from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'

export default function AdsandBoosts() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const [screenWidth, setScreenWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isDesktop = screenWidth >= 1024;

  return (
    <div
      style={{...(styles.outerContainer || {}), flexDirection: isDesktop ? "row" : "column"}}
    >
      {/* Main Content Area - 80% on desktop */}
      <div style={{ flex: isDesktop ? 0.8 : 1 }}>
        <div style={{...(styles.container), ...(styles.contentContainer), overflowY: "auto"}}
        >
          {/* Back Button */}
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <TbChevronLeft />
          </button>

          {/* Title */}
          <span style={styles.title}>Ads and Boosts</span>

          {/* Images Grid */}
          <div style={styles.image}>
            <img
              src={"/assets/../assets/adsandboosts.png"}
              style={styles.image}
            />
          </div>

          {/* Text Section */}
          <span style={styles.heading}>
            Let's Promote Your Contents To Reach More 
            <span style={styles.highlight}> Audience</span>
          </span>
          <span style={styles.subText}>
            Reach and grow your audience level on Verrsa in order to increase
            your earning rate
          </span>

          {/* CTA Button */}
          <button
            style={styles.button}
            onClick={() => router.push("/adsand-boosts2")}
          >
            <span style={styles.buttonText}>Let's Do It...</span>
          </button>
        </div>
      </div>

      {/* Desktop Drawer Sidebar - 20% */}
      {isDesktop && (
        <div
          style={{...(styles.desktopDrawer || {}), backgroundColor: theme.cardBackground,
              borderLeftColor: theme.border,}}
        >
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: 69,
    paddingBottom: spacing.xl3,
  },
  backButton: {
    position: "absolute",
    top: 69,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginBottom: spacing.xl2,
    color: "#000",
  },
  heading: {
    fontSize: fontSize.xl2,
    fontWeight: "500",
    textAlign: "center",
    marginTop: spacing.xl2,
    marginBottom: spacing.px,
    fontFamily: "InstrumentSans-Bold",
  },
  highlight: {
    color: "#00BFFF",
    fontWeight: "500",
    fontSize: fontSize.xl2,
    fontFamily: "InstrumentSans-Bold",
  },
  subText: {
    fontSize: fontSize.base,
    textAlign: "center",
    color: "#666",
    marginBottom: spacing.xl2,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  button: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    paddingLeft: 100,
    paddingRight: 100,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
    fontFamily: "InstrumentSans-Bold",
  },
  image: {
    width: 400,
    height: 400,
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  desktopDrawer: {
    flex: 0.2,
    borderLeftWidth: 1,
    overflow: "hidden",
  },
};
