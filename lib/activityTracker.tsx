import { supabase } from "../components/supabase";

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 60000; // Update every 60 seconds to avoid excessive database writes

/**
 * Updates the last_active timestamp for the current user in the profiles table
 * Throttled to prevent excessive database writes
 */
export async function updateLastActive(): Promise<void> {
  try {
    console.log("[ActivityTracker] updateLastActive called");
    const now = Date.now();

    // Throttle updates to once per minute
    if (now - lastUpdateTime < UPDATE_INTERVAL) {
      console.log("[ActivityTracker] Throttled - skipping update");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      console.log("[ActivityTracker] No session or user ID - skipping update");
      return;
    }

    console.log(
      "[ActivityTracker] Updating last_active for user:",
      session.user.id,
    );
    const { error } = await supabase
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", session.user.id);

    if (error) {
      // Silently fail if column doesn't exist yet - don't block app
      if (error.code && error.code !== "42703") {
        console.error("[ActivityTracker] Error updating last_active:", error);
      } else {
        console.log(
          "[ActivityTracker] Column last_active does not exist yet (expected until SQL migration is run)",
        );
      }
    } else {
      console.log("[ActivityTracker] Successfully updated last_active");
      lastUpdateTime = now;
    }
  } catch (error) {
    console.error("[ActivityTracker] Exception in updateLastActive:", error);
  }
}

/**
 * Force update last_active immediately (bypasses throttle)
 * Use for critical events like login
 */
export async function forceUpdateLastActive(): Promise<void> {
  try {
    console.log("[ActivityTracker] forceUpdateLastActive called");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      console.log(
        "[ActivityTracker] No session or user ID - skipping force update",
      );
      return;
    }

    console.log(
      "[ActivityTracker] Force updating last_active for user:",
      session.user.id,
    );
    const { error } = await supabase
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", session.user.id);

    if (error) {
      // Silently fail if column doesn't exist yet - don't block app
      if (error.code && error.code !== "42703") {
        console.error(
          "[ActivityTracker] Error force updating last_active:",
          error,
        );
      } else {
        console.log(
          "[ActivityTracker] Column last_active does not exist yet (expected until SQL migration is run)",
        );
      }
    } else {
      console.log("[ActivityTracker] Successfully force updated last_active");
      lastUpdateTime = Date.now();
    }
  } catch (error) {
    console.error(
      "[ActivityTracker] Exception in forceUpdateLastActive:",
      error,
    );
  }
}
