'use client';

// @ts-nocheck
import React from 'react';
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from '../lib/theme';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft, TbDots } from 'react-icons/tb'

const POLICY_SECTIONS = [
  {
    title: "1. Current earning channels",
    items: [
      {
        label: "Donations & Tips",
        text: "Creators currently receive 80% of user donations and tips.",
      },
      {
        label: "Livestream Gifts",
        text: "Livestream gifts are active and contribute to creator earnings.",
      },
      {
        label: "Ad revenue",
        text: "Ad revenue sharing is not yet active for creators.",
      },
    ],
  },
  {
    title: "2. How engagement-based earnings are counted",
    description:
      "Unique users who engage for at least 50% of content duration can count toward earnings when that earning category is active.",
    items: [
      {
        label: "Reading Engagement",
        text: "Each user who reads for at least 50% of estimated reading time counts once. Articles must be at least 500 words to qualify.",
      },
      {
        label: "Listen Engagement",
        text: "Each user who listens for at least 50% of podcast duration counts once.",
      },
      {
        label: "Watch Engagement",
        text: "Each user who watches for at least 50% of video duration counts once.",
      },
      {
        label: "Eligible audience",
        text: "All users count toward earnings for Basic and Premium creators. Each qualifying user is counted once per engagement session, regardless of verification status.",
      },
    ],
  },
  {
    title: "3. Content eligibility",
    items: [
      {
        label: "Articles",
        text: "Articles need a minimum of 500 words to be eligible for earnings.",
      },
      {
        label: "Videos & Podcasts",
        text: "Duration limits depend on your subscription tier.",
      },
    ],
  },
  {
    title: "4. Payout schedule",
    items: [
      {
        label: "Frequency",
      text: "Payouts are issued biweekly.",
      },
      {
        label: "Processing",
        text: "Payouts are processed in the first week of the following month.",
      },
      {
        label: "Minimum Withdrawal",
        text: "Earnings accumulate until you reach the $10 minimum withdrawal threshold.",
      },
    ],
  },
  {
    title: "5. Platform fee",
    items: [
      {
        label: "Livestream Gifts",
        text: "40% platform fee is deducted before creator payout.",
      },
      {
        label: "Sponsorships",
        text: "20% platform fee is deducted before creator payout.",
      },
      {
        label: "Donations & Tips",
        text: "20% platform fee is deducted before creator payout.",
      },
    ],
  },
];

export default function Monetization() {
  const router = useRouter();
  const { theme, colors, isDarkMode } = useTheme();
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const [screenWidth, setScreenWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isDesktop = screenWidth >= 1024;

  return (
    <div
      style={{...(styles.container || {}), backgroundColor: theme.background,
          flexDirection: isDesktop ? "row" : "column",}}
    >
      {/* Main Content Area - 80% on desktop */}
      <div style={{ flex: isDesktop ? 0.8 : 1 }}>
        {/* Fixed Header */}
        <div
          style={{...(styles.header || {}), backgroundColor: theme.background,
              borderBottomColor: theme.border,}}
        >
          <button onClick={() => router.back()}>
            <TbChevronLeft />
          </button>
          <div style={styles.headerText}>
            <span
              style={{ fontSize: fontSize.xl, fontWeight: "400", color: theme.text }}
            >
              Monetization
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{overflowY: "auto", flex: 1}}>
          <span style={{...(styles.title || {}), color: theme.text}}>
            Get paid on Verrsa
          </span>
          <span style={{...(styles.subTitle || {}), color: theme.secondaryText}}>
            You must get verified first with Verrsa Basic or Premium to continue monetization
          </span>

            <span style={{...(styles.title || {}), color: theme.text}}>
            Earn by posting
          </span>
          <span style={{...(styles.subTitle || {}), color: theme.secondaryText}}>
            Earn from sharing contents like Articles, Podcasts, Videos to the Public
          </span>

          <img
            src={
              isDarkMode
                ? "/assets/../assets/monetize2.png"
                : "/assets/../assets/monetize.png"
            }
            style={styles.image}
          />

          <div
            style={{...(styles.noticeCard || {}), backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
          >
            <span style={{...(styles.noticeTitle || {}), color: theme.text}}> 
              Creator payment policy
            </span>
            <span style={{...(styles.noticeText || {}), color: theme.secondaryText}}> 
              Review eligibility, payout timing, and platform fees before you start
              earning on Verrsa.
            </span>
          </div>

          <div
            style={{...(styles.noticeCard || {}), backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
          >
            <span style={{...(styles.noticeTitle || {}), color: theme.text}}> 
              Monetization access
            </span>
            <span style={{...(styles.noticeText || {}), color: theme.secondaryText}}> 
              You must be verified or on Verrsa Basic or Premium before participating in
              creator monetization features.
            </span>
          </div>

          {POLICY_SECTIONS.map((section) => (
            <div
              key={section.title}
              style={{...(styles.policyCard || {}), backgroundColor: theme.cardBackground,
                  borderColor: theme.border,}}
            >
              <span style={{...(styles.sectionTitle || {}), color: theme.text}}> 
                {section.title}
              </span>

              {section.description ? (
                <span
                  style={{...(styles.sectionDescription || {}), color: theme.secondaryText}}
                >
                  {section.description}
                </span>
              ) : null}

              {section.items.map((item) => (
                <div key={`${section.title}-${item.label}`} style={styles.bulletRow}>
                  <span style={{...(styles.bullet || {}), color: theme.text}}>•</span>
                  <span
                    style={{...(styles.bulletText || {}), color: theme.secondaryText}}
                  >
                    <span style={{...(styles.bulletLabel || {}), color: theme.text}}> 
                      {item.label}: 
                    </span>
                    {item.text}
                  </span>
                </div>
              ))} 


            </div>
          ))}
        </div>  

        {/* Fixed Bottom Buttons */}
        <div
          style={{...(styles.bottomButtons || {}), backgroundColor: theme.background,}}
        >
          {/* Payment History Button */}
          <button
            style={{...(styles.historyBtn || {}), backgroundColor: theme.cardBackground,
                borderColor: theme.accent,}}
            onClick={() => router.push("/payment-history")}
          >
            <TbDots />
            <span style={{...(styles.historyText || {}), color: theme.accent}}>
              View Payment History
            </span>
          </button>

          {/* Publish Now */}
          <button
            style={styles.premiumBtn}
            onClick={() => router.push("/verrsa-subscription")}
          >
            <span style={styles.premiumText}>Go Premium</span>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    marginTop: 55,
    zIndex: 10,
  },
  headerText: {
    flex: 1,
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "400",
    paddingLeft: spacing.lg,
    paddingTop: spacing.md,
  },
  subTitle: {
    fontSize: fontSize.base,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    color: "#777",
    marginBottom: spacing.lg,
  },
  image: {
    width: "100%",
    height: 150,
    objectFit: "contain",
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  noticeCard: {
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  noticeTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  noticeText: {
    fontSize: fontSize.md2,
    lineHeight: 24,
  },
  policyCard: {
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: fontSize.md2,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  bullet: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    marginRight: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md2,
    lineHeight: 24,
  },
  bulletLabel: {
    fontWeight: "600",
  },
  bottomButtons: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  historyBtn: {
    backgroundColor: "#f0f9ff",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#00BFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  historyText: {
    color: "#00BFFF",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  premiumBtn: {
    backgroundColor: "#00BFFF",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    margin: spacing.lg,
    borderRadius: radius.xs,
  },
  premiumText: {
    color: "#fff",
    fontSize: fontSize.lg,
    alignSelf: "center",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  desktopDrawer: {
    flex: 0.2,
    borderLeftWidth: 1,
    overflow: "hidden",
  },
};

export const getUserAnalytics = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_analytics")
    .select(
      `
      total_views,
      total_likes,
      total_comments,
      total_earnings,
      monthly_stats
    `,
    )
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
};

export const getUserAdAnalytics = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_ad_analytics")
    .select("*")
    .eq("author_id", userId)
    .single();

  if (error) throw error;
  return data;
};

export const getContentPerformance = async (userId: string) => {
  const { data, error } = await supabase
    .from("content_analytics")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};
