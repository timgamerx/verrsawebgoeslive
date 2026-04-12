import { supabase } from "../components/supabase";

/**
 * Get promoted post details for a post
 * Returns call_to_action if the post has an active promotion
 */
export const getPromotedPostDetails = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from("promoted_posts")
      .select("call_to_action, end_date, status")
      .eq("post_id", postId)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return null;
    }

    // Double-check the end_date hasn't passed (in case trigger hasn't run yet)
    if (data.end_date && new Date(data.end_date) < new Date()) {
      return null;
    }

    return {
      callToAction: data.call_to_action as
        | "listen_now"
        | "view_now"
        | "like_now"
        | undefined,
    };
  } catch (error) {
    console.error("Error fetching promoted post details:", error);
    return null;
  }
};

/**
 * Get promoted post details for multiple posts in batch
 * More efficient for feed screens
 */
export const getPromotedPostDetailsBatch = async (
  postIds: string[],
): Promise<Map<string, "listen_now" | "view_now" | "like_now">> => {
  try {
    if (postIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from("promoted_posts")
      .select("post_id, call_to_action, end_date, status")
      .in("post_id", postIds)
      .eq("status", "active");

    if (error || !data) {
      console.error("Error fetching batch promoted posts:", error);
      return new Map();
    }

    const now = new Date();
    const resultMap = new Map<string, "listen_now" | "view_now" | "like_now">();

    data.forEach((item) => {
      // Only include if not expired
      if (!item.end_date || new Date(item.end_date) >= now) {
        if (item.call_to_action) {
          resultMap.set(
            item.post_id,
            item.call_to_action as "listen_now" | "view_now" | "like_now",
          );
        }
      }
    });

    return resultMap;
  } catch (error) {
    console.error("Error in getPromotedPostDetailsBatch:", error);
    return new Map();
  }
};
