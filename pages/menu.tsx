// @ts-nocheck

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import {
  IoPersonOutline,
  IoCardOutline,
  IoBookmarkOutline,
  IoMegaphoneOutline,
  IoStatsChartOutline,
  IoInformationCircleOutline,
  IoSwapHorizontalOutline,
  IoLogOutOutline,
  IoClose,
  IoPowerOutline,
  IoPersonAddOutline,
  IoCheckmarkDone,
  IoChevronBack,
  IoPhonePortraitOutline,
  IoMoonOutline,
} from "react-icons/io5";
import { supabase } from "../components/supabase";
import VerificationBadge from "../components/VerificationBadge";

export default function Menu({ isOpen = false, onClose, embedded = false }) {
  const router = useRouter();
  const safeOnClose = typeof onClose === "function" ? onClose : () => {};
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [userName, setUserName] = useState("Your Name");
  const [userAvatar, setUserAvatar] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [followSystemTheme, setFollowSystemTheme] = useState(false);
  const [animateIn, setAnimateIn] = useState(embedded);

  useEffect(() => {
    if (embedded) {
      setAnimateIn(true);
      return;
    }
    if (!isOpen) return;

    setAnimateIn(false);
    const rafId = window.requestAnimationFrame(() => {
      setAnimateIn(true);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen, embedded]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          // Fetch user profile data from your database
          const { data: profile, error } = await supabase
            .from("profiles")
            .select(
              "full_name, avatar_url, is_verified, subscription_status, subscription_plan"
            )
            .eq("id", user.id)
            .single();

          if (profile && !error) {
            setUserName(
              profile.full_name || user.email?.split("@")[0] || "Your Name"
            );
            setUserAvatar(profile.avatar_url);

            const hasVerification =
              profile.is_verified ||
              profile.subscription_plan === "basic" ||
              profile.subscription_plan === "premium";
            setIsVerified(hasVerification);
          } else {
            setUserName(user.email?.split("@")[0] || "Your Name");
          }

          setActiveAccountId(user.id);
        }

        // Load stored accounts from localStorage
        const stored = localStorage.getItem("verrsa_accounts");
        if (stored) {
          const accounts = JSON.parse(stored);
          setStoredAccounts(accounts);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleAccountSwitch = async (accountId) => {
    if (accountId === activeAccountId) {
      setSwitchModalVisible(false);
      return;
    }

    setIsLoading(true);
    const targetAccount = storedAccounts.find((acc) => acc.id === accountId);

    try {
      // Switch account logic here
      console.log(`Switching to account: ${targetAccount?.email}`);
      
      // Reload page to refresh session
      setSwitchModalVisible(false);
      window.location.reload();
    } catch (error) {
      console.error("Account switch error:", error);
      alert("Failed to switch account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = () => {
    setSwitchModalVisible(false);
    
    if (window.confirm("You will be redirected to the login screen to add another account.")) {
      supabase.auth.signOut().then(() => {
        router.push("/auth");
      });
    }
  };

  const handleRemoveAccount = (accountId) => {
    const accountToRemove = storedAccounts.find((acc) => acc.id === accountId);
    if (!accountToRemove) return;

    if (window.confirm(`Are you sure you want to remove the account "${accountToRemove.email}"?`)) {
      const updatedAccounts = storedAccounts.filter((acc) => acc.id !== accountId);
      setStoredAccounts(updatedAccounts);
      localStorage.setItem("verrsa_accounts", JSON.stringify(updatedAccounts));

      if (accountId === activeAccountId && updatedAccounts.length === 0) {
        router.push("/auth");
      }
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut().then(() => {
      router.push("/auth");
      setSignOutModalVisible(false);
    });
  };

  if (!embedded && !isOpen) return null;

  const theme = isDarkMode
    ? { background: "#1a1a1a", text: "#fff", secondaryText: "#aaa", border: "#333", icon: "#aaa" }
    : { background: "#fff", text: "#111", secondaryText: "#666", border: "#e8e8e8", icon: "#666" };

  return (
    <>
      {/* Overlay */}
      {!embedded && (
        <div
          style={{
            ...styles.overlay,
            opacity: animateIn ? 1 : 0,
            transition: "opacity 220ms ease",
          }}
          onClick={safeOnClose}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          ...styles.drawerContainer,
          ...(embedded
            ? {
                position: "relative",
                width: "100%",
                maxWidth: "100%",
                height: "100%",
                minHeight: "100vh",
                boxShadow: "none",
                borderLeft: `1px solid ${theme.border}`,
                zIndex: 1,
              }
            : {}),
          ...(!embedded
            ? {
                transform: animateIn ? "translateX(0)" : "translateX(28px)",
                opacity: animateIn ? 1 : 0,
                transition: "transform 240ms ease, opacity 220ms ease",
              }
            : {}),
          backgroundColor: theme.background,
        }}
      >
        <div style={{ ...styles.scrollContainer, ...(embedded ? { paddingTop: "24px" } : {}) }}>
          {/* Profile Section */}
          <div style={styles.profileSection}>
            <img
              src={userAvatar || "/avatar.jpg"}
              alt="Profile"
              style={styles.profileImage}
              onError={(e) => {
                e.target.src = "/avatar.jpg";
              }}
            />
            <div style={{ marginLeft: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ ...styles.profileName, color: theme.text }}>
                  {userName}
                </h2>
                {isVerified && (
                  <VerificationBadge size={16} />
                )}
              </div>
              <p style={styles.profileSubText}>My Account</p>
            </div>
          </div>

          {/* Menu Items */}
          <div style={styles.menuWrapper}>
            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/profile");
                safeOnClose();
              }}
            >
              <IoPersonOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                My Profile
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/monetization");
                safeOnClose();
              }}
            >
              <IoCardOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                Monetization
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/bookmarks");
                safeOnClose();
              }}
            >
              <IoBookmarkOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                Bookmarks
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/ads-boosts");
                safeOnClose();
              }}
            >
              <IoMegaphoneOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                Ads and Boost
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/performance");
                safeOnClose();
              }}
            >
              <IoStatsChartOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                Performance
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                router.push("/about");
                safeOnClose();
              }}
            >
              <IoInformationCircleOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                About Verrsa
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => setSwitchModalVisible(true)}
            >
              <IoSwapHorizontalOutline size={22} color={theme.icon} />
              <span style={{ ...styles.menuText, color: theme.text }}>
                Switch Account
              </span>
            </button>

            <button
              style={styles.menuItem}
              onClick={() => setSignOutModalVisible(true)}
            >
              <IoLogOutOutline size={22} color="red" />
              <span style={{ ...styles.menuText, color: "red" }}>Sign out</span>
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              backgroundColor: theme.border,
              margin: "16px 0",
            }}
          />

          {/* Appearance Section */}
          <div style={styles.appearanceSection}>
            <h3 style={{ ...styles.appearanceSectionTitle, color: theme.text }}>
              APPEARANCE
            </h3>

            {/* Follow System Theme */}
            <div style={styles.appearanceItem}>
              <div style={styles.appearanceLeft}>
                <IoPhonePortraitOutline size={20} color={theme.icon} />
                <div style={{ marginLeft: "12px" }}>
                  <p style={{ ...styles.appearanceText, color: theme.text }}>
                    Follow System Theme
                  </p>
                  <p
                    style={{
                      ...styles.appearanceSubtext,
                      color: theme.secondaryText,
                    }}
                  >
                    Auto match device
                  </p>
                </div>
              </div>
              <div 
                className="switch" 
                style={styles.switch}
                onClick={() => setFollowSystemTheme(!followSystemTheme)}
              >
                <span 
                  className={followSystemTheme ? "slider active" : "slider"} 
                  style={styles.slider}
                ></span>
              </div>
            </div>

            {/* Manual Dark Mode */}
            {!followSystemTheme && (
              <div style={styles.appearanceItem}>
                <div style={styles.appearanceLeft}>
                  <IoMoonOutline size={20} color={theme.icon} />
                  <p style={{ ...styles.appearanceText, color: theme.text, marginLeft: "12px" }}>
                    Dark Mode
                  </p>
                </div>
                <div 
                  className="switch" 
                  style={styles.switch}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  <span 
                    className={isDarkMode ? "slider active" : "slider"} 
                    style={styles.slider}
                  ></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switch Account Modal */}
      {switchModalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.switchModalContent}>
            <button
              onClick={() => setSwitchModalVisible(false)}
              style={styles.closeButton}
            >
              <IoClose size={20} color="#333" />
            </button>

            <h2 style={styles.modalTitle}>Select Account</h2>
            <p style={styles.modalSubtitle}>
              Kindly select the account you would love to switch to.
            </p>

            <div style={styles.accountsScroll}>
              {/* List of stored accounts */}
              {storedAccounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    ...styles.accountItem,
                    ...(account.id === activeAccountId
                      ? styles.activeAccountItem
                      : {}),
                  }}
                  onClick={() => !isLoading && handleAccountSwitch(account.id)}
                >
                  <img
                    src={account.avatar_url || "/avatar.jpg"}
                    alt="Avatar"
                    style={styles.accountAvatar}
                    onError={(e) => {
                      e.target.src = "/avatar.jpg";
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={styles.accountName}>
                        {account.full_name || account.email.split("@")[0]}
                      </span>
                      {account.is_verified && (
                        <VerificationBadge size={14} />
                      )}
                    </div>
                    <p style={styles.accountEmail}>{account.email}</p>
                  </div>
                  <div style={{ alignItems: "center" }}>
                    {account.id === activeAccountId && (
                      <div style={{ textAlign: "center" }}>
                        <IoCheckmarkDone size={24} color="#00BFFF" />
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#00BFFF",
                            marginTop: "2px",
                          }}
                        >
                          Current
                        </p>
                      </div>
                    )}
                    {storedAccounts.length > 1 &&
                      account.id !== activeAccountId && (
                        <button
                          style={styles.removeButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAccount(account.id);
                          }}
                        >
                          <IoClose size={16} color="#999" />
                        </button>
                      )}
                  </div>
                </div>
              ))}

              {/* Add Account */}
              <button
                style={styles.addAccountItem}
                onClick={handleAddAccount}
                disabled={isLoading}
              >
                <IoPersonAddOutline size={21} color="#00BFFF" />
                <span style={styles.addAccountText}>Add Account</span>
              </button>
            </div>

            {isLoading && (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>
                  Switching account... Please wait.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Out Modal */}
      {signOutModalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.signOutModalContent}>
            <button
              onClick={() => setSignOutModalVisible(false)}
              style={styles.closeButton}
            >
              <IoClose size={22} color="#333" />
            </button>

            <div style={styles.iconContainer}>
              <IoPowerOutline size={22} color="red" />
            </div>

            <h2 style={styles.signOutTitle}>Sign Out</h2>
            <p style={styles.signOutMessage}>
              Are you sure you want to Sign Out? You can always Sign In using
              your verified credentials.
            </p>

            <div style={styles.buttonContainer}>
              <button style={styles.signOutButton} onClick={handleSignOut}>
                <span style={styles.signOutButtonText}>Yes, Sign Out</span>
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setSignOutModalVisible(false)}
              >
                <span style={styles.cancelButtonText}>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  drawerContainer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "320px",
    maxWidth: "85vw",
    backgroundColor: "#fff",
    boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.01)",
    zIndex: 1000,
    overflowY: "auto",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  scrollContainer: {
    paddingTop: "70px",
    paddingBottom: "24px",
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    marginBottom: "24px",
  },
  profileImage: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  profileName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  profileSubText: {
    fontSize: "14px",
    color: "#666",
    margin: "2px 0 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  menuWrapper: {
    padding: "0 16px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    padding: "14px 0",
    width: "100%",
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "opacity 0.2s",
    fontFamily: "'Instrument Sans', sans-serif",
    outline: "none",
  },
  menuText: {
    fontSize: "16px",
    marginLeft: "16px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1001,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  switchModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    padding: "25px 24px 32px",
    width: "100%",
    maxWidth: "600px",
    minHeight: "45vh",
    maxHeight: "65vh",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  signOutModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    padding: "24px",
    width: "100%",
    maxWidth: "600px",
    minHeight: "35vh",
    maxHeight: "50vh",
    position: "relative",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  closeButton: {
    position: "absolute",
    top: "20px",
    right: "20px",
    padding: "12px",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    border: "none",
    cursor: "pointer",
    width: "40px",
    height: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "16px",
    marginTop: "35px",
    textAlign: "center",
    color: "#111",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  modalSubtitle: {
    fontSize: "16px",
    color: "#666",
    textAlign: "center",
    marginBottom: "32px",
    padding: "0 16px",
    lineHeight: "22px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  accountsScroll: {
    maxHeight: "400px",
    overflowY: "auto",
    paddingBottom: "8px",
  },
  accountItem: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #e8e8e8",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    width: "100%",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  activeAccountItem: {
    borderColor: "#00BFFF",
    borderWidth: "1px",
    backgroundColor: "#f0f8ff",
  },
  accountAvatar: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    marginRight: "16px",
    objectFit: "cover",
  },
  accountName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#222",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  accountEmail: {
    fontSize: "13px",
    color: "#666",
    marginTop: "2px",
    margin: "2px 0 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  addAccountItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    border: "1.5px solid #e8e8e8",
    borderRadius: "12px",
    padding: "16px",
    width: "100%",
    backgroundColor: "#fafafa",
    marginTop: "16px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  addAccountText: {
    fontSize: "15px",
    color: "#00BFFF",
    fontWeight: "500",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  removeButton: {
    marginTop: "8px",
    padding: "6px",
    borderRadius: "12px",
    backgroundColor: "#f0f0f0",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#ffeaea",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "12px",
    marginTop: "32px",
  },
  signOutTitle: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#111",
    margin: "0 0 12px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  signOutMessage: {
    fontSize: "16px",
    color: "#333",
    marginBottom: "32px",
    lineHeight: "22px",
    margin: "0 0 32px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    gap: "16px",
  },
  signOutButton: {
    flex: 1,
    backgroundColor: "red",
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  signOutButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#eee",
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "500",
    fontSize: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #00BFFF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginLeft: "12px",
    fontSize: "14px",
    color: "#666",
    margin: "0 0 0 12px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  appearanceSection: {
    padding: "16px 16px",
     marginBottom: "56px",
  },
  appearanceSectionTitle: {
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 16px 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  appearanceItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
  },
  appearanceLeft: {
    display: "flex",
    alignItems: "center",
    flex: 1,
  },
  appearanceText: {
    fontSize: "15px",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  appearanceSubtext: {
    fontSize: "12px",
    marginTop: "2px",
    margin: "2px 0 0 0",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  switch: {
    position: "relative",
    display: "inline-block",
    width: "44px",
    height: "24px",
  },
  slider: {
    position: "absolute",
    cursor: "pointer",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: "0.4s",
    borderRadius: "24px",
    ":before": {
      position: "absolute",
      content: '""',
      height: "18px",
      width: "18px",
      left: "3px",
      bottom: "3px",
      backgroundColor: "white",
      transition: "0.4s",
      borderRadius: "50%",
    },
  },
};

// Toggle switch styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .switch {
      cursor: pointer;
    }
    .switch span {
      background-color: #e0e0e0;
    }
    .switch span:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
    .switch span.active {
      background-color: #00bfff !important;
    }
    .switch span.active:before {
      transform: translateX(20px);
    }
  `;
  document.head.appendChild(styleSheet);
}
