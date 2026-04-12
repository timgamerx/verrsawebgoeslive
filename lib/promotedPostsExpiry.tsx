/**
 * Promoted Posts Expiry Management
 *
 * Automatically expires promoted posts after their end_date passes
 */

import { supabase } from "../components/supabase";

/**
 * Manually trigger a check for expired promoted posts
 * This calls the Edge Function to check and update all expired campaigns
 */
export async function checkExpiredPromotedPosts(): Promise<{
  success: boolean;
  expiredCount?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "expire-promoted-posts",
      {
        body: {},
      },
    );

    if (error) {
      console.error("Error checking expired promoted posts:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      expiredCount: data?.result?.expired_count || 0,
    };
  } catch (error: any) {
    console.error("Error calling expire-promoted-posts function:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
