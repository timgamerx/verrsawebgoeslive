/**
 * Subscription Expiry Management
 *
 * This module provides utilities to check and handle expired subscriptions.
 * Subscriptions are automatically expired through:
 * 1. Database triggers on INSERT/UPDATE (real-time)
 * 2. Edge Function that can be called manually or via cron
 * 3. Client-side check on app launch
 */

import { supabase } from "../components/supabase";

const PLAN_PRICES: Record<"basic" | "premium", Record<"monthly" | "yearly", number>> = {
  basic: {
    monthly: 2.99,
    yearly: 29.99,
  },
  premium: {
    monthly: 9.99,
    yearly: 99.99,
  },
};

type BillingCycle = "monthly" | "yearly";

function getNextExpiryDate(cycle: BillingCycle): Date {
  const nextExpiry = new Date();
  if (cycle === "yearly") {
    nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
  } else {
    nextExpiry.setMonth(nextExpiry.getMonth() + 1);
  }
  return nextExpiry;
}

async function tryBalanceAutoRenew(
  userId: string,
  plan: "basic" | "premium",
): Promise<boolean> {
  const { data: lastBalancePurchase, error: purchaseError } = await supabase
    .from("subscription_purchases")
    .select("id, product_id, billing_cycle, metadata")
    .eq("user_id", userId)
    .eq("plan_type", plan)
    .eq("status", "active")
    .contains("metadata", { payment_method: "balance" })
    .order("purchase_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (purchaseError || !lastBalancePurchase) {
    return false;
  }

  const metadata = (lastBalancePurchase.metadata || {}) as Record<string, any>;
  if (metadata.auto_renew === false) {
    return false;
  }

  const billingCycle: BillingCycle =
    lastBalancePurchase.billing_cycle === "yearly" ? "yearly" : "monthly";
  const renewalAmount = PLAN_PRICES[plan][billingCycle];
  const renewalReference = `balance_renewal_${plan}_${billingCycle}_${userId}_${Date.now()}`;

  const { error: balanceError } = await supabase.rpc("update_user_balance", {
    p_user_id: userId,
    p_amount: -renewalAmount,
    p_description: `Subscription auto-renewal: ${plan} plan (${billingCycle === "yearly" ? "1 year" : "1 month"})`,
  });

  if (balanceError) {
    return false;
  }

  const nextExpiry = getNextExpiryDate(billingCycle);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      subscription_plan: plan,
      subscription_status: "active",
      subscription_expires_at: nextExpiry.toISOString(),
      is_verified: true,
      verified_at: new Date().toISOString(),
      verification_type: "subscription",
    })
    .eq("id", userId);

  if (profileError) {
    return false;
  }

  await supabase.from("subscription_purchases").insert({
    user_id: userId,
    product_id:
      lastBalancePurchase.product_id || `subscription_${plan}_${billingCycle}_balance`,
    order_id: renewalReference,
    purchase_token: null,
    purchase_time: Date.now(),
    plan_type: plan,
    billing_cycle: billingCycle,
    platform: "balance",
    status: "active",
    expires_at: nextExpiry.toISOString(),
    metadata: {
      ...metadata,
      payment_method: "balance",
      auto_renew: true,
      renewal_reference: renewalReference,
      renewed_from_purchase_id: lastBalancePurchase.id,
      renewed_at: new Date().toISOString(),
    },
  });

  await supabase.from("balance_transactions").insert({
    user_id: userId,
    amount: renewalAmount,
    type: "debit",
    description: `Subscription auto-renewal: ${plan} plan (${billingCycle === "yearly" ? "1 year" : "1 month"})`,
    reference: renewalReference,
    metadata: {
      payment_method: "balance",
      billing_cycle: billingCycle,
      plan_type: plan,
    },
  });

  return true;
}

/**
 * Manually trigger a check for expired subscriptions
 * This calls the Edge Function to check and update all expired subscriptions
 */
export async function checkExpiredSubscriptions(): Promise<{
  success: boolean;
  updatedCount?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "expire-subscriptions",
      {
        body: {},
      },
    );

    if (error) {
      console.error("Error checking expired subscriptions:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      updatedCount: data?.result?.updated_count || 0,
    };
  } catch (error: any) {
    console.error("Error calling expire-subscriptions function:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if current user's subscription has expired and update if needed
 * This is a lightweight client-side check that runs on app launch
 */
export async function checkCurrentUserSubscription(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Get current profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_expires_at")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("Error fetching profile:", error);
      return false;
    }

    // Check if subscription is expired
    const isExpired =
      profile.subscription_expires_at &&
      new Date(profile.subscription_expires_at) < new Date() &&
      profile.subscription_status !== "inactive";

    if (isExpired) {
      const currentPlan = profile.subscription_plan as "free" | "basic" | "premium";

      if (currentPlan === "basic" || currentPlan === "premium") {
        const renewed = await tryBalanceAutoRenew(user.id, currentPlan);
        if (renewed) {
          console.log("Subscription auto-renewed with balance");
          return true;
        }
      }

      console.log("Subscription expired, updating to free plan...");

      // Update to free/inactive and remove verification
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_status: "inactive",
          subscription_plan: "free",
          subscription_expires_at: null,
          is_verified: false,
          verified_at: null,
          verification_type: null,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating expired subscription:", updateError);
        return false;
      }

      console.log("Subscription updated to free/inactive");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking current user subscription:", error);
    return false;
  }
}

/**
 * Schedule periodic checks for expired subscriptions
 * Call this in your app's initialization to periodically check for expired subscriptions
 *
 * @param intervalMinutes - How often to check (default: 60 minutes)
 */
export function scheduleSubscriptionChecks(
  intervalMinutes: number = 60,
): NodeJS.Timeout {
  // Initial check
  checkCurrentUserSubscription();

  // Schedule periodic checks
  const interval = setInterval(
    () => {
      checkCurrentUserSubscription();
    },
    intervalMinutes * 60 * 1000,
  );

  return interval;
}
