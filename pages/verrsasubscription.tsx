// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoCheckmark, IoChevronBack } from 'react-icons/io5';
import { useSubscription } from "../hooks/useSubscription";
import {
  canUpgradeToPlan,
  canDowngradeToPlan,
  SubscriptionPlan,
} from '../lib/subscriptionManager';
import {
  iapService,
  PRODUCT_IDS,
  PurchaseProduct,
} from '../lib/inAppPurchases';
import { useEffect } from "react";
import { useTheme } from '../context/ThemeProvider';
import { supabase } from '../components/supabase';
import { TbChevronLeft } from 'react-icons/tb'

export default function VerrsaSubscription() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const freeFeaturesWithMark = [
    "Monetize Content",
    "Video Upload (1 min)",
    "Podcast Duration (10 min)",
    "Custom Branding (Limited)",
    "Community Image Posts",
  ];
  const basicFeaturesWithMark = [
    "Verification Badge",
    "Monetize Content",
    "Advanced Analytics",
    "Priority in Search",
    "Video Upload (5 min)",
    "Podcast Duration (45 min)",
    "Podcast Episodes (up to 5)",
    "Custom Branding (Limited)",
    "Direct Support Line",
    "Promotional Credits (Limited)",
    "Live Streaming Access",
    "Community Video Posts (5 min)",
    "Share as Image",
  ];
  const [selectedPlan, setSelectedPlan] = useState("");
  const [iapProducts, setIapProducts] = useState<PurchaseProduct[]>([]);
  const [iapLoading, setIapLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [payingWithBalance, setPayingWithBalance] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [isFirstSubscriber, setIsFirstSubscriber] = useState(false);

  const FIRST_SUBSCRIBER_DISCOUNT = 0.3; // 30% off for first-time subscribers
  const getEffectivePrice = (basePrice: number) =>
    isFirstSubscriber && basePrice > 0
      ? parseFloat((basePrice * (1 - FIRST_SUBSCRIBER_DISCOUNT)).toFixed(2))
      : basePrice;

  // Use subscription hook to get current plan
  const { subscription, loading, refreshSubscription } = useSubscription();
  const currentPlan = subscription?.plan || "free";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh to bypass cache
      await Promise.all([refreshSubscription(true), loadBalance()]);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    initializeIAP();
    loadBalance();
    checkFirstSubscriberStatus();
  }, []);

  const loadBalance = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setBalance(parseFloat(data.balance) || 0);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  const checkFirstSubscriberStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("subscription_purchases")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setIsFirstSubscriber((count ?? 0) === 0);
    } catch (error) {
      console.error("Error checking first subscriber status:", error);
    }
  };

  const initializeIAP = async () => {
    setIapLoading(true);

    // Check IAP status first
    const status = iapService.getIAPStatus();
    console.log("📊 IAP Status:", status);

    if (status.isWeb || !status.functionsAvailable?.initConnection) {
      console.warn("⚠️ IAP not available - running in Expo Go or on web");
      setIapLoading(false);
      return;
    }

    const initialized = await iapService.initialize();
    if (initialized) {
      // Fetch subscription products
      const products = await iapService.getProducts([
        PRODUCT_IDS.SUBSCRIPTION_BASIC_MONTHLY,
        PRODUCT_IDS.SUBSCRIPTION_PREMIUM_MONTHLY,
      ]);
      setIapProducts(products);
    } else {
      console.warn("⚠️ IAP initialization failed - may be in Expo Go");
    }
    setIapLoading(false);
  };

  const handleBalancePayment = async (
    planType: SubscriptionPlan,
    price: number,
    cycle: "monthly" | "yearly",
  ) => {
    if (balance <= 0 || balance < price) {
      window.alert(/* Alert: */ 
        "Insufficient Balance",
        `You need $${price.toFixed(
          2,
        )} to subscribe. Your current balance is $${balance.toFixed(
          2,
        )}. Would you like to top up?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Top Up",
            onPress: () => {
              setSelectedPlan("");
              router.push("/balance");
            },
          },
        ],
      );
      return;
    }

    window.alert(`Pay $${price.toFixed(2)} from your balance to subscribe to ${
        planType.charAt(0).toUpperCase() + planType.slice(1)
      } plan? This subscription auto-renews ${
        cycle === "yearly" ? "yearly" : "monthly"
      } until you cancel.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setPayingWithBalance(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) {
                window.alert("User not authenticated");
                return;
              }

              const purchaseReference = `balance_${planType}_${cycle}_${user.id}_${Date.now()}`;
              const productId = `subscription_${planType}_${cycle}_balance`;

              // Deduct from balance
              const { error: balanceError } = await supabase.rpc(
                "update_user_balance",
                {
                  p_user_id: user.id,
                  p_amount: -price,
                  p_description: `Subscription: ${planType} plan (${cycle === "yearly" ? "1 year" : "1 month"})${isFirstSubscriber ? " - 30% first subscriber discount" : ""}`,
                
                },
              );

              if (balanceError) {
                throw balanceError;
              }

              // Update subscription
              const expiresAt = new Date();
              if (cycle === "yearly") {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
              } else {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
              }

              const { error: subError } = await supabase
                .from("profiles")
                .update({
                  subscription_plan: planType,
                  subscription_status: "active",
                  subscription_expires_at: expiresAt.toISOString(),
                })
                .eq("id", user.id);

              if (subError) {
                throw subError;
              }

              // Record subscription purchase
              const { error: purchaseError } = await supabase
                .from("subscription_purchases")
                .upsert(
                  {
                    user_id: user.id,
                    product_id: productId,
                    order_id: purchaseReference,
                    purchase_token: null,
                    purchase_time: Date.now(),
                    plan_type: planType,
                    billing_cycle: cycle,
                    platform: "web",
                    status: "active",
                    expires_at: expiresAt.toISOString(),
                    metadata: {
                      payment_method: "balance",
                      auto_renew: true,
                      amount: price,
                      currency: "USD",
                      description: `Subscription: ${planType} plan (${cycle === "yearly" ? "1 year" : "1 month"})`,
                      ...(isFirstSubscriber && {
                        first_subscriber_discount_applied: true,
                        discount_percentage: 30,
                      }),
                    },
                  },
                  {
                    onConflict: "order_id",
                  },
                );

              if (purchaseError) {
                console.error(
                  "Failed to record subscription purchase:",
                  purchaseError,
                );
              }

              // Record transaction
              await supabase.from("balance_transactions").insert({
                user_id: user.id,
                amount: price,
                type: "debit",
                description: `Subscription: ${planType} plan (${cycle === "yearly" ? "1 year" : "1 month"})${isFirstSubscriber ? " - 30% first subscriber discount" : ""}`,
              });

              // Refresh subscription data first
              await onRefresh();

              // Close modal
              setSelectedPlan("");

              // Send confirmation email to user (non-blocking)
              try {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("email, full_name")
                  .eq("id", user.id)
                  .single();

                if (profile?.email) {
                  const { sendSubscriptionConfirmationEmail } =
                    await import("../lib/emailService");
                  // Fire and forget - don't block UI
                  sendSubscriptionConfirmationEmail(
                    profile.email,
                    profile.full_name || "User",
                    planType,
                    price,
                    expiresAt.toLocaleDateString(),
                  )
                    .then(() => {
                      console.log("✅ Subscription confirmation email sent");
                    })
                    .catch((emailError) => {
                      console.error(
                        "Failed to send subscription confirmation email:",
                        emailError,
                      );
                    });
                }
              } catch (emailError) {
                console.error("Email profile fetch error:", emailError);
              }

              // Show success message
              window.alert(`You are now subscribed to the ${
                  planType.charAt(0).toUpperCase() + planType.slice(1)
                } plan. Your subscription will auto-renew until cancelled.`,
              );
            } catch (error) {
              console.error("Error processing payment:", error);
              window.alert(/* Alert: */ 
                "Error",
                "Failed to process payment. Please try again.",
              );
            } finally {
              setPayingWithBalance(false);
            }
          },
        },
      ],
    );
  };

  const plans = [
    {
      name: "Free Users",
      planType: "free" as SubscriptionPlan,
      price: "$0",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "Monetize Content", // ✓ for free
        "Video Upload (1 min)",
        "Podcast Duration (10 min)",
        "Custom Branding (Limited)", // ✓ for free
        "Community Image Posts", // ✓ for free
        "Verification Badge", // ✗ for free
        "Advanced Analytics", // ✗ for free
        "Priority in Search", // ✗ for free
        "Subscriber only Content", // ✗ for free
        "Early Access To new Tools", // ✗ for free
        "Direct Support Line", // ✗ for free
        "Promotional Credits (Limited)", // ✗ for free
        "Live Streaming Access", // ✗ for free
        "Community Video Posts", // ✗ for free
        "Share as Image", // ✗ for free
      ],
      highlight: currentPlan === "free",
    },
    {
      name: "Basic",
      planType: "basic" as SubscriptionPlan,
      price: billingCycle === "monthly" ? "$2.99/month" : "$29.99/year",
      monthlyPrice: 2.99,
      yearlyPrice: 29.99,
      features: [
        "Verification Badge", // ✓ for basic
        "Monetize Content", // ✓ for basic
        "Advanced Analytics", // ✓ for basic
        "Priority in Search", // ✓ for basic
        "Subscriber only Content", // ✗ for basic
        "Early Access To new Tools", // ✓ for basic
        "Video Upload (5 min)",
        "Podcast Duration (45 min)",
        "Podcast Episodes (up to 5)",
        "Custom Branding (Limited)", // ✓ for basic
        "Direct Support Line", // ✓ for basic
        "Promotional Credits (Limited)", // ✓ for basic
        "Live Streaming Access", // ✓ for basic
        "Community Video Posts (5 min)", // ✓ for basic
        "Share as Image", // ✓ for basic
      ],
      highlight: currentPlan === "basic",
    },
    {
      name: "Premium",
      planType: "premium" as SubscriptionPlan,
      price: billingCycle === "monthly" ? "$9.99/month" : "$99.99/year",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        "Verification Badge", // ✓ for premium
        "Monetize Content", // ✓ for premium
        "Advanced Analytics", // ✓ for premium
        "Priority in Search", // ✓ for premium
        "Subscriber only Content", // ✓ for premium
        "Early Access To new Tools", // ✓ for premium
        "Video Upload (60 min)", // ✓ for premium
        "Podcast Duration (Unlimited / 2–3 hrs)", // ✓ for premium
        "Full Podcast Episodes (Unlimited)", // ✓ for premium
        "Custom Branding (Unlimited)", // ✓ for premium
        "Direct Support Line", // ✓ for premium
        "Promotional Credits (Unlimited)", // ✓ for premium
        "Live Streaming Access", // ✓ for premium
        "Community Video Posts (60 min)", // ✓ for premium
        "Share as Image", // ✓ for premium
      ],
      highlight: currentPlan === "premium",
    },
  ];

  // Function to handle plan selection
  const handlePlanSelection = (plan: (typeof plans)[0]) => {
    const targetPlan = plan.planType;

    if (targetPlan === currentPlan) {
      window.alert("You are already on this plan.");
      return;
    }

    if (targetPlan === "free") {
      window.alert(/* Alert: */ 
        "Downgrade to Free",
        "Are you sure you want to downgrade to the Free plan? You will lose access to premium features.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Downgrade",
            style: "destructive",
            onPress: () => {
              // Handle downgrade logic here
              window.alert(/* Alert: */ 
                "Downgrade",
                "Contact support to downgrade your plan.",
              );
            },
          },
        ],
      );
      return;
    }

    if (canUpgradeToPlan(currentPlan, targetPlan)) {
      setSelectedPlan(plan.name);
    } else {
      window.alert(/* Alert: */ 
        "Invalid Action",
        "You cannot downgrade through this screen. Please contact support for plan changes.",
      );
    }
  };

  const handleRestorePurchases = async () => {
    if (true) {
      window.alert(/* Alert: */ 
        "Not Available",
        "Restore Purchases is only available on iOS and Android.",
      );
      return;
    }

    setRestoring(true);
    try {
      const result = await iapService.restorePurchases();

      if (result.success) {
        await refreshSubscription();
        await loadBalance();
        window.alert(result.count && result.count > 0
            ? `Successfully restored ${result.count} purchase(s)!`
            : "No purchases found to restore.",
        );
      } else {
        window.alert(/* Alert: */ 
          "Restore Failed",
          result.error || "Failed to restore purchases. Please try again.",
        );
      }
    } catch (error: any) {
      console.error("Error restoring purchases:", error);
      window.alert("Failed to restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background, overflowY: "auto"}}
    >
      {/* Back Button */}
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>

      {/* Title */}
      <span style={{...(styles.title || {}), color: theme.text}}>Subscription</span>

      {/* Current Plan Indicator */}
      {loading ? (
        <div
          style={{...(styles.currentPlanContainer || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
        >
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          <span style={{...(styles.currentPlanText || {}), color: theme.text}}>
            Loading current plan...
          </span>
        </div>
      ) : (
        <div
          style={{...(styles.currentPlanContainer || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
        >
          <IoCheckmark />
          <span style={{...(styles.currentPlanText || {}), color: theme.text}}>
            Current Plan:{" "}
            <span style={styles.currentPlanName}>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </span>
            {subscription?.isActive && subscription?.expiresAt && (
              <span style={{...(styles.expiryText || {}), color: theme.secondaryText}}>
                {" "}
                (expires {new Date(subscription.expiresAt).toLocaleDateString()}
                )
              </span>
            )}
          </span>
        </div>
    )}
      {/* Creator Toggle */}
      <button
        style={{...(styles.creatorButton || {}), backgroundColor: theme.cardBackground, borderColor: theme.border}}
      >
        <span style={{...(styles.creatorText || {}), color: theme.text}}>Creator</span>
      </button>

      {/* Short Description */}
      <div
        style={{...(styles.infoBox || {}), backgroundColor: theme.cardBackground, borderColor: theme.border}}
      >
        <button
          onClick={() => router.push("/subscription-info")}
          accessibilityRole="button"
          
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        >
          <IoChevronBack />
          <span style={{...(styles.infoText || {}), color: theme.text}}>
            Unlock premium tools and insights with Verrsa Subscription — grow
            faster, reach more, and maximize your earning potential
          </span>
        </button>
      </div>

      {/* Billing Cycle Toggle */}
      <div style={styles.billingToggleContainer}>
        <button
          style={{...(styles.billingToggleButton || {}), ...(billingCycle === "monthly" ? styles.billingToggleActive : {})}}
          onClick={() => setBillingCycle("monthly")}
        >
          <span
            style={{...(styles.billingToggleText || {}), ...(billingCycle === "monthly" ? styles.billingToggleTextActive : {}), color: billingCycle === "monthly" ? "#fff" : "#666"}}
          >
            Monthly
          </span>
        </button>
        <button
          style={{...(styles.billingToggleButton || {}), ...(billingCycle === "yearly" ? styles.billingToggleActive : {})}}
          onClick={() => setBillingCycle("yearly")}
        >
          <span
            style={{...(styles.billingToggleText || {}), ...(billingCycle === "yearly" ? styles.billingToggleTextActive : {}), color: billingCycle === "yearly" ? "#fff" : "#666"}}
          >
            Yearly
          </span>
          <div style={styles.savingsBadge}>
            <span style={styles.savingsBadgeText}>Save 17%</span>
          </div>
        </button>
      </div>

      {/* Plans */}
      <div style={{overflowY: "auto", flex: 1}}>
        {plans.map((plan, index) => {
          const isFree = plan.name === "Free";
          const isCurrentPlan = plan.planType === currentPlan;
          const canUpgrade = canUpgradeToPlan(currentPlan, plan.planType);
          const canDowngrade = canDowngradeToPlan(currentPlan, plan.planType);

          return (
            <div
              key={index}
              style={{...(styles.planCard || {}), backgroundColor: plan.highlight
                    ? "#00AEEF"
                    : theme.cardBackground,
                  borderColor: plan.highlight ? "#00AEEF" : theme.border, ...(plan.highlight ? styles.planCardHighlight : {} || {}), ...(isCurrentPlan ? styles.currentPlanCard : {} || {})}}
            >
              <div style={styles.planHeader}>
                <span
                  style={{...(styles.planName || {}), ...(plan.highlight ? { color: "#fff" } : { color: theme.text } || {})}}
                >
                  {plan.name}
                </span>
                {isCurrentPlan && (
                  <div
                    style={{...(styles.currentBadge || {}), ...(isFree ? { backgroundColor: "#fff" } : {})}}
                  >
                    <span
                      style={{...(styles.currentBadgeText || {}), ...(isFree ? { color: "#00AEEF" } : {})}}
                    >
                      Current
                    </span>
                  </div>
                )}
              </div>
              {isFirstSubscriber && plan.planType !== "free" ? (
                <div>
                  <span
                    style={{...(styles.planPrice || {}), textDecorationLine: "line-through", opacity: 0.55, ...(plan.highlight ? { color: "#fff" } : { color: theme.text } || {})}}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{...(styles.planPrice || {}), fontWeight: "700", ...(plan.highlight ? { color: "#fff" } : { color: "#00AEEF" } || {})}}
                  >
                    ${billingCycle === "monthly"
                      ? getEffectivePrice(plan.monthlyPrice).toFixed(2)
                      : getEffectivePrice(plan.yearlyPrice).toFixed(2)}
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                  <div
                    style={{
                      backgroundColor: "#FF4500",
                      borderRadius: 6,
                      paddingLeft: 6,
    paddingRight: 6,
                      paddingTop: 2,
    paddingBottom: 2,
                      alignSelf: "flex-start",
                      marginTop: 2,
                      marginBottom: spacing.xs,
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      30% OFF
                    </span>
                  </div>
                </div>
              ) : (
                <span
                  style={{...(styles.planPrice || {}), ...(plan.highlight ? { color: "#fff" } : { color: theme.text } || {})}}
                >
                  {plan.price}
                </span>
            )}
              <div style={styles.featuresList}>
                {plan.features.map((feature, idx) => {
                  let showMark = false;
                  let markColor = "#00AEEF";
                  let isFeatureAvailable = false;
                  const isHighlighted = !!plan.highlight;

                  // Determine if feature is available for this plan
                  if (plan.name === "Premium") {
                    showMark = true;
                    isFeatureAvailable = true;
                  } else if (
                    plan.name === "Basic" &&
                    basicFeaturesWithMark.includes(feature)
                  ) {
                    showMark = true;
                    isFeatureAvailable = true;
                  } else if (
                    plan.name === "Free Users" &&
                    freeFeaturesWithMark.includes(feature)
                  ) {
                    showMark = true;
                    isFeatureAvailable = true;
                  }

                  // If the plan card is highlighted (teal background), use white icons/text
                  if (isHighlighted) {
                    markColor = "#fff";
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        opacity: isFeatureAvailable ? 1 : 0.5,
                      }}
                    >
                      {showMark ? (
                        <IoChevronBack />
                      ) : (
                        <IoChevronBack />
                      )}
                      <span
                        style={{...(styles.featureItem || {}), ...(isHighlighted
                            ? { color: "#fff" }
                            : { color: theme.text } || {}), ...(!isFeatureAvailable ? {
                            textDecorationLine: "line-through",
                          } : {})}}
                      >
                        {feature}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Action Button */}
              {isCurrentPlan ? (
                <div style={{...(styles.selectButton || {}), ...(styles.currentPlanButton || {})}}>
                  <span
                    style={{...(styles.selectButtonText || {}), ...(styles.currentPlanButtonText || {})}}
                  >
                    Current Plan
                  </span>
                </div>
              ) : isFree ? (
                <button
                  style={{...(styles.selectButton || {}), ...(styles.freePlanButton || {})}}
                  onClick={() => handlePlanSelection(plan)}
                >
                  <span
                    style={{...(styles.selectButtonText || {}), ...(styles.freePlanButtonText || {})}}
                  >
                    Downgrade to Free
                  </span>
                </button>
              ) : canUpgrade ? (
                <>
                  <button
                    style={{...(styles.selectButton || {}), ...(selectedPlan === plan.name ? styles.selectButtonActive : {})}}
                    onClick={() => handlePlanSelection(plan)}
                  >
                    <span style={styles.selectButtonText}>
                      Upgrade to {plan.name.split(" ")[0]}
                    </span>
                  </button>

                  {selectedPlan === plan.name && (
                    <div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setSelectedPlan("")}>
                      <div
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "rgba(0,0,0,0.5)",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: theme.cardBackground,
                            borderRadius: radius.xl,
                            padding: spacing.xl,
                            width: "90%",
                            maxWidth: 400,
                          }}
                        >
                          <span
                            style={{
                              fontSize: fontSize.xl,
                              fontWeight: "600",
                              marginBottom: spacing.sm,
                              textAlign: "center",
                              color: theme.text,
                            }}
                          >
                            Subscribe to {plan.name.split(" ")[0]}
                          </span>

                          {isFirstSubscriber && (
                            <div
                              style={{
                                backgroundColor: "#FFF3E0",
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.md,
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <IoChevronBack />
                              <span
                                style={{
                                  color: "#CC3800",
                                  fontSize: fontSize.sm,
                                  fontWeight: "600",
                                  marginLeft: spacing.sm,
                                  flex: 1,
                                }}
                              >
                                🎉 First subscriber! 30% discount applied on balance payment.
                              </span>
                            </div>
                        )}
                          {/* Subscription Details - Apple Requirement */}
                          <div
                            style={{
                              backgroundColor: theme.background,
                              borderRadius: radius.lg,
                              padding: spacing.base,
                              marginBottom: spacing.base,
                              borderWidth: 1,
                              borderColor: theme.border,
                            }}
                          >
                            <span
                              style={{
                                fontSize: fontSize.base,
                                fontWeight: "600",
                                color: theme.text,
                                marginBottom: spacing.md,
                                textAlign: "center",
                              }}
                            >
                              Subscription Details
                            </span>
                            <div style={{ gap: spacing.sm }}>
                              <div
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    color: theme.secondaryText,
                                    fontSize: fontSize.base,
                                  }}
                                >
                                  Title:
                                </span>
                                <span
                                  style={{
                                    color: theme.text,
                                    fontSize: fontSize.base,
                                    fontWeight: "500",
                                  }}
                                >
                                  {plan.name}
                                </span>
                              </div>
                              <div
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    color: theme.secondaryText,
                                    fontSize: fontSize.base,
                                  }}
                                >
                                  Duration:
                                </span>
                                <span
                                  style={{
                                    color: theme.text,
                                    fontSize: fontSize.base,
                                    fontWeight: "500",
                                  }}
                                >
                                  {billingCycle === "monthly"
                                    ? "1 Month"
                                    : "1 Year"}
                                </span>
                              </div>
                              <div
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    color: theme.secondaryText,
                                    fontSize: fontSize.base,
                                  }}
                                >
                                  Price:
                                </span>
                                {isFirstSubscriber ? (
                                  <div style={{ alignItems: "flex-end" }}>
                                    <span
                                      style={{
                                        color: theme.secondaryText,
                                        fontSize: fontSize.sm,
                                        textDecorationLine: "line-through",
                                      }}
                                    >
                                      ${billingCycle === "monthly" ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice.toFixed(2)}
                                    </span>
                                    <span
                                      style={{
                                        color: "#00AEEF",
                                        fontSize: fontSize.base,
                                        fontWeight: "700",
                                      }}
                                    >
                                      ${billingCycle === "monthly"
                                        ? getEffectivePrice(plan.monthlyPrice).toFixed(2)
                                        : getEffectivePrice(plan.yearlyPrice).toFixed(2)}
                                      {billingCycle === "yearly" &&
                                        ` ($${(getEffectivePrice(plan.yearlyPrice) / 12).toFixed(2)}/month)`}
                                    </span>
                                    <span style={{ color: "#FF4500", fontSize: fontSize.xs, fontWeight: "700" }}>30% OFF</span>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: theme.text,
                                      fontSize: fontSize.base,
                                      fontWeight: "500",
                                    }}
                                  >
                                    $
                                    {billingCycle === "monthly"
                                      ? plan.monthlyPrice.toFixed(2)
                                      : plan.yearlyPrice.toFixed(2)}
                                    {billingCycle === "yearly" &&
                                      ` ($${(plan.yearlyPrice / 12).toFixed(
                                        2,
                                      )}/month)`}
                                  </span>
                                      )}
                              </div>
                              <div
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    color: theme.secondaryText,
                                    fontSize: fontSize.base,
                                  }}
                                >
                                  Auto-Renews:
                                </span>
                                <span
                                  style={{
                                    color: theme.text,
                                    fontSize: fontSize.base,
                                    fontWeight: "500",
                                  }}
                                >
                                  {billingCycle === "monthly" ? "Yes, monthly" : "Yes, yearly"}
                                </span>
                              </div>
                            </div>

                            <span
                              style={{
                                color: theme.secondaryText,
                                fontSize: fontSize.sm,
                                marginTop: spacing.md,
                                textAlign: "center",
                              }}
                            >
                              Basic and Premium subscriptions automatically renew until cancelled, whether paid by balance or in-app purchase.
                            </span>

                            {/* Legal Links */}
                            <div
                              style={{
                                marginTop: spacing.md,
                                paddingTop: spacing.md,
                                borderTopWidth: 1,
                                borderTopColor: theme.border,
                                flexDirection: "row",
                                justifyContent: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  color: theme.secondaryText,
                                  fontSize: fontSize.md,
                                  textAlign: "center",
                                }}
                              >
                                By continuing, you agree to our{" "}
                              </span>
                              <button
                                onClick={() =>
                                  WebBrowser.openBrowserAsync(
                                    "https://www.verrsa.org/privacy",
                                  )
                                }
                              >
                                <span
                                  style={{
                                    color: "#00AEEF",
                                    fontSize: fontSize.md,
                                    textDecorationLine: "underline",
                                  }}
                                >
                                  Privacy Policy
                                </span>
                              </button>
                              <span
                                style={{
                                  color: theme.secondaryText,
                                  fontSize: fontSize.md,
                                }}
                              >
                                {" "}
                                and{" "}
                              </span>
                              <button
                                onClick={() =>
                                  WebBrowser.openBrowserAsync(
                                    "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
                                  )
                                }
                              >
                                <span
                                  style={{
                                    color: "#00AEEF",
                                    fontSize: fontSize.md,
                                    textDecorationLine: "underline",
                                  }}
                                >
                                  Terms of Use (EULA)
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Balance Payment Button */}
                          <button
                            style={{
                              backgroundColor:
                                balance <= 0 ||
                                balance <
                                  (billingCycle === "monthly"
                                    ? getEffectivePrice(plan.monthlyPrice)
                                    : getEffectivePrice(plan.yearlyPrice))
                                  ? "#ccc"
                                  : "#00AEEF",
                              paddingTop: spacing.base,
    paddingBottom: spacing.base,
                              borderRadius: radius.full,
                              alignItems: "center",
                              marginBottom: spacing.md,
                            }}
                            disabled={payingWithBalance}
                            onClick={() => {
                              const price =
                                billingCycle === "monthly"
                                  ? getEffectivePrice(plan.monthlyPrice)
                                  : getEffectivePrice(plan.yearlyPrice);
                              handleBalancePayment(
                                plan.planType,
                                price,
                                billingCycle,
                              );
                            }}
                          >
                            {payingWithBalance ? (
                              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
                            ) : (
                              <div
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <IoChevronBack />
                                <span
                                  style={{
                                    color: "#fff",
                                    fontSize: fontSize.base,
                                    fontWeight: "600",
                                    marginLeft: spacing.sm,
                                  }}
                                >
                                  {balance <= 0 ||
                                  balance <
                                    (billingCycle === "monthly"
                                      ? getEffectivePrice(plan.monthlyPrice)
                                      : getEffectivePrice(plan.yearlyPrice))
                                    ? "Insufficient Balance"
                                    : `Pay from Balance ($${balance.toFixed(
                                        2,
                                      )})`}
                                </span>
                              </div>
                                    )}
                          </button>

                          {/* Apple/Google Pay Button - Only show on native */}
                          {false && (
                            <>
                              <span
                                style={{
                                  textAlign: "center",
                                  color: theme.secondaryText,
                                  fontSize: fontSize.base,
                                  marginTop: spacing.sm,
    marginBottom: spacing.sm,
                                }}
                              >
                                or
                              </span>

                              <button
                                style={{
                                  backgroundColor: "#000",
                                  paddingTop: spacing.base,
    paddingBottom: spacing.base,
                                  borderRadius: radius.full,
                                  alignItems: "center",
                                  marginBottom: spacing.md,
                                }}
                                disabled={purchasing}
                                onClick={async () => {
                                  setPurchasing(true);
                                  try {
                                    // Check IAP status
                                    const status = iapService.getIAPStatus();
                                    if (
                                      !status.functionsAvailable
                                        ?.requestPurchase
                                    ) {
                                      window.alert(/* Alert: */ 
                                        "Not Available",
                                        "In-App Purchases require a development build. Please use Balance payment or build the app with 'npx expo run:ios'.",
                                        [{ text: "OK" }],
                                      );
                                      setPurchasing(false);
                                      return;
                                    }

                                    const productId =
                                      plan.planType === "basic"
                                        ? PRODUCT_IDS.SUBSCRIPTION_BASIC_MONTHLY
                                        : PRODUCT_IDS.SUBSCRIPTION_PREMIUM_MONTHLY;

                                    const result =
                                      await iapService.purchaseProduct(
                                        productId,
                                      );

                                    if (result?.success) {
                                      // Purchase flow has started. Final activation is handled
                                      // by the IAP purchase listener after store confirmation.
                                      setSelectedPlan("");
                                      window.alert(/* Alert: */ 
                                        "Purchase Started",
                                        "Complete your payment in the store prompt. Your subscription will activate automatically after confirmation.",
                                      );
                                    } else {
                                      // Error already shown by IAP service
                                      console.log(
                                        "Purchase failed:",
                                        result?.error,
                                      );
                                    }
                                  } catch (error: any) {
                                    console.error("Purchase error:", error);
                                    window.alert(/* Alert: */ 
                                      "Error",
                                      error.message || "Purchase failed",
                                    );
                                  } finally {
                                    setPurchasing(false);
                                  }
                                }}
                              >
                                {purchasing ? (
                                  <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
                                ) : (
                                  <div
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                    }}
                                  >
                                    <MdCheck />
                                    <span
                                      style={{
                                        color: "#fff",
                                        fontSize: fontSize.base,
                                        fontWeight: "600",
                                        marginLeft: spacing.sm,
                                      }}
                                    >
                                      {false
                                        ? "Subscribe"
                                        : "Subscribe"}
                                    </span>
                                  </div>
                                      )}
                              </button>

                              {/* Show price from IAP or discounted balance price */}
                              {isFirstSubscriber ? (
                                <div style={{ alignItems: "center", marginBottom: spacing.md }}>
                                  <span
                                    style={{
                                      color: theme.secondaryText,
                                      fontSize: fontSize.sm,
                                      textDecorationLine: "line-through",
                                    }}
                                  >
                                    ${plan.monthlyPrice.toFixed(2)}/month
                                  </span>
                                  <span
                                    style={{
                                      color: "#00AEEF",
                                      fontSize: fontSize.base,
                                      fontWeight: "700",
                                    }}
                                  >
                                    ${getEffectivePrice(plan.monthlyPrice).toFixed(2)}/month with balance
                                  </span>
                                  <span style={{ color: "#FF4500", fontSize: fontSize.xs, fontWeight: "700" }}>
                                    30% OFF - balance payment
                                  </span>
                                </div>
                              ) : iapProducts.length > 0 ? (
                                <span
                                  style={{
                                    textAlign: "center",
                                    color: theme.secondaryText,
                                    fontSize: fontSize.base,
                                    marginBottom: spacing.md,
                                  }}
                                >
                                  {iapProducts.find(
                                    (p) =>
                                      p.productId ===
                                      (plan.planType === "basic"
                                        ? PRODUCT_IDS.SUBSCRIPTION_BASIC_MONTHLY
                                        : PRODUCT_IDS.SUBSCRIPTION_PREMIUM_MONTHLY),
                                  )?.price || plan.price}
                                  /month
                                </span>
                              ) : null}
                            </>
                          )}

                          {/* Top Up Balance Link */}
                          {balance <
                            (billingCycle === "monthly"
                              ? getEffectivePrice(plan.monthlyPrice)
                              : getEffectivePrice(plan.yearlyPrice)) && (
                            <button
                              style={{ paddingTop: spacing.sm, paddingBottom: spacing.sm }}
                              onClick={() => {
                                setSelectedPlan("");
                                router.push("/balance");
                              }}
                            >
                              <span
                                style={{
                                  textAlign: "center",
                                  color: "#00BFFF",
                                  fontSize: fontSize.base,
                                }}
                              >
                                Need more balance? Top Up
                              </span>
                            </button>
                        )}
                          {/* Close button */}
                          <button
                            style={{ marginTop: spacing.md, alignItems: "center" }}
                            onClick={() => setSelectedPlan("")}
                          >
                            <MdCheck />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{...(styles.selectButton || {}), ...(styles.disabledButton || {})}}>
                  <button
                    onClick={() => {
                      router.push("/customer-support");
                    }}
                  >
                    <span
                      style={{...(styles.selectButtonText || {}), ...(styles.disabledButtonText || {})}}
                    >
                      Contact Support
                    </span>
                  </button>
                </div>
                    )}
            </div>
          );
        })}
      </div>
      {/* Restore Purchases Button */}
      {false && (
        <button
          style={{...(styles.restoreButton || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
          onClick={handleRestorePurchases}
          disabled={restoring}
        >
          {restoring ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : (
            <>
              <IoChevronBack />
              <span style={{...(styles.restoreButtonText || {}), color: theme.text}}>
                Restore Purchases
              </span>
            </>
          )}
        </button>
    )}
      {/* Terms & Privacy Links */}
      <div
        style={{
          marginTop: spacing.lg,
          alignItems: "center",
          paddingLeft: spacing.lg,
          paddingRight: spacing.lg,
        }}
      >
        <div
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{ fontSize: fontSize.md, color: theme.text, textAlign: "center" }}
          >
            By continuing, you agree to our{" "}
          </span>
          <button
            onClick={() =>
              WebBrowser.openBrowserAsync("https://www.verrsa.org/privacy")
            }
          >
            <span
              style={{
                color: "#00AEEF",
                fontSize: fontSize.md,
                textDecorationLine: "underline",
              }}
            >
              Privacy Policy
            </span>
          </button>
          <span style={{ fontSize: fontSize.md, color: theme.text }}> and </span>
          <button
            onClick={() =>
              WebBrowser.openBrowserAsync(
                "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
              )
            }
          >
            <span
              style={{
                color: "#00AEEF",
                fontSize: fontSize.md,
                textDecorationLine: "underline",
              }}
            >
              Terms of Use (EULA)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.xl3,
  },
  backButton: {
    position: "absolute",
    top: 68,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "400",
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  currentPlanContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  currentPlanText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  currentPlanName: {
    fontWeight: "600",
    color: "#00AEEF",
  },
  expiryText: {
    fontSize: fontSize.sm,
  },
  creatorButton: {
    alignSelf: "center",
    borderRadius: radius.xl2,
    borderWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginBottom: spacing.lg,
  },
  creatorText: {
    fontSize: fontSize.md,
  },
  infoBox: {
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: 25,
    flexDirection: "row",
  },
  infoText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  plansContainer: {
    flexDirection: "row",
    width: 800,
    justifyContent: "space-between",
  },
  planCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  planCardHighlight: {
    backgroundColor: "#00AEEF",
    borderColor: "#00AEEF",
  },
  planName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: fontSize.md,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  featuresList: {
    marginBottom: spacing.base,
  },
  featureItem: {
    fontSize: fontSize.md2,
    lineHeight: 35,
    marginBottom: spacing.xs,
  },
  selectButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#00AEEF",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: "center",
  },
  selectButtonText: {
    color: "#00AEEF",
    fontWeight: "600",
  },
  selectButtonActive: {
    borderColor: "#00AEEF",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  currentPlanCard: {
    borderColor: "#00AEEF",
    borderWidth: 2,
  },
  currentBadge: {
    backgroundColor: "#00AEEF",
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  currentPlanButton: {
    backgroundColor: "#00AEEF",
    borderColor: "#00AEEF",
  },
  currentPlanButtonText: {
    color: "#fff",
  },
  freePlanButton: {
    backgroundColor: "#fff",
    borderColor: "#ff4444",
  },
  freePlanButtonText: {
    color: "#ff4444",
  },
  disabledButton: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ccc",
  },
  disabledButtonText: {
    color: "#999",
  },
  billingToggleContainer: {
    flexDirection: "row",
    alignSelf: "center",
    marginBottom: 25,
    borderRadius: radius.lg,
    backgroundColor: "#f0f0f0",
    padding: spacing.xs,
  },
  billingToggleButton: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.xl2,
    paddingRight: spacing.xl2,
    borderRadius: radius.md,
    position: "relative",
    marginLeft: spacing.px,
    marginRight: spacing.px,
  },
  billingToggleActive: {
    backgroundColor: "#00AEEF",
    shadowColor: "#00AEEF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  billingToggleText: {
    fontSize: fontSize.md2,
    fontWeight: "600",
  },
  billingToggleTextActive: {
    color: "#fff",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    right: -12,
    backgroundColor: "#FF4500",
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: 3,
    paddingBottom: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  savingsBadgeText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "800",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginTop: 25,
    alignSelf: "center",
    minWidth: 200,
  },
  restoreButtonText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
};
