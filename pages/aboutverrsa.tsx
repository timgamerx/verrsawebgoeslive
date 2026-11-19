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
        <div
          style={{
            ...styles.container,
            ...styles.contentContainer,
            overflowY: "auto",
            backgroundColor: "#fff",
          }}
        >
          {/* Back Button */}
          <button style={styles.backButton} onClick={() => router.back()}>
            <IoChevronBack size={25} color="white" />
          </button>

          {/* Image Section */}
          <div
            style={{
              ...styles.imageBackground,
              backgroundImage: "url(/creators.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Text Section */}
          <div style={styles.textSection}>
            <h1 style={styles.heading}>About Verrsa</h1>
            <p style={styles.subText}>
              Verrsa is a creator platform for content creation and community
              building.
            </p>
            <p style={styles.subText}>
              Verrsa brings together writing, podcasts, video, live streaming,
              and communities in one platform, with AI-powered creator tools and
              a native utility token planned to further enhance content
              creation, rewards, subscriptions, and in-app transactions.
            </p>
            <p style={styles.subText}>
              Create and publish articles, podcasts, videos and posts, connect
              with communities, go live, grow your audience and monetize your
              creativity.
            </p>
            <p style={styles.subText}>
              Verrsa helps creators understand how to build audiences and earn
              from creating.
            </p>
            <p style={styles.subText}>
              Verrsa is where you can document your journey, discover useful
              information and spend your time on content that goes beyond viral
              memes and entertainment alone
            </p>
            <p style={styles.subText}>
              After years of research and experience across the digital economy,
              we recognised the challenges creators face—fragmented platforms,
              limited monetization opportunities, and the difficulty of turning
              creativity into sustainable income. Verrsa was created to bring
              the tools, community, and monetization opportunities they need
              into one ecosystem.
            </p>
            <p style={styles.subText}>
              We believe creators should not have to limit themselves to one
              format. A writer can become a podcaster. A podcaster can create
              videos. A video creator can build a community. And every creator
              should have opportunities to connect with their audience and
              monetize their work without constantly moving between different
              platforms.
            </p>
            <p style={styles.subText}>
              Verrsa aims to create new digital opportunities for every talent.
              Whether you are just starting or already building an audience,
              Verrsa gives your creativity room to grow.
            </p>
            <p style={styles.subText}>
              Start creating. Start building. Start earning. With Verrsa.
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
