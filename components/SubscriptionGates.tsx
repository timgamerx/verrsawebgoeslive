// @ts-nocheck
import React from "react";

interface FeatureGateProps {
  feature: string;
  featureName?: string;
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  children,
  fallbackComponent,
}) => {
  return <>{children || fallbackComponent || null}</>;
};

interface UploadTimeLimitProps {
  durationMinutes: number;
  children: React.ReactNode;
  onUpgradeRequired?: () => void;
}

export const UploadTimeGate: React.FC<UploadTimeLimitProps> = ({ children }) => {
  return <>{children}</>;
};

interface VerificationBadgeProps {
  size?: number;
  style?: React.CSSProperties;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ size = 16, style }) => {
  return (
    <span style={{ color: "#00BFFF", fontSize: size, lineHeight: 1, ...style }}>
      ✔
    </span>
  );
};

interface PlanIndicatorProps {
  showPlanName?: boolean;
  style?: React.CSSProperties;
}

export const PlanIndicator: React.FC<PlanIndicatorProps> = ({
  showPlanName = true,
  style,
}) => {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      <span style={{ color: "#999" }}>●</span>
      {showPlanName ? <span style={{ fontSize: 12, color: "#999" }}>Free</span> : null}
    </div>
  );
};

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  return <>{children}</>;
};

export default FeatureGate;
