// @ts-nocheck

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/router';
import {
  IoPersonOutline,
  IoAtOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoLogoGoogle,
} from "react-icons/io5";
import { supabase } from '../../components/supabase.js';
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  validatePassword,
  generateUsernameFromEmail,
  createUserProfile,
  getOnboardingData,
  clearOnboardingData,
  getUserEnforcement,
  rateLimiter,
  trackDevice,
  twoFactorAuth,
  sendSignupNotifications,
} from '../../lib/authHelpers.js';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';

export default function Auth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [handlingOAuth, setHandlingOAuth] = useState(false);
  
  // hCaptcha
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const navigationInProgress = useRef(false);

  // ─── Navigation ────────────────────────────────────────────────────────────
  
  const navigateToMainTabs = useCallback(async () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes?.user?.id;
      
      if (currentUserId) {
        const enforcement = await getUserEnforcement(currentUserId);
        if (enforcement?.enforcement_action && enforcement.enforcement_action !== 'none') {
          router.replace({
            pathname: '/restricted',
            query: {
              action: enforcement.enforcement_action,
              message: enforcement.message || '',
            },
          });
          return;
        }
      }
      
      router.replace('/home');
    } catch {
      router.replace('/home');
    } finally {
      setTimeout(() => { navigationInProgress.current = false; }, 500);
    }
  }, [router]);

  // ─── Effects ────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    checkUser();
  }, []);

  // Handles OAuth callbacks (Google sign-in)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (navigationInProgress.current || handlingOAuth) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        const isOAuth = session.user.app_metadata?.provider !== 'email';
        if (!isOAuth) return;

        const { data: existing } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!existing) {
          const name = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || 
                       'User';
          const mail = session.user.email || '';
          await createUserProfile(session.user.id, {
            full_name: name,
            username: generateUsernameFromEmail(mail),
            email: mail
          });
        }
        
        setLoading(false);
        navigateToMainTabs();
      }
    });
    
    return () => authListener?.subscription.unsubscribe();
  }, [handlingOAuth, navigateToMainTabs]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !navigationInProgress.current) {
        navigateToMainTabs();
      }
    } catch (error) {
      console.error('Check user error:', error);
    }
  };

  const validateInputs = () => {
    if (!email.trim()) {
      window.alert('Please enter your email');
      return false;
    }
    if (!password.trim()) {
      window.alert('Please enter your password');
      return false;
    }
    if (!isLogin) {
      if (!fullName.trim()) {
        window.alert('Please enter your full name');
        return false;
      }
      if (!username.trim()) {
        window.alert('Please enter a username');
        return false;
      }
      
      const strength = validatePassword(password);
      if (!strength.isValid) {
        window.alert('Weak Password\n\nPlease create a stronger password:\n' + strength.feedback.join('\n'));
        return false;
      }
    }
    return true;
  };

  // ─── Sign Up ────────────────────────────────────────────────────────────────
  
  const signUp = async () => {
    if (!validateInputs()) return;
    
    if (!captchaToken) {
      window.alert('Please complete the CAPTCHA verification');
      return;
    }

    try {
      setLoading(true);

      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();
        
      if (existing) {
        window.alert('Username already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      const emailRedirectTo =
        `${typeof window !== "undefined" ? window.location.origin : "https://www.verrsa.org"}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            username: username.toLowerCase()
          },
          captchaToken,
        },
      });

      if (error) {
        window.alert(`Sign Up Error\n\n${error.message}`);
        setLoading(false);
        return;
      }
      
      if (!data?.user) {
        setLoading(false);
        return;
      }

      // Check if email needs verification
      if (!data.user.email_confirmed_at) {
        window.alert('Verify Email\n\nPlease check your email and click the verification link to complete your registration.');
        setLoading(false);
        return;
      }

      const userId = data.user.id;
      await createUserProfile(userId, {
        full_name: fullName,
        username: username.toLowerCase(),
        email: email.trim().toLowerCase()
      });
      
      trackDevice(userId).catch(console.error);

      sendSignupNotifications(email.trim().toLowerCase(), fullName, username.toLowerCase()).catch(console.error);

      window.alert('Success\n\nAccount created successfully!');
      localStorage.setItem('last_sign_in_at', String(Date.now()));
      navigateToMainTabs();
      
    } catch (error) {
      console.error('Sign up error:', error);
      window.alert('Error\n\nSomething went wrong. Please try again.');
    } finally {
      setLoading(false);
      if (captchaRef.current) {
        try {
          captchaRef.current.resetCaptcha();
        } catch {}
      }
      setCaptchaToken(null);
    }
  };

  // ─── Sign In ────────────────────────────────────────────────────────────────
  
  const signIn = async () => {
    if (!validateInputs()) return;
    
    try {
      setLoading(true);

      const rateLimit = await rateLimiter.checkLimit('login', email.trim().toLowerCase());
      if (!rateLimit.allowed) {
        window.alert(`Too Many Attempts\n\n${rateLimit.message || 'Please try again later.'}`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        window.alert(`Login Error\n\n${error.message}`);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check for 2FA
        const is2FA = await twoFactorAuth.is2FAEnabled(data.user.id);
        if (is2FA) {
          setPendingUserId(data.user.id);
          setShow2FAModal(true);
          setLoading(false);
          return;
        }

        // Check if profile is complete
        const { data: profile } = await supabase
          .from('profiles')
          .select('country_name, content_category')
          .eq('id', data.user.id)
          .single();
          
        if (profile && (!profile.country_name || !profile.content_category)) {
          if (window.confirm('Complete Your Profile\n\nPlease complete your preferences to continue.')) {
            router.push('/complete-profile');
          }
          setLoading(false);
          return;
        }

        localStorage.setItem('last_sign_in_at', String(Date.now()));
        navigateToMainTabs();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      window.alert('Error\n\nSomething went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth ───────────────────────────────────────────────────────────
  
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setHandlingOAuth(true);

      const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`;
        

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
        },
      });

      if (error) throw error;

      // OAuth will redirect to callback URL, no need to handle here
    } catch (error) {
      console.error('Google sign in error:', error);
      window.alert('Google Sign In Error\n\nFailed to sign in with Google. Please try again.');
      setLoading(false);
      setHandlingOAuth(false);
    }
  };

  // ─── 2FA ────────────────────────────────────────────────────────────────────
  
  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6 || !pendingUserId) return;
    
    setVerifying2FA(true);
    try {
      const result = await twoFactorAuth.verify2FACode(pendingUserId, twoFACode);
      
      if (result.success) {
        setShow2FAModal(false);
        setTwoFACode('');
        setPendingUserId(null);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('country_name, content_category')
          .eq('id', pendingUserId)
          .single();
          
        if (profile && (!profile.country_name || !profile.content_category)) {
          if (window.confirm('Complete Your Profile\n\nPlease complete your preferences to continue.')) {
            router.push('/complete-profile');
          }
          return;
        }
        
        navigateToMainTabs();
      } else {
        window.alert(`Verification Failed\n\n${result.message}`);
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      window.alert('Error\n\nFailed to verify code. Please try again.');
    } finally {
      setVerifying2FA(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <style>{`
        input::placeholder {
          color: #94A3B8;
          opacity: 1;
        }
        input:-ms-input-placeholder {
          color: #94A3B8;
        }
        input::-ms-input-placeholder {
          color: #94A3B8;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={styles.scrollContent}>
        <div style={styles.logoContainer}>
          <img
            src="/verrsa-logo.png"
            alt="Verrsa Logo"
            style={styles.logo}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 style={styles.tagline}>
            {isLogin ? "Welcome back Champ!!!" : "Create your Account and Join Us!"}
          </h1>
          <p style={styles.taglineSubtitle}>
            {isLogin
              ? "Glad to have you back, How are you today?"
              : "Hi champ, let's get you signed up"}
          </p>
        </div>

        <div style={styles.formContainer}>
          {/* Social Buttons */}
          <div style={styles.socialButtonsContainer}>
            <button
              style={styles.googleButton}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <IoLogoGoogle size={20} color="#DB4437" />
              <span style={styles.googleButtonText}>
                {isLogin ? "Sign in with Google" : "Sign up with Google"}
              </span>
            </button>
          </div>

          <div style={styles.dividerContainer}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Sign Up Extra Fields */}
          {!isLogin && (
            <>
              <div style={styles.inputContainer}>
                <IoPersonOutline size={20} color="#666" />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoCapitalize="words"
                />
              </div>

              <div style={styles.inputContainer}>
                <IoAtOutline size={20} color="#666" />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoCapitalize="none"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div style={styles.inputContainer}>
            <IoMailOutline size={20} color="#666" />
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
            />
          </div>

          {/* Password */}
          <div style={styles.inputContainer}>
            <IoLockClosedOutline size={20} color="#666" />
            <input
              style={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              type="button"
            >
              {showPassword ? (
                <IoEyeOutline size={20} color="#666" />
              ) : (
                <IoEyeOffOutline size={20} color="#666" />
              )}
            </button>
          </div>

          {/* Password Strength Meter */}
          {!isLogin && password.length > 0 && (
            <div style={styles.strengthMeterContainer}>
              <PasswordStrengthMeter
                password={password}
                onStrengthChange={setPasswordStrength}
              />
            </div>
          )}

          {/* hCaptcha - shown on sign up */}
          {!isLogin && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <HCaptcha
                ref={captchaRef}
                sitekey="20000ae4-a4f8-44ec-bf0c-5726118ad0e8"
                onVerify={(token) => setCaptchaToken(token)}
                theme="light"
              />
            </div>
          )}

          {/* Forgot Password */}
          {isLogin && (
            <div style={styles.forgotPassword}>
              <a
                href="#"
                style={styles.forgotPasswordText}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/reset-password', { state: { email: email.trim() } });
                }}
              >
                Forgot Password?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={isLogin ? signIn : signUp}
            disabled={loading}
          >
            {loading ? (
              <div style={styles.spinner} />
            ) : (
              <span style={styles.buttonText}>
                {isLogin ? "Sign In" : "Sign Up"}
              </span>
            )}
          </button>

          {/* Switch Mode */}
          <div style={styles.switchMode} onClick={() => setIsLogin(!isLogin)}>
            <span style={styles.switchModeText}>
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span style={styles.switchModeHighlight}>Sign Up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span style={styles.switchModeHighlight}>Sign In</span>
                </>
              )}
            </span>
          </div>

          {/* Terms */}
          <div style={styles.termsContainer}>
            <p style={styles.termsText}>
              By continuing, you agree to our{" "}
              <a
                href="#"
                style={styles.termsLink}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/terms');
                }}
              >
                Terms
              </a>
              ,{" "}
              <a
                href="#"
                style={styles.termsLink}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/privacy');
                }}
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="#"
                style={styles.termsLink}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/community-guidelines');
                }}
              >
                Community Guidelines
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <h2 style={styles.modalTitle}>Two-Factor Authentication</h2>
            <p style={styles.modalDescription}>
              Enter the 6-digit code from your authenticator app
            </p>

            <input
              style={styles.codeInput}
              type="text"
              value={twoFACode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setTwoFACode(val);
              }}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />

            <button
              style={{
                ...styles.verifyButton,
                ...(verifying2FA || twoFACode.length !== 6
                  ? styles.verifyButtonDisabled
                  : {}),
              }}
              onClick={handleVerify2FA}
              disabled={verifying2FA || twoFACode.length !== 6}
            >
              {verifying2FA ? (
                <div style={styles.spinner} />
              ) : (
                <span style={styles.verifyButtonText}>Verify</span>
              )}
            </button>

            <button
              style={styles.cancelButton}
              onClick={() => {
                setShow2FAModal(false);
                setTwoFACode('');
                setPendingUserId(null);
              }}
            >
              <span style={styles.cancelButtonText}>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#FFFFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  scrollContent: {
    width: "100%",
    maxWidth: "450px",
    padding: "40px 20px",
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "48px",
  },
  logo: {
    width: "120px",
    height: "120px",
    marginBottom: "16px",
    objectFit: "contain",
  },
  tagline: {
    fontSize: "28px",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: "8px",
    color: "#0F172A",
    margin: "0 0 8px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  taglineSubtitle: {
    fontSize: "18px",
    fontWeight: "300",
    textAlign: "center",
    color: "#64748B",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  formContainer: {
    width: "100%",
  },
  socialButtonsContainer: {
    marginBottom: "20px",
  },
  googleButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "16px",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  googleButtonText: {
    marginLeft: "12px",
    fontSize: "15px",
    fontWeight: "500",
    color: "#0F172A",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  dividerContainer: {
    display: "flex",
    alignItems: "center",
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    margin: "0 16px",
    fontSize: "14px",
    color: "#94A3B8",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    marginLeft: "12px",
    fontSize: "15px",
    border: "none",
    outline: "none",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  eyeIcon: {
    padding: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  strengthMeterContainer: {
    marginBottom: "16px",
  },
  forgotPassword: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "20px",
  },
  forgotPasswordText: {
    color: "#00BFFF",
    fontSize: "15px",
    fontWeight: "300",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  button: {
    backgroundColor: "#00BFFF",
    padding: "16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    border: "none",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  buttonText: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  switchMode: {
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
  },
  switchModeText: {
    color: "#666",
    fontSize: "15px",
    fontWeight: "300",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  switchModeHighlight: {
    color: "#00bfff",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  termsContainer: {
    marginTop: "32px",
    padding: "0 12px",
  },
  termsText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: "14px",
    lineHeight: "20px",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  termsLink: {
    color: "#00BFFF",
    textDecoration: "underline",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    padding: "32px",
    width: "85%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "12px",
    textAlign: "center",
    color: "#0F172A",
    margin: "0 0 12px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalDescription: {
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "25px",
    color: "#64748B",
    margin: "0 0 25px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  codeInput: {
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    border: "2px solid #00BFFF",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    width: "100%",
    letterSpacing: "10px",
    color: "#0F172A",
    fontFamily: "'Instrument Sans', sans-serif",
    outline: "none",
  },
  verifyButton: {
    backgroundColor: "#00BFFF",
    padding: "16px 48px",
    borderRadius: "9999px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  cancelButton: {
    padding: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  cancelButtonText: {
    fontSize: "14px",
    color: "#64748B",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};
