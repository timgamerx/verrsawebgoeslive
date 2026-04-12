import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from 'next/router';
import {
  IoBookOutline,
  IoCashOutline,
  IoChevronBack,
  IoHeadsetOutline,
  IoLockClosedOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
  IoStatsChartOutline,
  IoThumbsUpOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { spacing, radius, fontSize, fontFamily } from "../lib/theme";
import { useTheme } from "../context/ThemeProvider";
import { supabase } from "../components/supabase";
import { useFeatureAccess } from "../hooks/useSubscription";
import { FeatureGate } from "../components/SubscriptionGates";

export const PAYMENT_RATES = {
  watch_time: 0.5,
  listen_time: 0.6,
  read_time: 0.6,
};

export const MIN_ENGAGEMENT_PERCENTAGE = 0.5;
export const MIN_ARTICLE_WORDS_FOR_EARNINGS = 700;

const GOALS = {
  watch_time: 1000,
  listen_time: 1000,
  read_time: 1000,
};

const RANGE_OPTIONS = [
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "last_month", label: "Last Month" },
  { value: "all_time", label: "All Time" },
];

const BarChart = ({ data, width, height, chartConfig, style }: any) => {
  const values = data?.datasets?.[0]?.data || [];
  const max = Math.max(...values, 1);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: chartConfig?.backgroundColor,
        borderRadius: radius.lg,
        padding: spacing.sm,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: height - 56,
          gap: 6,
        }}
      >
        {values.map((val: number, i: number) => (
          <div
            key={i}
            title={`${val}`}
            style={{
              flex: 1,
              backgroundColor: chartConfig?.color?.(1) || "#00bfff",
              height: `${Math.max((val / max) * 100, 4)}%`,
              borderRadius: 4,
              transition: "height 0.25s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {(data?.labels || []).map((label: string, i: number) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              color: chartConfig?.labelColor?.(1) || "#999",
              fontFamily: fontFamily.regular,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

type Totals = {
  views: number;
  followers: number;
  earnings: number;
  likes: number;
  subscribers: number;
  watch_time: number;
  listen_time: number;
  read_time: number;
};

const INITIAL_TOTALS: Totals = {
  views: 0,
  followers: 0,
  earnings: 0,
  likes: 0,
  subscribers: 0,
  watch_time: 0,
  listen_time: 0,
  read_time: 0,
};

const getRangeDates = (period: string) => {
  const now = new Date();

  if (period === "this_week") {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  if (period === "last_week") {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - day - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }

  if (period === "all_time") {
    const start = new Date(2000, 0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end };
};

const pct = (value: number, goal: number) => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)));
};

function StatCard({ item, theme, navigate }: any) {
  const iconMap: Record<string, React.ReactNode> = {
    views: <IoStatsChartOutline size={22} color={theme.text} />,
    followers: <IoPeopleOutline size={22} color={theme.text} />,
    earnings: <IoCashOutline size={22} color={theme.text} />,
    likes: <IoThumbsUpOutline size={22} color={theme.text} />,
    subscribers: <IoPersonAddOutline size={22} color={theme.text} />,
    watch_time: <IoTimeOutline size={22} color={theme.text} />,
    listen_time: <IoHeadsetOutline size={22} color={theme.text} />,
    read_time: <IoBookOutline size={22} color={theme.text} />,
  };

  return (
    <div
      style={{
        ...styles.card,
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      {iconMap[item.key]}
      {item.value ? (
        <span style={{ ...styles.value, color: theme.text }}>{item.value}</span>
      ) : null}
      <span style={{ ...styles.label, color: theme.secondaryText }}>{item.label}</span>

      {item.key === "earnings" && (
        <button
          style={styles.paymentButton}
          onClick={() => navigate("/payment-dashboard")}
        >
          <span style={styles.paymentButtonText}>Go to Dashboard</span>
        </button>
      )}
    </div>
  );
}

function ProgressRow({ label, value, goal, theme }: any) {
  const progress = pct(value || 0, goal);
  return (
    <div style={{ marginBottom: spacing.lg }}>
      <div style={{ ...styles.progressLabel, color: theme.text }}>{label}</div>
      <div
        style={{
          height: 10,
          backgroundColor: theme.text === "#ffffff" ? "#333" : "#e0e0e0",
          borderRadius: radius.sm,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(progress, 1)}%`,
            height: "100%",
            backgroundColor: "#00AEEF",
          }}
        />
      </div>
      <div style={styles.progressMeta}>
        {progress}% ({value || 0} / {goal})
      </div>
    </div>
  );
}

export default function Performance() {
  const router = useRouter();
  const { theme } = useTheme();
  const [range, setRange] = useState<string>("this_week");
  const [loading, setLoading] = useState<boolean>(true);
  const [screenWidth, setScreenWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>(INITIAL_TOTALS);

  const isDesktop = screenWidth >= 1024;
  const navigate = (path: string) => router.push(path);

  const { loading: subscriptionLoading, refreshSubscription } = useFeatureAccess(
    "advancedAnalytics",
    "Advanced Analytics",
  );

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchPerformance = async (period: string) => {
    setLoading(true);
    try {
      const { start, end } = getRangeDates(period);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTotals(INITIAL_TOTALS);
        return;
      }

      const userId = user.id;

      const { data: earningsData, error: earningsError } = await supabase.rpc(
        "calculate_creator_earnings",
        {
          p_creator_id: userId,
          p_start_date: startIso,
          p_end_date: endIso,
        },
      );

      let watch_time = 0;
      let listen_time = 0;
      let read_time = 0;
      let calculatedEarnings = 0;

      if (!earningsError && earningsData && earningsData.length > 0) {
        const data = earningsData[0];
        watch_time = Number(data.total_watch_users || data.total_watch_minutes || 0);
        listen_time = Number(data.total_listen_users || data.total_listen_minutes || 0);
        read_time = Number(data.total_read_users || data.total_read_minutes || 0);
        calculatedEarnings = Number(data.total_earnings || 0);
      } else {
        const { data: videoViews } = await supabase
          .from("user_video_views")
          .select("user_id, watch_duration_minutes, video_duration_minutes")
          .eq("creator_id", userId)
          .gte("created_at", startIso)
          .lt("created_at", endIso);

        const { data: podcastListens } = await supabase
          .from("user_podcast_listens")
          .select("user_id, listen_duration_minutes, podcast_duration_minutes")
          .eq("creator_id", userId)
          .gte("created_at", startIso)
          .lt("created_at", endIso);

        const { data: articleReads } = await supabase
          .from("user_article_reads")
          .select("user_id, article_id, read_duration_minutes, article_reading_time_minutes")
          .eq("creator_id", userId)
          .gte("created_at", startIso)
          .lt("created_at", endIso);

        const { data: creatorArticles } = await supabase
          .from("posts")
          .select("id, content")
          .eq("user_id", userId)
          .eq("post_type", "article");

        const eligibleArticleIds = new Set(
          (creatorArticles || [])
            .filter((a: any) => {
              const wordCount = a.content
                ? a.content.trim().split(/\s+/).filter(Boolean).length
                : 0;
              return wordCount >= MIN_ARTICLE_WORDS_FOR_EARNINGS;
            })
            .map((a: any) => a.id),
        );

        const watchFiltered =
          videoViews?.filter(
            (v: any) =>
              v.video_duration_minutes > 0 &&
              v.watch_duration_minutes >=
                v.video_duration_minutes * MIN_ENGAGEMENT_PERCENTAGE,
          ) || [];

        const listenFiltered =
          podcastListens?.filter(
            (p: any) =>
              p.podcast_duration_minutes > 0 &&
              p.listen_duration_minutes >=
                p.podcast_duration_minutes * MIN_ENGAGEMENT_PERCENTAGE,
          ) || [];

        const readFiltered =
          articleReads?.filter(
            (a: any) =>
              a.article_reading_time_minutes > 0 &&
              a.read_duration_minutes >=
                a.article_reading_time_minutes * MIN_ENGAGEMENT_PERCENTAGE &&
              (!a.article_id || eligibleArticleIds.has(a.article_id)),
          ) || [];

        // Count unique engaged users per channel.
        watch_time = new Set(watchFiltered.map((x: any) => x.user_id).filter(Boolean)).size;
        listen_time = new Set(listenFiltered.map((x: any) => x.user_id).filter(Boolean)).size;
        read_time = new Set(readFiltered.map((x: any) => x.user_id).filter(Boolean)).size;

        calculatedEarnings =
          (watch_time / 1000) * PAYMENT_RATES.watch_time +
          (listen_time / 1000) * PAYMENT_RATES.listen_time +
          (read_time / 1000) * PAYMENT_RATES.read_time;
      }

      const { data: articles } = await supabase
        .from("posts")
        .select("id, view_count")
        .eq("user_id", userId)
        .eq("post_type", "article")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const { data: podcasts } = await supabase
        .from("posts")
        .select("id, view_count")
        .eq("user_id", userId)
        .eq("post_type", "podcast")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const { data: videos } = await supabase
        .from("videos")
        .select("id, view_count")
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const sum = (arr: any[] | null | undefined, key: string) =>
        !arr ? 0 : arr.reduce((s: number, a: any) => s + Number(a?.[key] || 0), 0);

      const articleIds = (articles || []).map((a: any) => a.id);
      const podcastIds = (podcasts || []).map((p: any) => p.id);
      const videoIds = (videos || []).map((v: any) => v.id);

      const { count: articleLikes } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .in("content_id", articleIds.length > 0 ? articleIds : [-1])
        .eq("content_type", "article")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const { count: podcastLikes } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .in("content_id", podcastIds.length > 0 ? podcastIds : [-1])
        .eq("content_type", "podcast")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const { count: videoLikes } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .in("content_id", videoIds.length > 0 ? videoIds : [-1])
        .eq("content_type", "video")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      const [{ count: followersCount }, { count: subscribersCount }] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", userId),
      ]);

      setTotals({
        views: sum(articles, "view_count") + sum(podcasts, "view_count") + sum(videos, "view_count"),
        followers: followersCount || 0,
        earnings: Number(calculatedEarnings.toFixed(2)),
        likes: (articleLikes || 0) + (podcastLikes || 0) + (videoLikes || 0),
        subscribers: subscribersCount || 0,
        watch_time,
        listen_time,
        read_time,
      });
    } catch (err) {
      console.error("Error fetching performance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance(range);
  }, [range]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id !== currentUserId) {
        setCurrentUserId(user?.id || null);
        refreshSubscription?.(true);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          const newUserId = session?.user?.id || null;
          if (newUserId !== currentUserId) {
            setCurrentUserId(newUserId);
            refreshSubscription?.(true);
          }
        } else if (event === "SIGNED_OUT") {
          setCurrentUserId(null);
          router.back();
        }
      },
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [currentUserId, navigate, refreshSubscription]);

  const chartData = useMemo(
    () => ({
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [
        {
          data: [10, 20, 30, 25, 15, 20, 5],
        },
      ],
    }),
    [],
  );

  const chartConfig = {
    backgroundColor: theme.cardBackground,
    color: (opacity = 1) => `rgba(0, 174, 239, ${opacity})`,
    labelColor: (opacity = 1) =>
      theme.text === "#ffffff"
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
  };

  const withdrawEnabled =
    pct(totals.watch_time, GOALS.watch_time) >= 100 &&
    pct(totals.listen_time, GOALS.listen_time) >= 100 &&
    pct(totals.read_time, GOALS.read_time) >= 100;

  const stats = [
    { key: "views", label: "Total Views", value: `${totals.views}` },
    { key: "followers", label: "Total Followers", value: `${totals.followers}` },
    { key: "earnings", label: "Total Earnings", value: `$${totals.earnings.toFixed(2)}` },
    { key: "likes", label: "Total Likes", value: `${totals.likes}` },
    { key: "subscribers", label: "Total Subscribers", value: `${totals.subscribers}` },
    { key: "watch_time", label: "Watch Engagements", value: `${totals.watch_time} users` },
    { key: "listen_time", label: "Listen Engagements", value: `${totals.listen_time} users` },
    { key: "read_time", label: "Read Engagements", value: `${totals.read_time} users` },
  ];

  const mainContent = (
    <div style={{ ...styles.outerContainer, flexDirection: isDesktop ? "row" : "column" }}>
      <div style={{ flex: isDesktop ? 0.8 : 1, minWidth: 0 }}>
        <div style={{ ...styles.container, backgroundColor: theme.background }}>
          <button style={styles.backButton} onClick={() => router.back()} aria-label="Back">
            <IoChevronBack />
          </button>

          <div style={styles.contentContainer}>
            <div style={{ ...styles.title, color: theme.text }}>Performance</div>

            {loading ? (
              <div style={styles.loadingWrap}>
                <div style={styles.spinner} />
              </div>
            ) : (
              <>
                <div style={styles.grid}>
                  {stats.map((item) => (
                    <StatCard key={item.key} item={item} theme={theme} navigate={navigate} />
                  ))}
                </div>

                <div style={{ ...styles.chartTitle, color: theme.text }}>Insights</div>

                <select
                  style={{
                    ...styles.select,
                    backgroundColor: theme.cardBackground,
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                  }}
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: spacing.lg }}>
                  <ProgressRow
                    label={`Progress to ${GOALS.watch_time} watch engagements`}
                    value={totals.watch_time}
                    goal={GOALS.watch_time}
                    theme={theme}
                  />
                  <ProgressRow
                    label={`Progress to ${GOALS.listen_time} listen engagements`}
                    value={totals.listen_time}
                    goal={GOALS.listen_time}
                    theme={theme}
                  />
                  <ProgressRow
                    label={`Progress to ${GOALS.read_time} read engagements`}
                    value={totals.read_time}
                    goal={GOALS.read_time}
                    theme={theme}
                  />

                  <button
                    style={{
                      ...styles.paymentButton,
                      opacity: withdrawEnabled ? 1 : 0.55,
                      cursor: withdrawEnabled ? "pointer" : "not-allowed",
                    }}
                    disabled={!withdrawEnabled}
                    onClick={() => router.push("/payment-dashboard")}
                  >
                    <span style={styles.paymentButtonText}>Withdraw</span>
                  </button>
                </div>

                <FeatureGate
                  feature="advancedAnalytics"
                  featureName="Advanced Analytics"
                  fallbackComponent={
                    <div
                      style={{
                        ...styles.lockedFeature,
                        backgroundColor: theme.cardBackground,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <IoLockClosedOutline size={26} color={theme.text} />
                      <div style={{ ...styles.lockedText, color: theme.text }}>Advanced Analytics</div>
                      <div style={{ ...styles.lockedSubText, color: theme.secondaryText }}>
                        Upgrade to unlock detailed charts and analytics
                      </div>
                    </div>
                  }
                >
                  <div style={{ marginTop: spacing.lg }}>
                    <BarChart
                      data={chartData}
                      width={Math.max(320, Math.min(screenWidth - 80, 880))}
                      height={220}
                      chartConfig={chartConfig}
                      style={styles.chart}
                    />
                  </div>
                </FeatureGate>
              </>
            )}
          </div>
        </div>
      </div>

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

  return (
    <FeatureGate
      feature="advancedAnalytics"
      featureName="Performance Analytics"
      fallbackComponent={
        <div style={{ ...styles.container, backgroundColor: theme.background }}>
          <button style={styles.backButton} onClick={() => router.back()} aria-label="Back">
            <IoChevronBack />
          </button>
          <div style={styles.lockedScreenContainer}>
            {subscriptionLoading ? (
              <>
                <div style={styles.spinner} />
                <div style={{ ...styles.lockedScreenText, color: theme.secondaryText, marginTop: spacing.base }}>
                  Checking subscription...
                </div>
              </>
            ) : (
              <>
                <IoLockClosedOutline size={30} color={theme.text} />
                <div style={{ ...styles.lockedScreenTitle, color: theme.text }}>
                  Performance Analytics
                </div>
                <div style={{ ...styles.lockedScreenText, color: theme.secondaryText }}>
                  Unlock detailed performance analytics and insights with a Basic or Premium subscription.
                </div>
                <button
                  style={styles.upgradeButton}
                  onClick={() => router.push("/verrsa-subscription")}
                >
                  <span style={styles.upgradeButtonText}>Upgrade Now</span>
                </button>
              </>
            )}
          </div>
        </div>
      }
    >
      {mainContent}
    </FeatureGate>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outerContainer: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
  },
  container: {
    width: "100%",
    minHeight: "100vh",
    position: "relative",
  },
  contentContainer: {
    maxWidth: 980,
    margin: "0 auto",
    padding: `${spacing.xl5}px ${spacing.lg}px ${spacing.xl3}px`,
  },
  backButton: {
    position: "absolute",
    top: 28,
    left: 18,
    zIndex: 10,
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    color: "inherit",
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: 500,
    textAlign: "center",
    marginTop: spacing.base,
    marginBottom: spacing.xl2,
    fontFamily: fontFamily.poppins,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: spacing.base,
    marginBottom: spacing.xl2,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.base,
    border: "1px solid transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 140,
  },
  value: {
    fontSize: fontSize.xl3,
    fontWeight: 600,
    fontFamily: fontFamily.poppins,
  },
  label: {
    fontSize: fontSize.md,
    textAlign: "center",
  },
  chartTitle: {
    fontSize: fontSize.xl,
    fontWeight: 500,
    marginBottom: spacing.md,
    fontFamily: fontFamily.poppins,
  },
  chart: {
    borderRadius: radius.lg,
  },
  select: {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.md,
    outline: "none",
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  progressLabel: {
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.regular,
  },
  progressMeta: {
    fontSize: fontSize.sm,
    color: "#6b7280",
    marginTop: spacing.sm,
    fontFamily: fontFamily.regular,
  },
  paymentButton: {
    marginTop: spacing.sm,
    backgroundColor: "#00AEEF",
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    border: "none",
    cursor: "pointer",
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: 600,
  },
  lockedFeature: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl3,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  lockedText: {
    fontSize: fontSize.lg,
    fontWeight: 600,
    marginTop: spacing.md,
    textAlign: "center",
  },
  lockedSubText: {
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: "22px",
  },
  lockedScreenContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: `0 ${spacing.xl2}px`,
  },
  lockedScreenTitle: {
    fontSize: fontSize.xl3,
    fontWeight: 600,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  lockedScreenText: {
    fontSize: fontSize.lg,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: "22px",
    maxWidth: 520,
  },
  upgradeButton: {
    backgroundColor: "#00AEEF",
    padding: `${spacing.base}px ${spacing.xl2}px`,
    borderRadius: radius.full,
    marginTop: spacing.xl2,
    border: "none",
    cursor: "pointer",
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: 600,
    textAlign: "center",
  },
  desktopDrawer: {
    flex: 0.2,
    minHeight: "100vh",
  },
  loadingWrap: {
    minHeight: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "3px solid #00bfff",
    borderTopColor: "transparent",
  },
};
