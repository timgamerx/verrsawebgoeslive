import React from "react";
import { MdVerified } from "react-icons/md";

interface VerificationBadgeProps {
  size?: number;
  showText?: boolean;
  style?: React.CSSProperties;
}

export default function VerificationBadge({
  size = 15,
  showText = false,
  style,
}: VerificationBadgeProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 4, ...style }}>
      <MdVerified size={size} color="#00BFFF" />
      {showText && (
        <span style={{ color: "#00BFFF", fontWeight: "600", fontSize: size * 0.75, marginLeft: 2 }}>
          Verified
        </span>
      )}
    </span>
  );
}

