// @ts-nocheck
import { useRouter } from 'next/router';
/**
 * SubscriptionPromptModal
 *
 * Shows automatically after the user has been on the app for 5 minutes.
 * Suppressed when the user is already a basic or premium subscriber.
 * After first display, only shows again if more than 24 hours have passed
 * since last dismissal — no spamming.
 */
import React, { useEffect, useRef, useState } from "react";
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { useTheme } from '../context/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from "../hooks/useSubscription";
import { spacing, radius, shadows } from '../lib/theme';
import { navigate } from '../lib/navigationService';

// How long the user must be on the app before we show the modal
const TRIGGER_DELAY_MS = 3 * 60 * 1000; // 3 minutes
// Minimum time between repeat shows
const REPEAT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "subscription_prompt_last_shown";

export const SubscriptionPromptModal: React.FC = () => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if we should show the modal, then schedule it
  useEffect(() => {
    let cancelled = false;

    const schedule = async () => {
      // Only show once a user is fully authenticated — covers both sign-in and sign-up flows
      if (authLoading || !isAuthenticated) return;

      // If user is already subscribed, never show
      if (
        subscription &&
        subscription.isActive &&
        subscription.plan !== "free"
      ) {
        return;
      }

      // Check when we last showed it
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const lastShown = parseInt(raw, 10);
          const elapsed = Date.now() - lastShown;
          if (elapsed < REPEAT_INTERVAL_MS) return; // too soon
        }
      } catch {
        /* ignore storage errors */
      }

      if (cancelled) return;

      timerRef.current = setTimeout(() => {
        if (!cancelled) show();
      }, TRIGGER_DELAY_MS);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Re-evaluates when auth state or subscription status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, subscription?.plan, subscription?.isActive]);

  const show = () => {
    setVisible(true);
  };

  const dismiss = async () => {
    setVisible(false);

    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const handleSubscribe = async () => {
    await dismiss();
    router.push("/verrsasubscription");
  };

  const handleGoLive = async () => {
    await dismiss();
    router.push("/communitylive");
  };

  const handlePromote = async () => {
    await dismiss();
    router.push("/adsandboosts5");
  };

  if (!visible) return null;

  return (
    <div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
      <div style={{...(styles.overlay || {})}}>
        <div
          style={{...(styles.sheet || {}), backgroundColor: theme.cardBackground}}
        >
          {/* Close */}
          <button style={styles.closeBtn} onClick={dismiss}>
            <IoClose />
          </button>

          {/* Icon */}
          <div
            style={{...(styles.iconRing || {}), backgroundColor: colors.accentSurface}}
          >
            <IoStar />
          </div>

          {/* Heading */}
          <span
            variant="h3"
            style={{...(styles.title || {}), color: colors.textPrimary}}
          >
            Unlock Premium Benefits
          </span>
          <span
            variant="bodySmall"
            style={{...(styles.subtitle || {}), color: colors.textSecondary}}
          >
            Subscribe to Basic or Premium to enjoy exclusive features – you get to see how payouts are being structured, go live
            with your community, and promote your content. First-time subscribers get 30% off Basic and Premium.
          </span>

          {/* Action cards */}
          <button
            style={{...(styles.actionCard || {}), backgroundColor: colors.accentSurface}}
            onClick={handleSubscribe}
          >
            <div
              style={{...(styles.actionIcon || {}), backgroundColor: colors.accent}}
            >
              <IoChevronBack />
            </div>
            <div style={styles.actionText}>
              <span variant="label" style={{ color: colors.textPrimary }}>
                Subscribe Now
              </span>
              <span variant="caption" style={{ color: colors.textSecondary }}>
                Basic or Premium plan • 30% off first subscription
              </span>
            </div>
            <IoChevronForward />
          </button>

          <button
            style={{...(styles.actionCard || {}), backgroundColor: colors.surface}}
            onClick={handleGoLive}
          >
            <div
              style={{...(styles.actionIcon || {}), backgroundColor: colors.error}}
            >
              <IoChevronBack />
            </div>
            <div style={styles.actionText}>
              <span variant="label" style={{ color: colors.textPrimary }}>
                Go Live
              </span>
              <span variant="caption" style={{ color: colors.textSecondary }}>
                Stream to your community
              </span>
            </div>
            <IoChevronForward />
          </button>

          <button
            style={{...(styles.actionCard || {}), backgroundColor: colors.surface}}
            onClick={handlePromote}
          >
            <div
              style={{...(styles.actionIcon || {}), backgroundColor: colors.warning}}
            >
              <IoChevronBack />
            </div>
            <div style={styles.actionText}>
              <span variant="label" style={{ color: colors.textPrimary }}>
                Promote a Post
              </span>
              <span variant="caption" style={{ color: colors.textSecondary }}>
                Reach a wider audience
              </span>
            </div>
            <IoChevronForward />
          </button>

          {/* Maybe Later */}
          <button style={styles.laterBtn} onClick={dismiss}>
            <span
              variant="bodySmall"
              style={{ color: colors.textTertiary }}
            >
              Maybe later
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.xl2,
    borderTopRightRadius: radius.xl2,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: false ? spacing.xl3 : spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  closeBtn: {
    position: "absolute",
    top: spacing.base,
    right: spacing.base,
    padding: spacing.xs,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  title: {
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  laterBtn: {
    marginTop: spacing.base,
    padding: spacing.sm,
  },
};

export default SubscriptionPromptModal;
