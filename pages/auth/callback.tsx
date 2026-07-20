// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/router';
import { supabase } from "../../components/supabase";
import {
  getOnboardingData,
  clearOnboardingData,
} from "../../lib/onboardingManager";

type Status = "verifying" | "success" | "error";

const AuthCallback = () => {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Only relevant on web
    if (false) {
      router.push('/home');
      return;
    }

    handleWebCallback();
  }, []);

  const handleWebCallback = async () => {
    try {
      // --- 1. Parse tokens from URL ---
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const search = typeof window !== "undefined" ? window.location.search : "";

      // Hash fragment path (#access_token=...&refresh_token=...)
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let tokenHash: string | null = null;
      let type: string | null = null;
      let errorParam: string | null = null;
      let errorDescription: string | null = null;

      if (hash && hash.length > 1) {
        const params = new URLSearchParams(hash.slice(1));
        accessToken = params.get("access_token");
        refreshToken = params.get("refresh_token");
        type = params.get("type");
        errorParam = params.get("error");
        errorDescription = params.get("error_description");
      }

      // Query string path (?token_hash=...&type=signup — PKCE/OTP style)
      if (!accessToken && search) {
        const params = new URLSearchParams(search.slice(1));
        tokenHash = params.get("token_hash");
        type = params.get("type");
        errorParam = params.get("error");
        errorDescription = params.get("error_description");
      }

      // Surface any Supabase-reported errors
      if (errorParam) {
        const desc = errorDescription || errorParam;
        setErrorMessage(
          desc === "access_denied"
            ? "This link has expired or has already been used."
            : desc.replace(/_/g, " "),
        );
        setStatus("error");
        return;
      }

      // --- 2. Exchange / set session ---
    let session: import("@supabase/supabase-js").Session | null = null;

      if (accessToken && refreshToken) {
        // Classic hash-based redirect — set session directly
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        session = data.session;
      } else if (tokenHash && type) {
        // PKCE / OTP verify
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (error) throw error;
        session = data.session;
      } else {
        // Supabase client may have auto-set the session from the hash;
        // give it a moment then check.
        await new Promise((resolve) => setTimeout(resolve, 800));
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session?.user) {
        throw new Error("Unable to verify your email. The link may have expired.");
      }

      // --- 3. Ensure profile row exists ---
      const user = session.user;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const onboardingData = await getOnboardingData();
        const contentCategory =
          onboardingData.contentCategories?.join(", ") || "";
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "Verrsa User";
        const username =
          user.user_metadata?.username ||
          (user.email ? user.email.split("@")[0].toLowerCase() + Math.floor(Math.random() * 1000) : "user");

        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            full_name: fullName,
            username,
            email: user.email || "",
            bio: "",
            avatar_url: null,
            is_verified: false,
            subscription_tier: "free",
            content_category: contentCategory,
            country_name: onboardingData.countryName || null,
          },
        ]);

        if (profileError) {
          console.error("[AuthCallback] Profile creation failed:", profileError);
          // Non-fatal — proceed, user can update profile later
        } else {
          await clearOnboardingData();
        }
      }

      // Clean URL before navigating away (removes sensitive tokens from history)
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, "/");
      }

      setStatus("success");

      // Small delay so the success state is visible
      setTimeout(() => {
        router.push('/home');
      }, 1200);
    } catch (err: any) {
      console.error("[AuthCallback] Error:", err);
      setErrorMessage(
        err?.message || "Something went wrong. Please try signing up again.",
      );
      setStatus("error");
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {status === "verifying" && (
        <>
          <div style={styles.spinner} />
          <p style={styles.title}>Verifying your email…</p>
          <p style={styles.subtitle}>Just a moment while we confirm your account.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={styles.icon}>✅</div>
          <p style={styles.title}>Email confirmed!</p>
          <p style={styles.subtitle}>Welcome to Verrsa. Taking you in…</p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={styles.icon}>❌</div>
          <p style={styles.title}>Verification failed</p>
          <p style={styles.subtitle}>{errorMessage}</p>
          <button style={styles.button} onClick={() => router.push('/auth')}>
            <span style={styles.buttonText}>Back to Sign In</span>
          </button>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    padding: "0 24px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "4px solid #E2E8F0",
    borderTopColor: "#00BFFF",
    animation: "spin 0.8s linear infinite",
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
    margin: 0,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#64748B",
    margin: 0,
    lineHeight: "22px",
  },
  button: {
    marginTop: 8,
    padding: "14px 32px",
    borderRadius: 12,
    backgroundColor: "#00BFFF",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "'Instrument Sans', sans-serif",
  },
};

export default AuthCallback;
