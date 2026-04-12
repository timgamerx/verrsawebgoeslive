import { supabase } from "../components/supabase";
import { getUserSubscription } from "./subscriptionManager";

/**
 * Ad Impression Tracking Service
 * Tracks when ads are actually displayed to users for accurate monetization
 */

export interface AdImpressionData {
  post_id: string;
  post_type: "article" | "video" | "podcast";
  author_id: string;
  viewer_id: string | null;
  ad_displayed: boolean;
  ad_provider?: string;
  timestamp: string;
}

/**
 * Track when an ad is successfully displayed
 * Only call this when ad network confirms ad render
 */
export const trackAdImpression = async (
  postId: string,
  postType: "article" | "video" | "podcast",
  authorId: string,
  viewerId: string | null = null
): Promise<boolean> => {
  try {
    // Gate DB counting based on author's subscription plan
    const sub = await getUserSubscription(authorId);
    if (sub.plan === "free") {
      // Skip recording ad impression for free plan owners
      return true;
    }
    const { error } = await supabase.from("ad_impressions").insert({
      post_id: postId,
      post_type: postType,
      author_id: authorId,
      viewer_id: viewerId,
      ad_displayed: true,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      // Silently fail if table doesn't exist or RLS blocks insert
      // This is expected if ad_impressions table is not yet set up
      return false;
    }

    return true;
  } catch (error) {
    // Silently fail - ad tracking is non-critical functionality
    return false;
  }
};

/**
 * Get ad impression count for a specific user
 * Used for calculating earnings
 */
export const getAdImpressionCount = async (
  authorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  try {
    let query = supabase
      .from("ad_impressions")
      .select("*", { count: "exact", head: true })
      .eq("author_id", authorId)
      .eq("ad_displayed", true);

    if (startDate) {
      query = query.gte("timestamp", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("timestamp", endDate.toISOString());
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error getting ad impression count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Failed to get ad impression count:", error);
    return 0;
  }
};

/**
 * Calculate earnings from ad impressions
 * $2.00 per 1,000 impressions where ads actually show
 */
export const calculateAdImpressionEarnings = async (
  authorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const impressionCount = await getAdImpressionCount(
    authorId,
    startDate,
    endDate
  );
  const RATE_PER_1000 = 2.0;
  return (impressionCount / 1000) * RATE_PER_1000;
};

/**
 * Get ad impression analytics for a specific post
 */
export const getPostAdImpressions = async (postId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from("ad_impressions")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("ad_displayed", true);

    if (error) {
      console.error("Error getting post ad impressions:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Failed to get post ad impressions:", error);
    return 0;
  }
};

/**
 * Simulate ad display check
 * In production, integrate with real ad network (Google AdMob, etc.)
 */
export const checkAdAvailability = async (): Promise<boolean> => {
  // TODO: Replace with actual ad network SDK check
  // For now, simulate 80% ad fill rate
  return Math.random() > 0.2;
};
