import { supabase } from "../components/supabase";
import { sendSubscriptionConfirmationEmail } from "./emailService";

export type SubscriptionPlan = "free" | "basic" | "premium";

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: Date;
  paymentMethod?: string;
  subscriptionId?: string;
}

export interface PlanFeatures {
  verificationBadge: boolean;
  monetizeContent: boolean;
  advancedAnalytics: boolean;
  priorityInSearch: boolean;
  subscriberOnlyContent: boolean;
  earlyAccess: boolean;
  uploadTimeLimit: number; // minutes
  customBranding: "none" | "limited" | "unlimited";
  directSupport: boolean;
  promotionalCredits: "none" | "limited" | "unlimited";
}

// Define features for each plan
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    verificationBadge: false,
    monetizeContent: true, // ads only
    advancedAnalytics: false,
    priorityInSearch: false,
    subscriberOnlyContent: false,
    earlyAccess: false,
    uploadTimeLimit: 1,
    customBranding: "limited",
    directSupport: false,
    promotionalCredits: "limited",
  },
  basic: {
    verificationBadge: true,
    monetizeContent: true,
    advancedAnalytics: true,
    priorityInSearch: true,
    subscriberOnlyContent: false,
    earlyAccess: true,
    uploadTimeLimit: 5,
    customBranding: "limited",
    directSupport: true,
    promotionalCredits: "limited",
  },
  premium: {
    verificationBadge: true,
    monetizeContent: true,
    advancedAnalytics: true,
    priorityInSearch: true,
    subscriberOnlyContent: true,
    earlyAccess: true,
    uploadTimeLimit: 60,
    customBranding: "unlimited",
    directSupport: true,
    promotionalCredits: "unlimited",
  },
};

// Plan pricing
export const PLAN_PRICING = {
  free: 0,
  basic: 2.99,
  premium: 9.99,
};

/**
 * Get user's current subscription status
 * Optimized with single query and early returns
 */
export const getUserSubscription = async (
  userId?: string,
): Promise<SubscriptionStatus> => {
  try {
    let currentUserId = userId;

    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      return { plan: "free", isActive: false };
    }

    // Single optimized query - only fetch what we need from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_expires_at")
      .eq("id", currentUserId)
      .maybeSingle(); // Use maybeSingle() to avoid throwing on no rows

    if (profileError || !profile) {
      return { plan: "free", isActive: false };
    }

    const plan = (profile.subscription_plan as SubscriptionPlan) || "free";
    const isActive = profile.subscription_status === "active";

    // Fast path: if not active or free plan, return immediately without querying subscriptions table
    if (!isActive || plan === "free") {
      return { plan: "free", isActive: false };
    }

    // Only query subscriptions table for active paid users who need expiry details
    // This is now optional and doesn't block the main flow
    return {
      plan: plan,
      isActive: true,
      expiresAt: profile.subscription_expires_at
        ? new Date(profile.subscription_expires_at)
        : undefined,
    };
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return { plan: "free", isActive: false };
  }
};

/**
 * Check if user has access to a specific feature
 */
export const hasFeatureAccess = (
  userPlan: SubscriptionPlan,
  feature: keyof PlanFeatures,
): boolean => {
  const planFeatures = PLAN_FEATURES[userPlan];
  return planFeatures[feature] as boolean;
};

/**
 * Get feature value for user's plan
 */
export const getFeatureValue = <T,>(
  userPlan: SubscriptionPlan,
  feature: keyof PlanFeatures,
): T => {
  const planFeatures = PLAN_FEATURES[userPlan];
  return planFeatures[feature] as T;
};

/**
 * Check if user can upgrade to a plan
 */
export const canUpgradeToPlan = (
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan,
): boolean => {
  const planHierarchy = { free: 0, basic: 1, premium: 2 };
  return planHierarchy[targetPlan] > planHierarchy[currentPlan];
};

/**
 * Check if user can downgrade to a plan
 */
export const canDowngradeToPlan = (
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan,
): boolean => {
  const planHierarchy = { free: 0, basic: 1, premium: 2 };
  return planHierarchy[targetPlan] < planHierarchy[currentPlan];
};

/**
 * Update user's subscription plan
 */
export const updateUserSubscription = async (
  userId: string,
  plan: SubscriptionPlan,
  paymentReference?: string,
  paymentMethod?: string,
): Promise<boolean> => {
  try {
    // Deactivate old subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "inactive" })
      .eq("user_id", userId);

    // Create new subscription (free users don't need a subscription record for billing)
    let expiresAt: Date | null = null;

    if (plan !== "free") {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from now

      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_name: plan === "basic" ? "Basic Users" : "Premium Users",
        plan_price: PLAN_PRICING[plan],
        currency: "USD",
        payment_reference: paymentReference,
        payment_method: paymentMethod || "card",
        status: "active",
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error("Error creating subscription:", error);
        return false;
      }
    }

    // Update user profile with subscription plan and verification status
    const isVerified = plan === "basic" || plan === "premium";
    const profileUpdate: any = {
      subscription_plan: plan,
      subscription_expires_at: expiresAt?.toISOString() || null,
      updated_at: new Date().toISOString(),
    };

    // Update verification fields if upgrading to paid plan
    if (isVerified) {
      profileUpdate.is_verified = true;
      profileUpdate.verified_at = new Date().toISOString();
      profileUpdate.verification_type = "subscription"; // or "premium" based on plan
      profileUpdate.subscription_status = "active";
    } else {
      // If downgrading to free, remove verification
      profileUpdate.is_verified = false;
      profileUpdate.verified_at = null;
      profileUpdate.verification_type = null;
      profileUpdate.subscription_status = "inactive";
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating user profile:", profileError);
      return false;
    }

    // Send subscription confirmation email to user (for paid plans only)
    if (plan !== "free") {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          await sendSubscriptionConfirmationEmail(
            profile.email,
            profile.full_name || "User",
            plan,
            PLAN_PRICING[plan],
            (expiresAt || new Date()).toLocaleDateString(),
          );
          console.log("✅ Subscription confirmation email sent");
        }
      } catch (emailError) {
        console.error(
          "Failed to send subscription confirmation email:",
          emailError,
        );
        // Don't fail the subscription update if email fails
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating subscription:", error);
    return false;
  }
};

/**
 * Check content upload time limit
 */
export const checkUploadTimeLimit = (
  userPlan: SubscriptionPlan,
  contentDurationMinutes: number,
): boolean => {
  const limit = getFeatureValue<number>(userPlan, "uploadTimeLimit");
  return contentDurationMinutes <= limit;
};

/**
 * Get promotional credits limit
 */
export const getPromotionalCreditsLimit = (
  userPlan: SubscriptionPlan,
): number => {
  const credits = getFeatureValue<string>(userPlan, "promotionalCredits");
  switch (credits) {
    case "unlimited":
      return Infinity;
    case "limited":
      return userPlan === "free" ? 5 : 20; // Free: 5 credits, Basic: 20 credits
    case "none":
    default:
      return 0;
  }
};

/**
 * Validate feature access with user feedback
 */
export const validateFeatureAccess = (
  userPlan: SubscriptionPlan,
  feature: keyof PlanFeatures,
  featureName?: string,
): { hasAccess: boolean; message?: string } => {
  const hasAccess = hasFeatureAccess(userPlan, feature);

  if (hasAccess) {
    return { hasAccess: true };
  }

  const requiredPlan =
    feature === "verificationBadge" || feature === "advancedAnalytics"
      ? "basic"
      : "premium";
  const planName = requiredPlan === "basic" ? "Basic" : "Premium";

  return {
    hasAccess: false,
    message: `${
      featureName || "This feature"
    } requires a ${planName} subscription. Upgrade now to unlock this feature.`,
  };
};
