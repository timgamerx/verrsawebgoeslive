import { supabase } from "../components/supabase";

// Throttle interval - update at most once per minute
const UPDATE_INTERVAL = 60 * 1000; // 60 seconds
const lastUpdateTimes: { [communityId: string]: number } = {};

/**
 * Update the last_active timestamp for a community
 * Throttled to prevent excessive database writes
 */
export async function updateCommunityLastActive(
  communityId: string,
): Promise<void> {
  if (!communityId) {
    console.log("[CommunityActivityTracker] No communityId provided");
    return;
  }

  console.log(
    "[CommunityActivityTracker] updateCommunityLastActive called for:",
    communityId,
  );
  const now = Date.now();

  // Throttle updates to once per minute per community
  if (
    lastUpdateTimes[communityId] &&
    now - lastUpdateTimes[communityId] < UPDATE_INTERVAL
  ) {
    console.log(
      "[CommunityActivityTracker] Throttled - skipping update for:",
      communityId,
    );
    return;
  }

  try {
    const { error } = await supabase
      .from("community")
      .update({ last_active: new Date().toISOString() })
      .eq("id", communityId);

    if (error) {
      // Check if error is because column doesn't exist yet (code 42703)
      if (error.code && error.code !== "42703") {
        console.error(
          "[CommunityActivityTracker] Error updating last_active:",
          error,
        );
      } else {
        console.log(
          "[CommunityActivityTracker] Column last_active does not exist yet in community table",
        );
      }
    } else {
      console.log(
        "[CommunityActivityTracker] Successfully updated last_active for community:",
        communityId,
      );
      lastUpdateTimes[communityId] = now;
    }
  } catch (error) {
    console.error(
      "[CommunityActivityTracker] Exception updating last_active:",
      error,
    );
  }
}

/**
 * Force update without throttling (for critical events)
 */
export async function forceUpdateCommunityLastActive(
  communityId: string,
): Promise<void> {
  if (!communityId) return;

  console.log(
    "[CommunityActivityTracker] forceUpdateCommunityLastActive called for:",
    communityId,
  );

  try {
    const { error } = await supabase
      .from("community")
      .update({ last_active: new Date().toISOString() })
      .eq("id", communityId);

    if (error) {
      if (error.code && error.code !== "42703") {
        console.error(
          "[CommunityActivityTracker] Error in force update:",
          error,
        );
      }
    } else {
      console.log(
        "[CommunityActivityTracker] Force updated last_active for community:",
        communityId,
      );
      lastUpdateTimes[communityId] = Date.now();
    }
  } catch (error) {
    console.error(
      "[CommunityActivityTracker] Exception in force update:",
      error,
    );
  }
}
