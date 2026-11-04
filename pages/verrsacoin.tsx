// @ts-nocheck
import React from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import {
  FaCoins,
  FaPencilAlt,
  FaRegHeart,
  FaRegComment,
  FaShareAlt,
  FaMoneyBillWave,
  FaCrown,
  FaRocket,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";

const EARN_WAYS = [
  { Icon: FaPencilAlt, title: "Post content", text: "Publish articles, podcasts, videos and verses." },
  { Icon: FaRegHeart, title: "Get likes", text: "Earn coins as your audience appreciates your work." },
  { Icon: FaRegComment, title: "Get comments", text: "Conversations around your posts count towards rewards." },
  { Icon: FaShareAlt, title: "Get shares", text: "Every share spreads your work and grows your coins." },
];

const REDEEM_WAYS = [
  { Icon: FaMoneyBillWave, title: "Cash withdrawals", text: "Convert your coins into real earnings." },
  { Icon: FaCrown, title: "Premium features", text: "Use coins towards Verrsa premium features." },
  { Icon: FaRocket, title: "Exclusive boosts", text: "Promote your best posts to a wider audience using your VerrsaCoin." },
];

export default function VerrsaCoin() {
  const router = useRouter();
  const { theme } = useTheme();

  const renderRow = ({ Icon, title, text }) => (
    <div
      key={title}
      style={{
        ...styles.row,
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <Icon size={22} color="#00bfff" style={{ flexShrink: 0 }} />
      <div style={styles.rowTextWrap}>
        <div style={{ ...styles.rowTitle, color: theme.text }}>{title}</div>
        <div style={{ ...styles.rowText, color: theme.secondaryText }}>{text}</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...styles.container, backgroundColor: theme.background }}>
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ ...styles.headerTitle, color: theme.text }}>VerrsaCoin</div>
        <div style={styles.backButton} />
      </div>

      <div style={styles.content}>
        <div style={styles.hero}>
          <FaCoins size={56} color="#f1c528" />
          <div style={{ ...styles.heroTitle, color: theme.text }}>Explore VerrsaCoin</div>
          <div style={{ ...styles.heroText, color: theme.secondaryText }}>
            VerrsaCoin is Verrsa's creator reward system, built to reward you for
            the value you bring to the community.
          </div>
          <div style={styles.badge}>
            <span style={styles.badgeText}>COMING SOON</span>
          </div>
        </div>

        <div style={{ ...styles.sectionTitle, color: theme.text }}>How to earn coins</div>
        {EARN_WAYS.map(renderRow)}

        <div style={{ ...styles.sectionTitle, color: theme.text }}>How to redeem coins</div>
        {REDEEM_WAYS.map(renderRow)}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px`,
  },
  backButton: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  content: {
    padding: spacing.base,
    paddingBottom: 60,
    maxWidth: 700,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  heroTitle: { fontSize: 24, fontWeight: 700, marginTop: spacing.md },
  heroText: { fontSize: 15, lineHeight: "22px", marginTop: spacing.sm },
  badge: {
    marginTop: spacing.md,
    backgroundColor: "#00bfff",
    padding: "6px 14px",
    borderRadius: radius.xl,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: `${spacing.lg}px 0 ${spacing.md}px`,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    border: "1px solid",
    marginBottom: spacing.sm,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  rowText: { fontSize: 13, lineHeight: "18px" },
};
