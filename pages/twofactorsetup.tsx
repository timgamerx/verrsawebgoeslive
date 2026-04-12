'use client';

// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { twoFactorAuth } from "../lib/twoFactorAuth";

export default function TwoFactorSetup() {
  const router = useRouter();
  const [step, setStep] = useState("intro");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleStartSetup = () => {
    const s = `verrsa-${Math.random().toString(36).slice(2, 12)}`;
    setSecret(s);
    setStep("verify");
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      window.alert("Please enter a 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const result = await twoFactorAuth.verify2FACode(verificationCode);
      const ok = result?.success;
      if (ok) {
        setBackupCodes(["A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2"]);
        setStep("done");
      } else {
        window.alert("Invalid code");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {step === "intro" && (
        <>
          <AppText style={styles.title}>Enable Two-Factor Authentication</AppText>
          <AppText style={styles.description}>Add an extra verification step to secure your account.</AppText>
          <button style={styles.primaryButton} onClick={handleStartSetup}>
            <AppText style={styles.primaryButtonText}>Get Started</AppText>
          </button>
        </>
      )}

      {step === "verify" && (
        <>
          <AppText style={styles.title}>Verify Setup</AppText>
          <AppText style={styles.description}>Secret: {secret || "(generated)"}</AppText>
          <input
            style={styles.input}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
          />
          <button style={styles.primaryButton} onClick={handleVerify} disabled={loading}>
            <AppText style={styles.primaryButtonText}>{loading ? "Verifying..." : "Verify"}</AppText>
          </button>
        </>
      )}

      {step === "done" && (
        <>
          <AppText style={styles.title}>2FA Enabled</AppText>
          <AppText style={styles.description}>Save these backup codes:</AppText>
          <div style={styles.codeBox}>{backupCodes.join("\n")}</div>
          <button style={styles.primaryButton} onClick={() => router.back()}>
            <AppText style={styles.primaryButtonText}>Done</AppText>
          </button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 640,
    margin: "0 auto",
    padding: spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: spacing.base,
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
  },
  description: {
    color: "#666",
  },
  input: {
    border: "1px solid #ddd",
    borderRadius: radius.md,
    padding: "12px 10px",
    fontSize: fontSize.base,
  },
  codeBox: {
    whiteSpace: "pre-line",
    background: "#f6f7f9",
    borderRadius: radius.md,
    padding: spacing.base,
    fontFamily: "monospace",
  },
  primaryButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    padding: "12px 14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
};
