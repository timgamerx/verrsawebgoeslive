// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import {
  IoCheckmark,
  IoChevronBack,
  IoEllipsisVertical,
  IoClose,
} from "react-icons/io5";
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
import { MdCheck } from 'react-icons/md'
import { VERRSA_AI_DAILY_LIMITS } from '../lib/verrsaAi';

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
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);

  const INTRO_DISCOUNT = 0.5; // 50% off the first 2 monthly purchases
  const hasIntroDiscount = purchaseCount !== null && purchaseCount < 2;
  const getEffectivePrice = (
    basePrice: number,
    cycle: "monthly" | "yearly" = "monthly",
  ) => {
    // Intro discount applies to monthly only; yearly is already discounted
    if (cycle === "yearly") return basePrice;
    return hasIntroDiscount && basePrice > 0
      ? parseFloat((basePrice * (1 - INTRO_DISCOUNT)).toFixed(2))
      : basePrice;
  };

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
      setPurchaseCount(count ?? 0);
    } catch (error) {
      console.error("Error checking first subscriber status:", error);
    }
  };

  const initializeIAP = async () => {
    setIapLoading(true);

    // Check IAP status first
    // Web: IAP unavailable for now; subscriptions are paid from user balance.
    setIapLoading(false);
  };

  const handleBalancePayment = async (
    planType: SubscriptionPlan,
    price: number,
    cycle: "monthly" | "yearly",
  ) => {
    if (balance <= 0 || balance < price) {
      if (window.confirm(`You need $${price.toFixed(
          2,
        )} to subscribe. Your current balance is $${balance.toFixed(
          2,
        )}. Would you like to top up?`)) {
  (() => {
    setSelectedPlan("");
              router.push("/balance");
  })();
}
      return;
    }

    if (
      !window.confirm(`Pay $${price.toFixed(2)} from your balance to subscribe to ${
        planType.charAt(0).toUpperCase() + planType.slice(1)
      } plan? This subscription auto-renews ${
        cycle === "yearly" ? "yearly" : "monthly"
      } until you cancel.`)
    ) {
      return;
    }
    await (
          async () => {
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
                  p_description: `Subscription: ${planType} plan (${cycle === "yearly" ? "1 year" : "1 month"})${hasIntroDiscount ? ` - 50% intro discount (month ${(purchaseCount ?? 0) + 1})` : ""}`,
                
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
                      ...(hasIntroDiscount && {
                        intro_discount_applied: true,
                        discount_percentage: 50,
                        discount_month: (purchaseCount ?? 0) + 1,
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
                description: `Subscription: ${planType} plan (${cycle === "yearly" ? "1 year" : "1 month"})${hasIntroDiscount ? ` - 50% intro discount (month ${(purchaseCount ?? 0) + 1})` : ""}`,
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
              window.alert("Failed to process payment. Please try again.");
            } finally {
              setPayingWithBalance(false);
            }
          }
    )();
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
        "Verification Badge",
        "Monetize Content, Let Your Work Earn",
        `Verrsa AI Writer (${VERRSA_AI_DAILY_LIMITS.basic} articles/day)`,
        "Video Upload (30 min)",
        "Podcast Duration (45 min)",
        "Podcast Episodes (Up to 5)",
        "Community Video Posts (30 min)",
        "Direct Support Line",
        "Share as Image",
        "Advanced Analytics, Discover What Drives Growth",
        "A richer reading experience, every time",
        "Discover content you wouldn't find otherwise",
        "Experiences reserved for subscribers",
        "More ways to engage with the community",
        "Directly support the creators you love",
        "First look at select new VERRSA features",
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
        "Everything in Basic",
        "Go beyond the ordinary VERRSA experience",
        `Verrsa AI Writer (${VERRSA_AI_DAILY_LIMITS.premium} articles/day)`,
        "Video Upload (60 min)",
        "Podcast Duration (Unlimited / 2-3 hours)",
        "Full Podcast Episodes",
        "Community Video Posts (60 min)",
        "Discover experiences reserved for Premium members",
        "Be among the first to experience what VERRSA builds next",
        "Priority member benefits, just for you",
        "More opportunities to connect with creators",
        "Built for your full VERRSA experience",
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
      if (window.confirm("Are you sure you want to downgrade to the Free plan? You will lose access to premium features.")) {
        window.alert("Downgrade request submitted. Your plan will be downgraded at the end of your billing cycle.");
      }
      return;
    }

    if (canUpgradeToPlan(currentPlan, targetPlan)) {
      setSelectedPlan(plan.name);
    } else {
      window.alert("You cannot downgrade through this screen. Please contact support for plan changes.");
    }
  };

  const handleRestorePurchases = async () => {
    if (true) {
      window.alert("Restore Purchases is only available on iOS and Android.");
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
        window.alert(result.error || "Failed to restore purchases. Please try again.");
      }
    } catch (error: any) {
      console.error("Error restoring purchases:", error);
      window.alert("Failed to restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const modalPlan = plans.find((p) => p.name === selectedPlan) || { name: "__none__" };
  const basicPlan = plans.find((p) => p.planType === "basic");
  const premiumPlan = plans.find((p) => p.planType === "premium");
  const isBasic = currentPlan === "basic";
  const isPremium = currentPlan === "premium";

  const handleChooseBasic = () => {
    if (isBasic) return window.alert("You are already on the Basic plan.");
    if (isPremium) return window.alert("To change from Premium to Basic please contact support.");
    setSelectedPlan("Basic");
  };
  const handleChoosePremium = () => {
    if (isPremium) return window.alert("You are already on the Premium plan.");
    setSelectedPlan("Premium");
  };

  const Check = ({ color }) => (
    <IoCheckmark size={14} color={color} style={{ flexShrink: 0, marginRight: 8, marginTop: 3 }} />
  );

  return (
    <div className="rn-flex" style={{ ...ms.page, backgroundColor: theme.background, color: theme.text }}>
      <div style={ms.inner}>
        <div style={ms.header}>
          <button style={ms.iconBtn} onClick={() => router.back()}>
            <TbChevronLeft size={26} color={theme.text} />
          </button>
          <img src="/Verrsalogo.png" alt="Verrsa" style={ms.logo} />
          <button style={ms.iconBtn} onClick={() => router.push("/subscriptioninfo")}>
            <IoEllipsisVertical size={22} color={theme.text} />
          </button>
        </div>

        <div style={{ ...ms.planInfo, color: theme.text }}>
          {loading ? (
            "Loading plan..."
          ) : (
            <>
              <div>Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</div>
              {subscription?.isActive && subscription?.expiresAt && (
                <div style={{ color: theme.secondaryText }}>
                  Expires {new Date(subscription.expiresAt).toLocaleDateString()}
                </div>
              )}
              <div style={{ color: theme.secondaryText, fontSize: 13, marginTop: 2 }}>
                Verrsa AI Writer: {VERRSA_AI_DAILY_LIMITS[currentPlan] ?? VERRSA_AI_DAILY_LIMITS.free} articles/day
                {currentPlan === "free"
                  ? ` (Basic ${VERRSA_AI_DAILY_LIMITS.basic}, Premium ${VERRSA_AI_DAILY_LIMITS.premium})`
                  : ""}
              </div>
            </>
          )}
        </div>

        <h1 style={{ ...ms.title, color: theme.text }}>
          Get more
          <br />
          from VERRSA
        </h1>
        <p style={{ ...ms.subtitle, color: theme.secondaryText }}>
          More ways to create.
          <br />
          More ways to discover.
          <br />
          More ways to connect.
        </p>
        <div style={{ color: theme.secondaryText, fontSize: 14, margin: "0 20px 30px" }}>
          CHOOSE THE EXPERIENCE THAT FITS YOU.
        </div>

        <div style={{ ...ms.toggle, borderColor: theme.border }}>
          {["monthly", "yearly"].map((cycle) => {
            const active = billingCycle === cycle;
            return (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                style={{ ...ms.toggleBtn, backgroundColor: active ? "#00bfff" : "transparent", color: active ? "#000" : theme.text }}
              >
                {cycle === "monthly" ? "Monthly" : "Yearly"}
              </button>
            );
          })}
        </div>

        <div style={{ ...ms.basicCard, borderColor: "#444" }}>
          <div style={{ ...ms.eyebrow, color: theme.secondaryText }}>BASIC</div>
          <h2 style={{ ...ms.cardTitle, color: theme.text }}>
            More room
            <br />
            to experience.
          </h2>
          <div style={ms.featureList}>
            {(basicPlan?.features || []).map((f, i) => (
              <div key={i} style={ms.featureRow}>
                <Check color={theme.text} />
                <span style={{ color: theme.text }}>{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleChooseBasic}
            disabled={isBasic}
            style={{ ...ms.basicBtn, color: theme.text, opacity: isBasic ? 0.6 : 1 }}
          >
            {isBasic ? "Current Plan" : "Choose Basic"}
          </button>
        </div>

        <div style={ms.premiumBorder}>
          <div style={{ ...ms.premiumInner, backgroundColor: theme.background }}>
            <div style={{ ...ms.pill, borderColor: "#d0cc56", color: "#d0cc56", width: 150 }}>⭐️ MOST POPULAR</div>
            <div style={{ ...ms.pill, borderColor: "#68d056", color: "#68d056", width: 215, marginTop: 10 }}>
              50% OFF · FIRST 2 MONTHS
            </div>
            <div style={{ ...ms.eyebrow, color: "#d0cc56" }}>PREMIUM</div>
            <h2 style={{ ...ms.cardTitle, color: theme.text }}>
              The complete
              <br />
              experience.
            </h2>
            <div style={ms.featureList}>
              {(premiumPlan?.features || []).map((f, i) => (
                <div key={i} style={ms.featureRow}>
                  <Check color="#d0cc56" />
                  <span style={{ color: theme.text }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={handleChoosePremium} disabled={isPremium} style={{ ...ms.premiumBtn, opacity: isPremium ? 0.6 : 1 }}>
              {isPremium ? "Current Plan" : "Unlock Premium"}
            </button>
          </div>
        </div>

        {!isPremium && (
          <>
            <h3 style={{ ...ms.bottomTitle, color: theme.text }}>Ready to experience more?</h3>
            <p style={{ ...ms.bottomSub, color: theme.secondaryText }}>
              Join the VERRSA community and unlock
              <br />
              more of what VERRSA has to offer.
            </p>
            <button onClick={handleChoosePremium} style={ms.bottomBtn}>
              Upgrade Now
            </button>
          </>
        )}
        <div style={{ textAlign: "center", marginBottom: 24, fontSize: 13, color: "#666" }}>
          Cancel anytime · Secure payment · Instant access
        </div>

        <div style={{ textAlign: "center", fontSize: fontSize.md, color: theme.text, padding: "0 20px 48px" }}>
          By continuing, you agree to our{" "}
          <a href="https://www.verrsa.org/privacy" target="_blank" rel="noopener noreferrer" style={ms.link}>
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
            target="_blank"
            rel="noopener noreferrer"
            style={ms.link}
          >
            Terms of Use (EULA)
          </a>
        </div>

        {/* Payment modal: opens when a plan is chosen */}
        {(() => {
          const plan = modalPlan;
          return (
            <>
              {selectedPlan === plan.name && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.5)",
                  }}
                  onClick={() => setSelectedPlan("")}
                >
                  <div
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
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

                      {hasIntroDiscount && (
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
                            🎉 Intro offer! 50% off your{" "}
                            {purchaseCount === 0 ? "first" : "second"} month —
                            applied on balance payment.
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
                            {hasIntroDiscount ? (
                              <div style={{ alignItems: "flex-end" }}>
                                <span
                                  style={{
                                    color: theme.secondaryText,
                                    fontSize: fontSize.sm,
                                    textDecoration: "line-through",
                                  }}
                                >
                                  $
                                  {billingCycle === "monthly"
                                    ? plan.monthlyPrice.toFixed(2)
                                    : plan.yearlyPrice.toFixed(2)}
                                </span>
                                <span
                                  style={{
                                    color: "#00AEEF",
                                    fontSize: fontSize.base,
                                    fontWeight: "700",
                                  }}
                                >
                                  $
                                  {billingCycle === "monthly"
                                    ? getEffectivePrice(
                                        plan.monthlyPrice,
                                      ).toFixed(2)
                                    : getEffectivePrice(
                                        plan.yearlyPrice,
                                        "yearly",
                                      ).toFixed(2)}
                                  {billingCycle === "yearly" &&
                                    ` ($${(getEffectivePrice(plan.yearlyPrice, "yearly") / 12).toFixed(2)}/month)`}
                                </span>
                                <span
                                  style={{
                                    color: "#FF4500",
                                    fontSize: fontSize.xs,
                                    fontWeight: "700",
                                  }}
                                >
                                  50% OFF
                                </span>
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
                              {billingCycle === "monthly"
                                ? "Yes, monthly"
                                : "Yes, yearly"}
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
                          Basic and Premium subscriptions automatically renew
                          until cancelled, whether paid by balance or in-app
                          purchase.
                        </span>

                        {/* Legal Links */}
                        <div
                          style={{
                            marginTop: spacing.md,
                            paddingTop: spacing.md,
                            borderTop: `1px solid ${theme.border}`,
                            textAlign: "center",
                            fontSize: fontSize.md,
                            color: theme.secondaryText,
                          }}
                        >
                          By continuing, you agree to our{" "}
                          <a
                            href="https://www.verrsa.org/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#00AEEF",
                              textDecoration: "underline",
                            }}
                          >
                            Privacy Policy
                          </a>{" "}
                          and{" "}
                          <a
                            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#00AEEF",
                              textDecoration: "underline",
                            }}
                          >
                            Terms of Use (EULA)
                          </a>
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
                                : getEffectivePrice(plan.yearlyPrice, "yearly"))
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
                              : getEffectivePrice(plan.yearlyPrice, "yearly");
                          handleBalancePayment(
                            plan.planType,
                            price,
                            billingCycle,
                          );
                        }}
                      >
                        {payingWithBalance ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                border: "3px solid #00bfff",
                                borderTopColor: "transparent",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          </div>
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
                                  : getEffectivePrice(
                                      plan.yearlyPrice,
                                      "yearly",
                                    ))
                                ? "Insufficient Balance"
                                : `Pay from Balance ($${balance.toFixed(2)})`}
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
                                  !status.functionsAvailable?.requestPurchase
                                ) {
                                  window.alert(
                                    "In-App Purchases require a development build. Please use Balance payment or build the app with 'npx expo run:ios'.",
                                  );
                                  setPurchasing(false);
                                  return;
                                }

                                const productId =
                                  plan.planType === "basic"
                                    ? PRODUCT_IDS.SUBSCRIPTION_BASIC_MONTHLY
                                    : PRODUCT_IDS.SUBSCRIPTION_PREMIUM_MONTHLY;

                                const result =
                                  await iapService.purchaseProduct(productId);

                                if (result?.success) {
                                  // Purchase flow has started. Final activation is handled
                                  // by the IAP purchase listener after store confirmation.
                                  setSelectedPlan("");
                                  window.alert(
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
                                window.alert(
                                  error.message || "Purchase failed",
                                );
                              } finally {
                                setPurchasing(false);
                              }
                            }}
                          >
                            {purchasing ? (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    border: "3px solid #00bfff",
                                    borderTopColor: "transparent",
                                    animation: "spin 1s linear infinite",
                                  }}
                                />
                              </div>
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
                                  {false ? "Subscribe" : "Subscribe"}
                                </span>
                              </div>
                            )}
                          </button>

                          {/* Show price from IAP or discounted balance price */}
                          {hasIntroDiscount ? (
                            <div
                              style={{
                                alignItems: "center",
                                marginBottom: spacing.md,
                              }}
                            >
                              <span
                                style={{
                                  color: theme.secondaryText,
                                  fontSize: fontSize.sm,
                                  textDecoration: "line-through",
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
                                $
                                {getEffectivePrice(plan.monthlyPrice).toFixed(
                                  2,
                                )}
                                /month with balance
                              </span>
                              <span
                                style={{
                                  color: "#FF4500",
                                  fontSize: fontSize.xs,
                                  fontWeight: "700",
                                }}
                              >
                                50% OFF - balance payment
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
                          : getEffectivePrice(plan.yearlyPrice, "yearly")) && (
                        <button
                          style={{
                            paddingTop: spacing.sm,
                            paddingBottom: spacing.sm,
                          }}
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
                        style={{
                          marginTop: spacing.md,
                          width: 40,
                          height: 40,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          alignSelf: "center",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: "#68686835",
                          borderRadius: "50%",
                        }}
                        onClick={() => setSelectedPlan("")}
                      >
                        <IoClose />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

const ms: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", width: "100%", overflowY: "auto" },
  inner: { maxWidth: 560, margin: "0 auto", paddingBottom: 20 },
  header: { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "24px 20px 0" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" },
  logo: { width: 90, height: 30, objectFit: "contain" },
  planInfo: { margin: "16px 20px 0", fontSize: 15 },
  title: { margin: "40px 20px 0", fontSize: 30, fontWeight: 700, lineHeight: "35px" },
  subtitle: { margin: "15px 20px 20px", fontSize: 16, lineHeight: "25px" },
  toggle: { display: "flex", margin: "0 20px 20px", borderRadius: 999, border: "1px solid", overflow: "hidden" },
  toggleBtn: { flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 15 },
  basicCard: { margin: "0 20px 50px", padding: 10, borderRadius: 15, border: "1px solid" },
  eyebrow: { margin: "20px 0 0 20px", fontSize: 14 },
  cardTitle: { margin: "10px 0 0 20px", fontSize: 30, fontWeight: 700, lineHeight: "35px" },
  featureList: { margin: "20px 20px 0" },
  featureRow: { display: "flex", flexDirection: "row", alignItems: "flex-start", marginBottom: 8, fontSize: 15, lineHeight: "22px" },
  basicBtn: {
    display: "block", width: "calc(100% - 40px)", margin: "20px", padding: 15, borderRadius: 10,
    border: "1px solid #444", backgroundColor: "#44444491", cursor: "pointer", fontSize: 16, fontWeight: 700,
  },
  premiumBorder: {
    margin: "0 15px 50px", padding: 3, borderRadius: 20,
    background: "linear-gradient(to top right, #00bfff, #f1c528)",
  },
  premiumInner: { padding: 10, borderRadius: 19 },
  pill: {
    display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 20, border: "1px solid",
    margin: "20px 0 0 20px", fontSize: 13, fontWeight: 800, padding: "2px 0",
  },
  premiumBtn: {
    display: "block", width: "calc(100% - 40px)", margin: 20, padding: 15, borderRadius: 10, border: "none",
    cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#000",
    background: "linear-gradient(to top right, #e6be2e, #ffdc5e)",
  },
  bottomTitle: { margin: "5px 20px 0", fontSize: 27, fontWeight: 700, textAlign: "center" },
  bottomSub: { margin: "10px 20px 0", fontSize: 16, lineHeight: "25px", textAlign: "center" },
  bottomBtn: {
    display: "block", width: "calc(100% - 50px)", margin: "20px 25px", padding: 15, borderRadius: 10,
    border: "none", backgroundColor: "#e1e0e0", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#000",
  },
  link: { color: "#00AEEF", textDecoration: "underline" },
};
