// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { supabase, signOut } from '../components/supabase';


const SetNewPassword = () => {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        window.alert("This password reset link is invalid or has expired. Please request a new one."); router.push("/auth")
      }
    } catch (error) {
      console.error("Error checking session:", error);
      window.alert("Unable to verify reset link. Please try again.");
      router.push("/auth");
    }
  };

  const validateInputs = () => {
    if (!newPassword.trim()) {
      window.alert("Please enter your new password");
      return false;
    }

    if (newPassword.length < 6) {
      window.alert("Password must be at least 6 characters");
      return false;
    }

    if (newPassword !== confirmPassword) {
      window.alert("Passwords do not match");
      return false;
    }

    return true;
  };

  const updatePassword = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

      console.log("🔄 Updating password...");

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("❌ Update error:", error);
        window.alert(error.message || "Failed to update password");
        return;
      }

      console.log("✅ Password updated successfully");

      // Sign out after password update
      await signOut();

      window.alert("Your password has been updated successfully. Please login with your new password.");
      (() => {
        setNewPassword("");
          setConfirmPassword("");
          router.push("/auth");
      })();
    } catch (error) {
      console.error("❌ Password update error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      window.alert(`Failed to update password: ${errorMessage}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  }; 

  if (!isValidSession) {
    return (
      <div style={{...(styles.container || {}), ...(styles.centered || {})}}>
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          <div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", 
            borderTopColor: "transparent", animation: "spin 1s linear infinite"}}>
          </div>
        </div>
          <p style={styles.loadingText}>Verifying reset link...</p>
      </div>
    );
  }

  return (
  <div style={styles.container}>
    <div style={styles.scrollContent}>

      <div style={styles.logoContainer}>
        <img
          src="/Verrsalogo1.png"
          style={styles.logo}
        />

        <span style={styles.tagline}>
          Set New Password
        </span>

        <span style={styles.subtitle}>
          Enter your new password to complete the reset process
        </span>
      </div>

      <div style={styles.formContainer}>

        {/* New Password */}
        <div style={styles.inputContainer}>
          <IoChevronBack />

          <input
            style={styles.input}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type={showNewPassword ? "text" : "password"}
          />

          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            style={styles.eyeIcon}
          >
            {showNewPassword ? <IoEyeOff /> : <IoEye />}
          </button>
        </div>

        {/* Confirm Password */}
        <div style={styles.inputContainer}>
          <IoChevronBack />

          <input
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type={showConfirmPassword ? "text" : "password"}
          />

          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            {showConfirmPassword ? <IoEyeOff /> : <IoEye />}
          </button>
        </div>

        {/* Update Password Button */}
        <button
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
          onClick={updatePassword}
          disabled={loading}
        >
          {loading ? (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "3px solid #ffffff",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite"
              }}
            />
          ) : (
            <p style={styles.buttonText}>
              Update Password
            </p>
          )}
        </button>

        {/* Cancel Button */}
        <button
          onClick={() => router.push("/auth")}
          style={styles.backToLogin}
        >
          <p style={styles.backToLoginText}>
            Cancel
          </p>
        </button>

      </div>
    </div>
  </div>
);
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#f7f9fc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    boxSizing: "border-box",
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: "16px",
    fontSize: fontSize.base,
    color: "#667085",
    textAlign: "center",
  },

  scrollContent: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "40px",
  },

  logoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "32px",
  },

  logo: {
    width: "140px",
    height: "auto",
    objectFit: "contain",
    marginBottom: "28px",
  },

  tagline: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1d2939",
    textAlign: "center",
    lineHeight: 1.3,
    marginBottom: "10px",
  },

  subtitle: {
    fontSize: "15px",
    color: "#667085",
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: "360px",
  },

  formContainer: {
    width: "100%",
    maxWidth: "440px",
    margin: "0 auto",
    padding: "0 24px 40px",
    boxSizing: "border-box",
  },

  inputContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "0 14px",
    minHeight: "54px",
    marginBottom: "16px",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
  },

  input: {
    flex: 1,
    width: "100%",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    padding: "14px 10px",
    fontSize: "15px",
    color: "#1d2939",
    fontFamily: "inherit",
  },

  eyeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color: "#667085",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
  },

  button: {
    width: "100%",
    minHeight: "54px",
    border: "none",
    backgroundColor: "#00BFFF",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "8px",
    marginBottom: "16px",
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    boxShadow: "0 6px 16px rgba(0, 191, 255, 0.2)",
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 600,
  },

  backToLogin: {
    width: "100%",
    border: "none",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px",
    cursor: "pointer",
  },

  backToLoginText: {
    color: "#667085",
    fontSize: "15px",
    fontWeight: 500,
  },
};

export default SetNewPassword;
