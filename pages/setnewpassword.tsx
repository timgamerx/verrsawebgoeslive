// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { supabase } from '../components/supabase';


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
        window.alert(/* Alert: */ 
          "Invalid Link",
          "This password reset link is invalid or has expired. Please request a new one.",
          [
            {
              text: "OK",
              onPress: () => router.push("/auth"),
            },
          ]
        );
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
      await supabase.auth.signOut();

      window.alert(/* Alert: */ 
        "Success!",
        "Your password has been updated successfully. Please login with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => {
              setNewPassword("");
              setConfirmPassword("");
              router.push("/auth");
            },
          },
        ]
      );
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
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={styles.loadingText}>Verifying reset link...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{overflowY: "auto", flex: 1}}>
        <div style={styles.logoContainer}>
          <img
            src={"/assets/../assets/verrsa-logo.png"}
            style={styles.logo}
            
          />
          <span style={styles.tagline}>Set New Password</span>
          <span style={styles.subtitle}>
            Enter your new password to complete the reset process
          </span>
        </div>

        <div style={styles.formContainer}>
          <div style={styles.inputContainer}>
            <IoChevronBack />
            <input
              style={styles.input}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              
            />
            <button
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <IoChevronBack />
            </button>
          </div>

          <div style={styles.inputContainer}>
            <IoChevronBack />
            <input
              style={styles.input}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              
            />
            <button
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <IoChevronBack />
            </button>
          </div>

          <button
            style={{...(styles.button || {}), ...(loading ? styles.buttonDisabled : {})}}
            onClick={updatePassword}
            disabled={loading}
          >
            {loading ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : (
              <span style={styles.buttonText}>Update Password</span>
            )}
          </button>

          <button
            onClick={() => router.push("/auth")}
            style={styles.backToLogin}
          >
            <span style={styles.backToLoginText}>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: "#666",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xl3,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: fontSize.xl3,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: "#666",
    textAlign: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: radius.lg,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.base,
    backgroundColor: "#f9f9f9",
  },
  input: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.base,
    color: "#333",
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  button: {
    backgroundColor: "#00BFFF",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: spacing.base,
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  backToLogin: {
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
  },
  backToLoginText: {
    color: "#666",
    fontSize: fontSize.base,
  },
};

export default SetNewPassword;
