// @ts-nocheck
import React from "react";
import SharedVerificationBadge from "./VerificationBadge";
import { useRouter } from "next/router";
import {
  useFeatureAccess,
  usePlanLimits,
  useSubscription,
} from "../hooks/useSubscription";

interface FeatureGateProps {
  feature: string;
  featureName?: string;
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  featureName,
  children,
  fallbackComponent,
}) => {
  const { hasAccess, loading, plan } = useFeatureAccess(
    feature as any,
    featureName,
  );

  // Fail closed: while loading or without access, show the fallback (never children)
  if (loading || !hasAccess) {
    if (fallbackComponent) return <>{fallbackComponent}</>;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 12,
          color: "#999",
          fontSize: 14,
        }}
      >
        🔒 {featureName || "Premium Feature"} — upgrade to{" "}
        {plan === "free" ? "Basic" : "Premium"} to unlock
      </div>
    );
  }

  return <>{children}</>;
};

interface UploadTimeLimitProps {
  durationMinutes: number;
  children: React.ReactNode;
  onUpgradeRequired?: () => void;
}

export const UploadTimeGate: React.FC<UploadTimeLimitProps> = ({
  durationMinutes,
  children,
  onUpgradeRequired,
}) => {
  const { checks, plan, limits, loading } = usePlanLimits();
  const router = useRouter();

  // Fail closed while the plan is loading
  const canUpload = !loading && checks.canUploadContent(durationMinutes);
  if (canUpload) return <>{children}</>;

  const message =
    checks.getUploadLimitMessage(durationMinutes) ||
    `Your ${plan} plan supports uploads up to ${limits.uploadTimeMinutes} minutes.`;

  const handleUpgrade = () => {
    if (onUpgradeRequired) onUpgradeRequired();
    else router.push("/verrsasubscription");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderRadius: 8,
        border: "1px solid #444",
        color: "#999",
        fontSize: 14,
      }}
    >
      <span>🔒 {loading ? "Checking your plan..." : message}</span>
      {!loading && (
        <button
          onClick={handleUpgrade}
          style={{
            background: "#00AEEF",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Upgrade
        </button>
      )}
    </div>
  );
};

interface VerificationBadgeProps {
  size?: number;
  style?: React.CSSProperties;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ size = 16, style }) => {
  return <SharedVerificationBadge size={size} style={style} />;
};

interface PlanIndicatorProps {
  showPlanName?: boolean;
  style?: React.CSSProperties;
}

export const PlanIndicator: React.FC<PlanIndicatorProps> = ({
  showPlanName = true,
  style,
}) => {
  const { plan, isActive, loading } = useSubscription();
  if (loading) return null;

  const effective = isActive ? plan : "free";
  const color =
    effective === "premium" ? "#FFB400" : effective === "basic" ? "#00AEEF" : "#999";
  const label = effective.charAt(0).toUpperCase() + effective.slice(1);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      <span style={{ color }}>●</span>
      {showPlanName ? <span style={{ fontSize: 12, color }}>{label}</span> : null}
    </div>
  );
};

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { plan, isActive, loading } = useSubscription();
  const router = useRouter();

  if (loading) return null;
  if (plan !== "free" && isActive) return <>{children}</>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: 24,
        color: "#999",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 28 }}>🔒</span>
      <div>A Basic or Premium subscription is required to access this.</div>
      <button
        onClick={() => router.push("/verrsasubscription")}
        style={{
          background: "#00AEEF",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          cursor: "pointer",
        }}
      >
        Upgrade Now
      </button>
    </div>
  );
};

export default FeatureGate;
