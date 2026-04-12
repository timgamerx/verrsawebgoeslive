import { useState, useEffect, useCallback } from "react";
import {
  getUserSubscription,
  hasFeatureAccess,
  getFeatureValue,
  validateFeatureAccess,
  SubscriptionPlan,
  SubscriptionStatus,
  PlanFeatures,
} from "../lib/subscriptionManager";
import { fetchCurrentUserProfile, UserProfile } from "../lib/profileUtils";
import { supabase } from "../components/supabase";

// Global cache for subscription data (user-specific)
let subscriptionCache: {
  data: SubscriptionStatus | null;
  timestamp: number;
  loading: boolean;
  userId: string | null;
} = {
  data: null,
  timestamp: 0,
  loading: false,
  userId: null,
};

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Subscribers to cache updates
const cacheSubscribers: Set<(data: SubscriptionStatus | null) => void> =
  new Set();

const notifyCacheSubscribers = (data: SubscriptionStatus | null) => {
  cacheSubscribers.forEach((callback) => callback(data));
};

// Clear cache (useful for logout or account switch)
export const clearSubscriptionCache = () => {
  subscriptionCache = {
    data: null,
    timestamp: 0,
    loading: false,
    userId: null,
  };
  notifyCacheSubscribers(null);
};

/**
 * Hook to manage user subscription status with caching
 */
export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    subscriptionCache.data
  );
  const [loading, setLoading] = useState(!subscriptionCache.data);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async (force = false) => {
    const now = Date.now();
    const cacheAge = now - subscriptionCache.timestamp;

    // Get current user ID
    let currentUserId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch (e) {
      currentUserId = null;
    }

    // Clear cache if user has changed (account switch)
    if (currentUserId !== subscriptionCache.userId) {
      subscriptionCache = {
        data: null,
        timestamp: 0,
        loading: false,
        userId: currentUserId,
      };
      force = true; // Force refresh for new user
    }

    // Return cached data if fresh and not forced
    if (
      !force &&
      subscriptionCache.data &&
      cacheAge < CACHE_TTL &&
      !subscriptionCache.loading &&
      currentUserId === subscriptionCache.userId
    ) {
      setSubscription(subscriptionCache.data);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (subscriptionCache.loading) {
      return;
    }

    try {
      subscriptionCache.loading = true;
      setLoading(true);
      setError(null);

      const subscriptionStatus = await getUserSubscription();

      subscriptionCache.data = subscriptionStatus;
      subscriptionCache.timestamp = Date.now();
      subscriptionCache.userId = currentUserId;
      subscriptionCache.loading = false;

      setSubscription(subscriptionStatus);
      notifyCacheSubscribers(subscriptionStatus);
    } catch (err) {
      console.error("Error fetching subscription:", err);
      setError("Failed to fetch subscription status");
      subscriptionCache.loading = false;

      // Fallback to free plan
      const fallback = { plan: "free" as SubscriptionPlan, isActive: false };
      subscriptionCache.data = fallback;
      subscriptionCache.timestamp = Date.now();
      subscriptionCache.userId = currentUserId;
      setSubscription(fallback);
      notifyCacheSubscribers(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Subscribe to cache updates
    const updateSubscription = (data: SubscriptionStatus | null) => {
      setSubscription(data);
    };
    cacheSubscribers.add(updateSubscription);

    // Initial load
    refreshSubscription();

    return () => {
      cacheSubscribers.delete(updateSubscription);
    };
  }, [refreshSubscription]);

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
    plan: subscription?.plan || "free",
    isActive: subscription?.isActive || false,
  };
};

/**
 * Hook to check if user has access to a specific feature
 */
export const useFeatureAccess = (
  feature: keyof PlanFeatures,
  featureName?: string
) => {
  const { plan, loading, refreshSubscription } = useSubscription();

  const hasAccess = hasFeatureAccess(plan, feature);
  const validation = validateFeatureAccess(plan, feature, featureName);

  return {
    hasAccess,
    message: validation.message,
    loading,
    plan,
    requiresUpgrade: !hasAccess,
    refreshSubscription,
  };
};

/**
 * Hook to get feature value for user's plan
 */
export const useFeatureValue = <T,>(feature: keyof PlanFeatures) => {
  const { plan, loading } = useSubscription();

  const value = getFeatureValue(plan, feature) as T;

  return {
    value,
    loading,
    plan,
  };
};

/**
 * Hook to manage plan limits (upload time, promotional credits, etc.)
 */
export const usePlanLimits = () => {
  const { plan, loading } = useSubscription();

  const uploadTimeLimit = getFeatureValue<number>(plan, "uploadTimeLimit");
  const customBranding = getFeatureValue<string>(plan, "customBranding");
  const promotionalCredits = getFeatureValue<string>(
    plan,
    "promotionalCredits"
  );

  const getPromotionalCreditsLimit = () => {
    switch (promotionalCredits) {
      case "unlimited":
        return Infinity;
      case "limited":
        return plan === "free" ? 5 : 20;
      case "none":
      default:
        return 0;
    }
  };

  const canUploadContent = (durationMinutes: number) => {
    return durationMinutes <= uploadTimeLimit;
  };

  const getUploadLimitMessage = (durationMinutes: number) => {
    if (canUploadContent(durationMinutes)) {
      return null;
    }

    const requiredPlan = durationMinutes <= 45 ? "Basic" : "Premium";
    return `Content duration (${durationMinutes} min) exceeds your ${plan} plan limit (${uploadTimeLimit} min). Upgrade to ${requiredPlan} to upload longer content.`;
  };

  return {
    plan,
    loading,
    limits: {
      uploadTimeMinutes: uploadTimeLimit,
      customBranding,
      promotionalCredits: getPromotionalCreditsLimit(),
    },
    checks: {
      canUploadContent,
      getUploadLimitMessage,
    },
  };
};

/**
 * Hook to check multiple features at once
 */
export const useMultipleFeatureAccess = (features: (keyof PlanFeatures)[]) => {
  const { plan, loading } = useSubscription();

  const results = features.reduce((acc, feature) => {
    acc[feature] = hasFeatureAccess(plan, feature);
    return acc;
  }, {} as Record<keyof PlanFeatures, boolean>);

  const allGranted = features.every((feature) => results[feature]);
  const anyGranted = features.some((feature) => results[feature]);

  return {
    results,
    allGranted,
    anyGranted,
    loading,
    plan,
  };
};

/**
 * Hook for user profile with subscription info
 */
export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription, refreshSubscription } = useSubscription();

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userProfile = await fetchCurrentUserProfile();
      setProfile(userProfile);

      // Ensure subscription data is in sync
      if (userProfile && subscription) {
        if (userProfile.subscription_plan !== subscription.plan) {
          // Update profile with current subscription
          userProfile.subscription_plan = subscription.plan;
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to fetch user profile");
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    subscription,
    refreshSubscription,
    planName: subscription?.plan || profile?.subscription_plan || "free",
  };
};

/**
 * Hook to check verification badge eligibility
 */
export const useVerificationStatus = () => {
  const { hasAccess, loading, plan } = useFeatureAccess(
    "verificationBadge",
    "Verification Badge"
  );

  const getVerificationMessage = () => {
    if (hasAccess) {
      return "You're eligible for a verification badge!";
    }
    return "Upgrade to Basic or Premium to get a verification badge";
  };

  return {
    isEligible: hasAccess,
    message: getVerificationMessage(),
    loading,
    plan,
  };
};

/**
 * Hook for analytics access
 */
export const useAnalyticsAccess = () => {
  const { hasAccess, loading, plan } = useFeatureAccess(
    "advancedAnalytics",
    "Advanced Analytics"
  );

  return {
    hasAdvancedAnalytics: hasAccess,
    loading,
    plan,
    canViewMetrics: hasAccess,
    upgradeMessage: hasAccess
      ? null
      : "Upgrade to Basic or Premium to access advanced analytics",
  };
};
