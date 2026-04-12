// @ts-nocheck
import { useRouter } from 'next/router';
import React from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { useTheme } from '../context/ThemeProvider';

export default function AboutVerrsa() {
  const router = useRouter();
  const { theme } = useTheme();
  const [screenWidth, setScreenWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isDesktop = screenWidth >= 1024;

  React.useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        ...styles.outerContainer,
        flexDirection: isDesktop ? "row" : "column",
      }}
    >
      {/* Main Content Area - 80% on desktop */}
      <div style={{ flex: isDesktop ? 0.8 : 1 }}>
        <div style={{
          ...styles.container,
          ...styles.contentContainer,
          overflowY: "auto",
          backgroundColor: "#fff",
        }}>
          {/* Back Button */}
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <IoChevronBack size={25} color="white" />
          </button>

          {/* Image Section */}
          <div 
            style={{
              ...styles.imageBackground,
              backgroundImage: 'url(/creators.png)',
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Text Section */}
          <div style={styles.textSection}>
            <h1 style={styles.heading}>About Verrsa</h1>
            <p style={styles.subText}>
              Verrsa is a revolutionary content platform where writers,
              podcasters, video creators, and storytellers turn their creativity
              into impact. Whether you're an aspiring writer, a seasoned
              journalist, a passionate podcaster, or a video creator, you can
              publish articles, host podcasts, share videos, and engage with a
              vibrant community-all while earning from your content.
            </p>
            <p style={styles.subText}>
              Verrsa empowers users to maximize their reach and influence.
              Whether you're looking to share knowledge, spark conversations, or
              showcase your creativity, this is the ultimate hub for
              content-driven success.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Drawer Sidebar - 20% */}
      {isDesktop && (
        <div
          style={{
            ...styles.desktopDrawer,
            backgroundColor: theme.cardBackground,
            borderLeft: `1px solid ${theme.border}`,
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outerContainer: {
    display: 'flex',
    flex: 1,
    backgroundColor: "#fff",
    minHeight: '100vh',
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: "center",
    paddingTop: 69,
    paddingBottom: spacing.xl3,
  },
  backButton: {
    position: "absolute",
    top: 69,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: radius.xl2,
    padding: spacing.sm,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBackground: {
    width: 400,
    maxWidth: '100%',
    height: 400,
    marginTop: -35,
    marginBottom: -35,
  },
  textSection: {
    width: "100%",
    maxWidth: 800,
    padding: `0 ${spacing.lg}px`,
  },
  heading: {
    fontSize: fontSize.xl3,
    fontWeight: 600,
    alignSelf: "flex-start",
    marginTop: 50,
    marginBottom: spacing.md,
    padding: `0 ${spacing.md}px`,
    color: '#000',
  },
  subText: {
    fontSize: fontSize.lg,
    lineHeight: '26px',
    fontWeight: 300,
    color: "#000",
    alignSelf: "flex-start",
    marginBottom: spacing.xl2,
    padding: `0 ${spacing.md}px`,
  },
  button: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.lg,
    padding: `${spacing.base}px 110px`,
    alignSelf: "center",
    border: 'none',
    cursor: 'pointer',
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: 500,
    fontFamily: "InstrumentSans-Bold",
  },
  desktopDrawer: {
    flex: 0.2,
    borderLeft: '1px solid',
    overflow: "hidden",
    minHeight: '100vh',
  },
};
