// @ts-nocheck
import React from "react";
import { useRouter } from 'next/router';

interface FloatingLiveIndicatorProps {
  visible: boolean;
  onReturn: () => void;
  onEnd: () => void;
  viewerCount?: number;
  communityId?: string;
}

export default function FloatingLiveIndicator({
  visible,
  onReturn,
  onEnd,
  viewerCount = 0,
  communityId,
}: FloatingLiveIndicatorProps) {
  const router = useRouter();

  if (!visible) return null;

  const handleReturn = () => {
    if (communityId) {
      router.push(`/community-live/${communityId}`, { state: { resumeMinimized: true } });
    }
    onReturn();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      padding: "8px",
    }}>
      <div style={{
        backgroundColor: "#E53E3E",
        borderRadius: 12,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}>
        <div onClick={handleReturn} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fff",
            animation: "pulse 1s infinite",
          }} />
          <span style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>LIVE</span>
          <span style={{ color: "#fff", fontSize: 13 }}>👁 {viewerCount}</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Tap to return</span>
        </div>
        <div
          onClick={onEnd}
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            color: "#fff",
            fontSize: 12,
          }}
        >
          End
        </div>
      </div>
    </div>
  );
}
