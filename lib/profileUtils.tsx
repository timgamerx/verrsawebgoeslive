import { supabase } from "../components/supabase";

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  avatar?: string;
  bio?: string;
  is_verified?: boolean;
  is_admin?: boolean;
  subscription_status?: string;
  subscription_plan?: "free" | "basic" | "premium";
  early_creator_program_until?: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_NEW_VIEWER_WINDOW_DAYS = 30;

type EarlyCreatorFields = {
  early_creator_program_until?: string | null;
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const isExclusiveEarlyCreator = (
  value?: EarlyCreatorFields | null,
) => {
  const timestamp = toTimestamp(value?.early_creator_program_until);
  if (!timestamp) {
    return false;
  }

  return timestamp > Date.now();
};

export const isNewViewerForEarlyCreatorSpotlight = (
  createdAt?: string | null,
  windowDays = DEFAULT_NEW_VIEWER_WINDOW_DAYS,
) => {
  const timestamp = toTimestamp(createdAt);
  if (!timestamp) {
    return false;
  }

  return Date.now() - timestamp <= windowDays * 24 * 60 * 60 * 1000;
};

/**
 * Fetches the current authenticated user's profile from Supabase
 * Creates a default profile if none exists
 * Merges with local AsyncStorage data if available
 */
export const fetchCurrentUserProfile =
  async (): Promise<UserProfile | null> => {
    try {
      // Get current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found");
        return null;
      }

      console.log("Fetching profile for authenticated user:", user.id);

      // Try to fetch from Supabase profiles table
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Profile query result:", { profileData, error });

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile from Supabase:", error);
      }

      let finalProfile: UserProfile = {
        id: user.id,
        email: user.email || "",
        full_name: "",
        username: "",
        avatar_url: undefined,
        bio: "",
        is_verified: false,
      };

      if (profileData) {
        // Use Supabase profile data
        finalProfile = {
          ...profileData,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          avatar: profileData.avatar_url,
        };
      } else {
        // Create default profile in Supabase if none exists
        const defaultProfile = {
          id: user.id,
          username: user.email?.split("@")[0] || "user",
          email: user.email || "",
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          full_name: user.user_metadata?.full_name || "",
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: "",
          is_verified: false,
          subscription_plan: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .upsert(defaultProfile)
          .select("*")
          .single();

        if (!insertError && newProfile) {
          finalProfile = {
            ...newProfile,
            firstName: newProfile.first_name,
            lastName: newProfile.last_name,
            avatar: newProfile.avatar_url,
          };
        }
      }

      return finalProfile;
    } catch (error) {
      console.error("Error fetching current user profile:", error);
      return null;
    }
  };

/**
 * Updates the current user's profile in both Supabase and AsyncStorage
 */
export const updateUserProfile = async (
  profileUpdates: Partial<UserProfile>,
): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    // Prepare data for Supabase
    const supabaseUpdates: any = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (profileUpdates.firstName)
      supabaseUpdates.first_name = profileUpdates.firstName;
    if (profileUpdates.lastName)
      supabaseUpdates.last_name = profileUpdates.lastName;
    if (profileUpdates.username)
      supabaseUpdates.username = profileUpdates.username;
    if (profileUpdates.email) supabaseUpdates.email = profileUpdates.email;
    if (profileUpdates.phone) supabaseUpdates.phone = profileUpdates.phone;
    if (profileUpdates.avatar_url)
      supabaseUpdates.avatar_url = profileUpdates.avatar_url;
    if (profileUpdates.avatar)
      supabaseUpdates.avatar_url = profileUpdates.avatar;
    if (profileUpdates.bio) supabaseUpdates.bio = profileUpdates.bio;
    if (profileUpdates.full_name)
      supabaseUpdates.full_name = profileUpdates.full_name;
    if (profileUpdates.subscription_plan)
      supabaseUpdates.subscription_plan = profileUpdates.subscription_plan;

    // Update in Supabase
    const { error } = await supabase.from("profiles").upsert(supabaseUpdates);

    if (error) {
      console.error("Error updating profile in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
};

/**
 * Gets the user's member since date
 */
export const getMemberSinceDate = (createdAt?: string): string => {
  if (!createdAt) return "Jan 2023";

  const createdDate = new Date(createdAt);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[createdDate.getMonth()];
  const year = createdDate.getFullYear();
  return `${month} ${year}`;
};

/**
 * Debug function to test authentication and profile fetching
 */
export const debugAuthAndProfile = async () => {
  try {
    console.log("=== DEBUG: Authentication and Profile Test ===");

    // Test authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("Auth result:", {
      user: user?.id,
      email: user?.email,
      authError,
    });

    if (!user) {
      console.log("❌ No authenticated user found");
      return;
    }

    // Test session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log("Session result:", {
      sessionExists: !!session,
      sessionUserId: session?.user?.id,
      sessionError,
    });

    // Test profile query
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    console.log("Profile query result:", { profileData, profileError });

    // Test profile fetching function
    const fetchedProfile = await fetchCurrentUserProfile();
    console.log("Fetched profile:", fetchedProfile);

    console.log("=== END DEBUG ===");
    return { user, session, profileData, fetchedProfile };
  } catch (error) {
    console.error("Debug function error:", error);
    return null;
  }
};
