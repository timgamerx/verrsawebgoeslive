// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { TbChevronLeft, TbChevronRight, TbDots, TbDotsVertical } from 'react-icons/tb';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';

export default function SubscriptionInfo() {
  const router = useRouter();
  const { theme, colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<
    "free" | "basic" | "premium"
  >("free");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(
    null,
  );
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "subscription_plan, subscription_status, subscription_expires_at",
        )
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        setLoading(false);
        return;
      }

      if (profile) {
        // Determine subscription tier
        const status = profile.subscription_status;
        const plan = profile.subscription_plan || "free";

        // Check if subscription has expired
        let hasExpired = false;
        if (profile.subscription_expires_at) {
          const expiryDate = new Date(profile.subscription_expires_at);
          const now = new Date();
          hasExpired = expiryDate < now;
        }

        if (
          status === "active" &&
          (plan === "basic" || plan === "premium") &&
          !hasExpired
        ) {
          setSubscriptionTier(plan);
          setIsExpired(false);
        } else if (hasExpired && plan !== "free") {
          // Subscription has expired - update database to free plan
          setSubscriptionTier("free");
          setIsExpired(true);

          // Update user's subscription in database to reflect expired status
          await supabase
            .from("profiles")
            .update({
              subscription_plan: "free",
              subscription_status: "inactive",
            })
            .eq("id", user.id);
        } else {
          setSubscriptionTier("free");
          setIsExpired(false);
        }

        // Format expiry date
        if (profile.subscription_expires_at) {
          const expiryDate = new Date(profile.subscription_expires_at);
          const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
          const day = String(expiryDate.getDate()).padStart(2, "0");
          const year = expiryDate.getFullYear();
          setSubscriptionEndDate(`${month}/${day}/${year}`);
        } else {
          setSubscriptionEndDate(null);
        }
      }
    } catch (error) {
      console.error("Error in fetchSubscriptionData:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionDisplayName = () => {
    if (subscriptionTier === "free") return "Free";
    if (subscriptionTier === "basic") return "Basic";
    if (subscriptionTier === "premium") return "Premium";
    return "Free";
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background, overflowY: "auto"}}
    >
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>

      <span style={{...(styles.title || {}), color: theme.text}}>
        About Verrsa Subscription
      </span>

      <div
        style={{...(styles.card || {}), backgroundColor: theme.cardBackground, borderColor: theme.border}}
      >
        <span style={{...(styles.heading || {}), color: theme.text}}>
          What you get
        </span>
        <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
          Verrsa Subscription unlocks premium features to help you grow your
          audience and earn more. Features include verification badges,
          increased upload limits, advanced analytics, monetization tools,
          priority discoverability, direct support, and promotional credits.
        </span>

        <span style={{...(styles.heading || {}), color: theme.text}}>Billing</span>
        <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
          Subscriptions auto-renew based on the billing cycle you choose. You
          can cancel anytime from your account settings or by{" "}
          <span
            style={{ textDecorationLine: "underline" }}
            onClick={() => router.push("/customer-support")}
          >
            contacting support.
          </span>
        </span>

        <span style={{...(styles.heading || {}), color: theme.text}}>
          Privacy & Terms
        </span>

        <button
          onClick={() => window.open("https://www.verrsa.org/privacy", "_blank")}
        >
          <span style={styles.link}>Privacy Policy</span>
        </button>
        <button
          onClick={() =>
            window.open(
              "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
              "_blank",
            )
          }
        >
          <span style={{...(styles.link || {}), marginBottom: 26}}>
            Terms of Use (EULA)
          </span>
        </button>
      </div>

      <span style={{...(styles.heading || {}), color: theme.text}}>
        Subscription Info
      </span>

      <div
        style={{
          height: 1,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
          backgroundColor: theme.border,
        }}
      />

      {loading ? (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
      ) : (
        <>
          {isExpired ? (
            <>
              <span
                style={{...(styles.paragraph || {}), color: theme.secondaryText, marginBottom: spacing.sm}}
              >
                Your subscription has ended. You have been returned to the{" "}
                <span style={{ fontWeight: "bold" }}>Free</span> plan.
              </span>

              <button
                style={{...(styles.resubscribeButton || {}), backgroundColor: "#00AEEF"}}
                onClick={() => router.push("/verrsa-subscription")}
              >
                <span style={styles.resubscribeButtonText}>Resubscribe</span>
              </button>
            </>
          ) : (
            <>
              {subscriptionTier === "free" ? (
                <span
                  style={{...(styles.paragraph || {}), color: theme.secondaryText}}
                >
                  You are currently a{" "}
                  <span style={{ fontWeight: "bold" }}>free user</span>
                </span>
              ) : (
                <span
                  style={{...(styles.paragraph || {}), color: theme.secondaryText}}
                >
                  You currently have a{" "}
                  <span style={{ fontWeight: "bold" }}>
                    {getSubscriptionDisplayName()}
                  </span>{" "}
                  subscription
                </span>
            )}
              {subscriptionEndDate && subscriptionTier !== "free" && (
                <span
                  style={{...(styles.paragraph || {}), color: theme.secondaryText}}
                >
                  Subscription ends on{" "}
                  <span style={{ fontWeight: "bold" }}>
                    {subscriptionEndDate}
                  </span>
                </span>
            )}
              {subscriptionTier === "free" && (
                <>
                  {subscriptionEndDate ? (
                    <span
                      style={{...(styles.paragraph || {}), color: theme.secondaryText}}
                    >
                      Your last subscription ended on{" "}
                      <span style={{ fontWeight: "bold" }}>
                        {subscriptionEndDate}
                      </span>
                    </span>
                  ) : (
                    <span
                      style={{...(styles.paragraph || {}), color: theme.secondaryText}}
                    >
                      No active subscription
                    </span>
                )}
                  <button
                    style={{...(styles.resubscribeButton || {}), backgroundColor: "#00AEEF"}}
                    onClick={() =>
                      router.push("/verrsa-subscription")
                    }
                  >
                    <span style={styles.resubscribeButtonText}>Subscribe</span>
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}

      <div
        style={{
          height: 1,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
          backgroundColor: theme.border,
        }}
      />

      <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
        - Payment will be charged to your{" "}
        {false
          ? "Apple ID account"
          : false
            ? "Google Play account"
            : "payment method"}{" "}
        at the confirmation of purchase.
      </span>
      <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
        - Subscription automatically renews unless auto-renew is turned off at
        least 24-hours before the end of the current period.
      </span>
      <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
        - Account will be charged for renewal within 24-hours prior to the end
        of the current period. The cost depends on the selected plan.
      </span>
      <span style={{...(styles.paragraph || {}), color: theme.secondaryText}}>
        - Subscriptions{" "}
        {false
          ? "will be managed under Subscriptions in your App Store account settings after purchase"
          : false
            ? "will be managed in your Google Play Store subscriptions after purchase"
            : "can be managed in your account settings after purchase"}
        .
      </span>
      {false && (
        <span
          style={{...(styles.paragraph || {}), marginBottom: 46, color: theme.secondaryText}}
        >
          - Any unused portion of a free trial period, if offered, will be
          forfeited when the user purchases a subscription to that publication,
          where applicable.
        </span>
    )}
      {true && (
        <span
          style={{...(styles.paragraph || {}), marginBottom: 46, color: theme.secondaryText}}
        >
          - You can cancel your subscription at any time from your account
          settings. Cancellation will take effect at the end of the current
          billing period.
        </span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, padding: spacing.lg },
  backButton: { position: "absolute", top: 58, left: 10, zIndex: 10 },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "400",
    textAlign: "center",
    marginTop: spacing.xl5,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: { fontSize: fontSize.xl, fontWeight: "600", marginTop: spacing.sm, marginBottom: spacing.sm },
  paragraph: {
    fontSize: fontSize.base,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  link: { color: "#00AEEF", marginTop: spacing.sm, fontSize: fontSize.sm2, fontWeight: "400" },
  resubscribeButton: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    borderRadius: radius.md,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resubscribeButtonText: {
    color: "#FFFFFF",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
};
