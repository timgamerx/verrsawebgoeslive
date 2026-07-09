// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { sendPasswordResetNotifications } from '../lib/emailService';
import { useTheme } from '../context/ThemeProvider';

const ResetPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
    const { theme, colors } = useTheme();

  // Get email from route params if available
  React.useEffect(() => {
    const queryEmail =
      typeof router.query.email === "string" ? router.query.email : "";
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [router.query.email]);

  // Function to send notification emails using SendGrid
  const sendNotificationEmails = async (
    userEmail: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(
        `📧 Sending password reset notifications for ${userEmail}...`,
      );

      const result = await sendPasswordResetNotifications(userEmail);

      if (result.success) {
        console.log("✅ All notification emails sent successfully");
        return {
          success: true,
          message: "Notification emails sent successfully",
        };
      } else {
        console.error("❌ Some emails failed to send:", result.errors);
        return {
          success: false,
          message: `Email delivery issues: ${result.errors.join(", ")}`,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown email error";
      console.error("❌ Email service error:", errorMessage);

      return {
        success: false,
        message: `Failed to send notifications: ${errorMessage}`,
      };
    }
  };

  // Function to send password reset email
  const resetPassword = async () => {
    if (!email.trim()) {
      window.alert("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const userEmail = email.trim().toLowerCase();

      console.log("🔄 Sending password reset email to:", userEmail);

      // Send password reset email through Supabase Auth
      // The redirect URL must be added to Supabase's allowed redirect URLs
      const redirectUrl =
        true
          ? typeof window !== "undefined" && window.location?.origin
            ? `${typeof window !== "undefined" ? window.location.origin : ""}/set-new-password`
            : "https://www.verrsa.org/set-new-password"
          : "verrsa://set-new-password";

      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("❌ Reset error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });

        if (
          error.message?.toLowerCase().includes("user not found") ||
          error.message?.toLowerCase().includes("invalid email")
        ) {
          window.alert("No account found with this email address.");
        } else if (
          error.message?.toLowerCase().includes("sending recovery email") ||
          error.message?.toLowerCase().includes("error sending")
        ) {
          window.alert("We're experiencing issues with our email service. Please try again in a few minutes.");
        } else {
          window.alert(`Unable to send reset email: ${error.message || "Unknown error"}. Please try again.`);
        }
        return;
      }

      console.log("✅ Password reset email sent successfully");

      // Send additional notification emails via SendGrid
      try {
        const emailResult = await sendNotificationEmails(userEmail);
        if (!emailResult.success) {
          console.warn(
            "⚠️ SendGrid notifications failed:",
            emailResult.message,
          );
        }
      } catch (emailError) {
        console.warn("⚠️ SendGrid notification error:", emailError);
        // Don't block the flow if SendGrid fails
      }

      window.alert("We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.");
(() => {
  setEmail("");
              router.push("/auth");
})();
    } catch (error) {
      console.error("❌ Password reset error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      window.alert(`Failed to send reset email: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    router.push("/auth");
  };

  return (
    <div>
      <div style={{overflowY: "auto", flex: 1}}>
        <div style={styles.logoContainer}>
          <img
            src={"/assets/../assets/verrsa-logo.png"}
            style={styles.logo}
            
          />
          <span style={{...(styles.tagline || {}), color: theme.text}}>
            Reset Password
          </span>
          <span style={{...(styles.subtitle || {}), color: theme.secondaryText}}>
            Enter your email address and we'll send you a link to reset your
            password
          </span>
        </div>

        <div style={styles.formContainer}>
          <div
            style={{...(styles.inputContainer || {}), backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
          >
            <IoChevronBack />
            <input
              style={{...(styles.input || {}), color: theme.text}}
              placeholder="Email"
              placeholderTextColor={theme.secondaryText}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              
            />
          </div>

          <button
            style={{...(styles.button || {}), ...(loading ? styles.buttonDisabled : {})}}
            onClick={resetPassword}
            disabled={loading}
          >
            {loading ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : (
              <span style={styles.buttonText}>Send Reset Link</span>
            )}
          </button>

          <button onClick={goBackToLogin} style={styles.backToLogin}>
            <span style={{...(styles.backToLoginText || {}), color: theme.accent}}>
              Back to Login
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
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
    fontSize: fontSize.lg,
    color: "#666",
    textAlign: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    fontWeight: "300",
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
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: "center",
    marginBottom: spacing.base,
  },
  secondaryButtonText: {
    color: "#00BFFF",
    fontSize: fontSize.md,
  },
  backToLogin: {
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
  },
  backToLoginText: {
    color: "#666",
    fontSize: fontSize.lg,
  },
};

export default ResetPassword;
