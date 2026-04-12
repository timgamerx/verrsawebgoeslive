// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack, IoEye, IoHeart } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { TbChevronLeft, TbDots } from 'react-icons/tb'

export default function AdsandBoosts2() {
  const router = useRouter();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("this_week");
  const [postType, setPostType] = useState<
    "article" | "podcast" | "video" | "all"
  >("all");
  const [totalReach, setTotalReach] = useState(0);
  const [totalEngagements, setTotalEngagements] = useState(0);
  const [promotedPosts, setPromotedPosts] = useState<any[]>([]);
  const [detailedPosts, setDetailedPosts] = useState<any[]>([]);

  // Fetch promoted posts data
  useEffect(() => {
    fetchPromotedPostsAnalytics();
  }, [dateRange, postType]);

  const getDateRangeFilter = () => {
  const router = useRouter();
    if (dateRange === "all_time") {
      return null; // No date filter for all time
    }

    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case "this_week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "last_week":
        startDate.setDate(now.getDate() - 14);
        break;
      case "last_month":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return startDate.toISOString();
  };

  const fetchPromotedPostsAnalytics = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      // Build query
      let query = supabase
        .from("promoted_posts")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]);

      // Apply date filter only if not "all_time"
      const dateFilter = getDateRangeFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      // Filter by post type if not "all"
      if (postType !== "all") {
        query = query.eq("post_type", postType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching promoted posts:", error);
        setLoading(false);
        return;
      }

      setPromotedPosts(data || []);

      // Fetch actual post metrics from articles/podcasts/videos tables
      let totalReachCount = 0;
      let totalEngagementsCount = 0;
      const postsWithMetrics: any[] = [];

      for (const promotedPost of data || []) {
        const postId = promotedPost.post_id;

        let tableName = "";
        if (postType === "article") tableName = "articles";
        else if (postType === "podcast") tableName = "podcasts";
        else if (postType === "video") tableName = "videos";

        if (!tableName || !postId) continue;

        // Fetch the actual post data
        const { data: postData, error: postError } = await supabase
          .from(tableName)
          .select(
            "id, title, view_count, like_count, comment_count, share_count, cover_image_url, thumbnail_url",
          )
          .eq("id", postId)
          .single();

        if (!postError && postData) {
          // Add to total reach (views)
          totalReachCount += postData.view_count || 0;

          // Add to total engagements (likes + comments + shares)
          const engagements =
            (postData.like_count || 0) +
            (postData.comment_count || 0) +
            (postData.share_count || 0);
          totalEngagementsCount += engagements;

          // Store post with metrics
          postsWithMetrics.push({
            ...postData,
            post_type: postType,
            promoted_status: promotedPost.status,
            reach: postData.view_count || 0,
            engagements: engagements,
            likes: postData.like_count || 0,
            comments: postData.comment_count || 0,
            shares: postData.share_count || 0,
          });
        }
      }

      setTotalReach(totalReachCount);
      setTotalEngagements(totalEngagementsCount);
      setDetailedPosts(postsWithMetrics);

      setLoading(false);
    } catch (error) {
      console.error("Error in fetchPromotedPostsAnalytics:", error);
      setLoading(false);
    }
  };

  return (
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

      {/* Text Section */}
      <span style={styles.heading}>Create Ads</span>
      <button
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: -10, // reduced from 30 to 16
        }}
        onClick={() => router.push("/adsand-boosts5")}
      >
        {/* Create Ad Icon */}
        <img
          src={"/assets/../assets/boost2.png"}
          style={{
            width: 45,
            height: 45,
            tintColor: "#00bfff",
            marginRight: spacing.md,
            marginTop: -25,
            backgroundColor: "#f0f0f0",
            borderRadius: radius.full,
            padding: spacing.md,
          }}
        />

        {/* Title and Subtext */}
        <div style={{ flex: 1 }}>
          <span style={styles.newAdTitle}>Create a new ad or campaign</span>
          <span style={styles.newAdSubText}>
            Reach more audience by promoting your contents on Verrsa
          </span>
        </div>

        {/* Chevron Icon */}
        <TbDots />
      </button>

      <button
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: spacing.base, // reduced from 30 to 16
        }}
        onClick={() => router.push("/adsand-boosts5")}
      >
        {/* Create Ad Icon */}
        <img
          src={"/assets/../assets/boost.png"}
          style={{
            width: 45,
            height: 45,
            tintColor: "#00bfff",
            marginRight: spacing.md,
            marginTop: -35,
            backgroundColor: "#f0f0f0",
            borderRadius: radius.full,
            padding: spacing.md,
          }}
        />

        {/* Title and Subtext */}
        <div style={{ flex: 1 }}>
          <span style={styles.boostProfileTitle}>
            Boost your profile presence
          </span>
          <span style={styles.boostProfileSubText}>
            Get seen. Grow your audience and increase your earning rate. Boost
            your Verrsa profile now
          </span>
        </div>
        {/* Chevron Icon */}
        <TbDots />
      </button>
      <div
        style={{
          height: 1,
          backgroundColor: "#eee",
          width: "100%",
          marginTop: -25,
          marginBottom: 25,
        }}
      />

      {/* Ads Summary Section */}
      <span style={styles.heading}>Ads Summary</span>
      <span style={styles.subText}>
        A quick look at the performace of your active and past promotions
      </span>

      <div style={styles.dateRangeContainer}>
        <select
          style={{ flex: 1, marginLeft: spacing.md }}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="">Select Date Range</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="last_month">Last Month</option>
          <option value="all_time">All Time</option>
        </select>
      </div>

      <div style={styles.postsContainer}>
        <select
          style={{ flex: 1, marginLeft: spacing.md }}
          value={postType}
          onChange={(e) => setPostType(e.target.value as "article" | "podcast" | "video" | "all")}
        >
          <option value="">Select Post Type</option>
          <option value="all">All Posts</option>
          <option value="article">Article</option>
          <option value="podcast">Podcast</option>
          <option value="video">Video</option>
        </select>
      </div>

      {loading ? (
        <div style={{ marginTop: spacing.xl2, alignItems: "center" }}>
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          <span style={{ marginTop: spacing.md, color: "#666" }}>
            Loading analytics...
          </span>
        </div>
      ) : (
        <div
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: spacing.xl2,
          }}
        >
          {/* Total Reach */}
          <div
            style={{
              width: 170,
              height: 150,
              backgroundColor: "#f5faff",
              borderRadius: radius.xl,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 35,
              marginLeft: spacing.md,
    marginRight: spacing.md,
            }}
          >
            <span style={styles.summaryText}>Total Reach</span>
            <div
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: spacing.md,
              }}
            >
              <span
                style={{...(styles.summaryText || {}), fontWeight: "bold", fontSize: fontSize.lg, marginRight: spacing.sm}}
              >
                {totalReach.toLocaleString()}
              </span>
              <IoEye />
            </div>
          </div>
          {/* Total Engagements */}
          <div
            style={{
              width: 170,
              height: 150,
              backgroundColor: "#f5faff",
              borderRadius: radius.xl,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: spacing.md,
    marginRight: spacing.md,
            }}
          >
            <span style={styles.summaryText}>Total Engagements</span>
            <div
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: spacing.md,
              }}
            >
              <span
                style={{...(styles.summaryText || {}), fontWeight: "bold", fontSize: fontSize.lg, marginRight: spacing.sm}}
              >
                {totalEngagements.toLocaleString()}
              </span>
              <IoChevronBack />
            </div>
          </div>
        </div>
    )}
      {/* Detailed Posts Performance */}
      {!loading && detailedPosts.length > 0 && (
        <div style={{ width: "100%", marginTop: spacing.xl2 }}>
          <span style={styles.heading}>Post Performance</span>
          <span style={{...(styles.subText || {}), marginBottom: spacing.base}}>
            Individual performance metrics for each promoted post
          </span>

          {detailedPosts.map((post, index) => (
            <div
              key={`${post.post_type}-${post.id}-${index}`}
              style={styles.postCard}
            >
              {/* Post Header */}
              <div style={styles.postHeader}>
                {(post.cover_image_url || post.thumbnail_url) && (
                  <img
                    src={post.cover_image_url || post.thumbnail_url }
                    style={styles.postThumbnail}
                  />
                )}
                <div style={styles.postHeaderInfo}>
                  <span style={styles.postTitle} >
                    {post.title}
                  </span>
                  <div style={styles.postTypeBadge}>
                    <span style={styles.postTypeText}>
                      {post.post_type.charAt(0).toUpperCase() +
                        post.post_type.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={styles.metricsGrid}>
                {/* Reach */}
                <div style={styles.metricItem}>
                  <IoEye />
                  <span style={styles.metricValue}>
                    {post.reach.toLocaleString()}
                  </span>
                  <span style={styles.metricLabel}>Reach</span>
                </div>

                {/* Total Engagements */}
                <div style={styles.metricItem}>
                  <IoChevronBack />
                  <span style={styles.metricValue}>
                    {post.engagements.toLocaleString()}
                  </span>
                  <span style={styles.metricLabel}>Engagements</span>
                </div>

                {/* Likes */}
                <div style={styles.metricItem}>
                  <IoHeart />
                  <span style={styles.metricValue}>
                    {post.likes.toLocaleString()}
                  </span>
                  <span style={styles.metricLabel}>Likes</span>
                </div>

                {/* Comments */}
                <div style={styles.metricItem}>
                  <IoChevronBack />
                  <span style={styles.metricValue}>
                    {post.comments.toLocaleString()}
                  </span>
                  <span style={styles.metricLabel}>Comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
    )}
      {!loading && detailedPosts.length === 0 && (
        <div style={styles.emptyState}>
          <IoChevronBack />
          <span style={styles.emptyStateText}>No promoted posts found</span>
          <span style={styles.emptyStateSubText}>
            Create your first ad campaign to see analytics here
          </span>
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
    fontWeight: "300",
    alignSelf: "flex-start",
    marginTop: spacing.md,
    marginBottom: spacing.md,
    fontFamily: "InstrumentSans-Bold",
  },
  newAdTitle: {
    fontSize: fontSize.xl,
    fontWeight: "300",
    alignSelf: "flex-start",
    marginTop: spacing.md,
    fontFamily: "InstrumentSans-Bold",
  },
  newAdSubText: {
    fontSize: fontSize.md,
    alignSelf: "flex-start",
    color: "#666",
    marginBottom: spacing.xl2,
  },
  boostProfileTitle: {
    fontSize: fontSize.xl,
    fontWeight: "300",
    alignSelf: "flex-start",
    marginTop: spacing.md,
    fontFamily: "InstrumentSans-Bold",
  },
  boostProfileSubText: {
    fontSize: fontSize.md,
    alignSelf: "flex-start",
    color: "#666",
    marginBottom: spacing.xl2,
  },
  image: {
    width: 400,
    height: 400,
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  subText: {
    fontSize: fontSize.md,
    alignSelf: "flex-start",
    color: "#666",
    marginTop: -5,
    marginBottom: spacing.xl2,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  postsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.md,
    marginTop: 25,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  dateRangeText: {
    fontSize: fontSize.base,
    color: "#666",
    marginRight: spacing.sm,
  },
  summaryContainer: {
    marginTop: spacing.xl2,
    alignItems: "center",
  },
  summaryText: {
    fontSize: fontSize.base,
    color: "#333",
    marginBottom: spacing.sm,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    marginBottom: spacing.base,
  },
  postThumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: spacing.md,
    backgroundColor: "#f0f0f0",
  },
  postHeaderInfo: {
    flex: 1,
    justifyContent: "center",
  },
  postTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#333",
    marginBottom: spacing.sm,
  },
  postTypeBadge: {
    backgroundColor: "#00bfff",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
  },
  postTypeText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  metricItem: {
    alignItems: "center",
    width: "23%",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: "#333",
    marginTop: spacing.sm,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: "#666",
    marginTop: spacing.px,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl5,
    paddingBottom: spacing.xl5,
    width: "100%",
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: "#666",
    marginTop: spacing.base,
  },
  emptyStateSubText: {
    fontSize: fontSize.md,
    color: "#999",
    marginTop: spacing.sm,
    textAlign: "center",
  },
};
