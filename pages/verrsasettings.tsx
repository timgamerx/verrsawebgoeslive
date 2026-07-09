// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { useTheme } from '../context/ThemeProvider';
import { supabase, signOut } from '../components/supabase';
import { TbChevronLeft, TbDots } from 'react-icons/tb'
import { MdCheck } from 'react-icons/md'
import {
  getUserDevices,
  removeDevice,
  DeviceInfo,
  trackDevice,
} from '../lib/deviceTracking';

const API_BASE_URL = "https://www.verrsa.org/api";

const VerrsaSettings = () => {
  const router = useRouter();
  const {
    isDarkMode,
    theme,
    toggleTheme,
    followSystemTheme,
    setFollowSystemTheme,
  } = useTheme();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{
    nearbyContent: boolean;
    tagLocation: boolean;
    recommendations: boolean;
  }>({ nearbyContent: true, tagLocation: true, recommendations: true });
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = () => {
    window.alert("Are you sure you want to logout?");
  };

  const performAccountDeletion = async () => {
    try {
      setDeletingAccount(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Unable to authenticate current session");
      }

      const response = await fetch(`${API_BASE_URL}/delete-account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "user_requested" }),
      });

      const text = await response.text();
      let payload: any = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (parseError) {
        console.error("Delete account response parsing error", parseError);
        console.error("Response status:", response.status);
        console.error("Response text:", text.substring(0, 200)); // Log first 200 chars
      }

      if (!response.ok) {
        const errorMessage =
          payload?.error ||
          text.substring(0, 100) ||
          "Failed to delete account";
        throw new Error(errorMessage);
      }

      await AsyncStorage.multiRemove([
        "notificationsEnabled",
        "locationServicesEnabled",
        "locationOptions",
        "biometricAuthEnabled",
      ]).catch((storageError) => {
        console.warn("Preference cleanup error", storageError);
      });

      await signOut();

      window.alert("Your Verrsa account has been deleted."); router.push("/")
    } catch (error) {
      console.error("Account deletion error", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.";
      window.alert(message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("This action cannot be undone. Are you sure you want to delete your account?")) { /* TODO: handle confirm */ }
  };

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = (data as any)?.user;
        setCurrentUserEmail(user?.email ?? null);

        // Load user devices
        if (user?.id) {
          loadUserDevices(user.id);

          // Track current device if no devices found (for existing users)
          const userDevices = await getUserDevices(user.id);
          if (userDevices.length === 0) {
            await trackDevice(user.id);
            // Reload devices after tracking
            setTimeout(() => loadUserDevices(user.id), 1000);
          }
        }
      } catch (err) {
        console.error("Failed to get current user:", err);
      }
    };

    fetchUserEmail();
    // load saved preferences
    const loadPrefs = async () => {
      try {
        const notif = localStorage.getItem("notificationsEnabled");
        const loc = localStorage.getItem("locationServicesEnabled");
        const locOpts = localStorage.getItem("locationOptions");
        const bio = localStorage.getItem("biometricAuthEnabled");

        // For notifications, also check system permission status
        if (notif !== null) {
          const storedValue = JSON.parse(notif);
          // Verify with system permissions
          const { status } = await Notifications.getPermissionsAsync();
          const actuallyEnabled = storedValue && status === "granted";
          setNotifications(actuallyEnabled);

          // Update storage if there's a mismatch
          if (actuallyEnabled !== storedValue) {
            localStorage.setItem(
              "notificationsEnabled",
              JSON.stringify(actuallyEnabled),
            );
          }
        } else {
          // If no stored value, check system permissions
          const { status } = await Notifications.getPermissionsAsync();
          setNotifications(status === "granted");
        }

        if (loc !== null) setLocationServices(JSON.parse(loc));
        if (locOpts !== null) setLocationOptions(JSON.parse(locOpts));
        if (bio !== null) setBiometricAuth(JSON.parse(bio));
      } catch (err) {
        console.error("Failed to load preferences:", err);
      }
    };

    loadPrefs();
  }, []);

  // Refresh notification status when screen comes into focus
  useEffect(
    (() => {
      const checkNotificationStatus = async () => {
        try {
          const notif = localStorage.getItem("notificationsEnabled");
          const { status } = await Notifications.getPermissionsAsync();
          const actuallyEnabled = notif === "true" && status === "granted";
          setNotifications(actuallyEnabled);
        } catch (err) {
          console.error("Error checking notification status:", err);
        }
      };
      checkNotificationStatus();
    }, []),
  );

  const handleToggleNotifications = async (val: boolean) => {
    try {
      if (val) {
        // Check current permission status first
        const { status: currentStatus } =
          await Notifications.getPermissionsAsync();

        if (currentStatus === "denied") {
          // Permission was previously denied on web — inform the user
          window.alert("Notification permissions are disabled. Please enable them in your browser settings.");
          return;
        }

        if (currentStatus !== "granted") {
          // Request permission (first time or undetermined)
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            window.alert("To receive updates from Verrsa, please enable notifications in your browser settings.");
            return;
          }
        }
      }

      setNotifications(val);
  localStorage.setItem("notificationsEnabled", JSON.stringify(val));
    } catch (err) {
      window.alert("Unable to update notification setting");
    }
  };

  const handleLocationMainToggle = async (val: boolean) => {
    if (val) {
      // show modal for selecting features
      setLocationModalVisible(true);
    } else {
      // disabling location services
      setLocationServices(false);
      localStorage.setItem(
        "locationServicesEnabled",
        JSON.stringify(false),
      );
      // clear options
      localStorage.setItem(
        "locationOptions", JSON.stringify({
          nearbyContent: false,
          tagLocation: false,
          recommendations: false,
        }),
      );
      setLocationOptions({
        nearbyContent: false,
        tagLocation: false,
        recommendations: false,
      });
    }
  };

  const toggleLocationOption = (key: keyof typeof locationOptions) => {
    setLocationOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveLocationOptions = async () => {
    try {
      const anyEnabled = Object.values(locationOptions).some(Boolean);
      if (anyEnabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          window.alert("Location permission denied");
          setLocationModalVisible(false);
          return;
        }
        setLocationServices(true);
        localStorage.setItem(
          "locationServicesEnabled",
          JSON.stringify(true),
        );
      } else {
        setLocationServices(false);
        localStorage.setItem(
          "locationServicesEnabled",
          JSON.stringify(false),
        );
      }
      localStorage.setItem(
        "locationOptions",
        JSON.stringify(locationOptions),
      );
      setLocationModalVisible(false);
    } catch (err) {
      console.error("Save location options error:", err);
      window.alert("Unable to save location options");
    }
  };

  const handleToggleBiometric = async (val: boolean) => {
    try {
      if (val) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          window.alert("Biometric authentication is not available on this device");
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable biometric authentication",
        });
        if (!result.success) {
          window.alert("Could not verify your identity");
          return;
        }
      }
      setBiometricAuth(val);
      localStorage.setItem("biometricAuthEnabled", JSON.stringify(val));
    } catch (err) {
      console.error("Biometric toggle error:", err);
      window.alert("Unable to update biometric setting");
    }
  };

  const loadUserDevices = async (userId: string) => {
    try {
      setLoadingDevices(true);
      const userDevices = await getUserDevices(userId);
      setDevices(userDevices);
    } catch (error) {
      console.error("Error loading devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (window.confirm("Are you sure you want to remove this device from your account?")) {
      try {
        const { data } = await supabase.auth.getUser();
        const user = (data as any)?.user;
        if (!user?.id) return;
        const success = await removeDevice(user.id, deviceId);
        if (success) {
          window.alert("Device removed from your account");
          loadUserDevices(user.id);
        } else {
          window.alert("Failed to remove device");
        }
      } catch (error) {
        console.error("Error removing device:", error);
        window.alert("Failed to remove device");
      }
    }
  };

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <div style={{overflowY: "auto", flex: 1}}>
      <div style={{...(styles.header || {}), backgroundColor: theme.background}}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => {
              console.log("Back button pressed");
              router.back();
            }}
          >
            <TbChevronLeft />
          </button>
        </div>
        <div style={styles.headerCenter}>
          <span style={{...(styles.headerTitle || {}), color: theme.text}}>
            Verrsa Settings
          </span>
        </div>
        <div style={styles.headerRight} />
      </div>

      {/* Appearance Section */}
      <div style={{...(styles.section || {}), backgroundColor: theme.cardBackground}}>
        <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
          Appearance
        </span>

        {/* Follow System Theme */}
        <div style={styles.settingItem}>
          <div style={styles.settingLeft}>
            <MdCheck />
            <div>
              <span style={{...(styles.settingText || {}), color: theme.text}}>
                Follow System Theme
              </span>
              <span
                style={{...(styles.settingSubtext || {}), color: theme.secondaryText}}
              >
                Automatically match device appearance
              </span>
            </div>
          </div>
          <input type="checkbox" checked={followSystemTheme} onChange={(e) => setFollowSystemTheme(e.target.checked)} style={{cursor:"pointer"}} />
        </div>

        {/* Manual Dark Mode (only show if not following system) */}
        {!followSystemTheme && (
          <div style={styles.settingItem}>
            <div style={styles.settingLeft}>
              <MdCheck />
              <span style={{...(styles.settingText || {}), color: theme.text}}>
                Dark Mode
              </span>
            </div>
            <input type="checkbox" checked={isDarkMode} onChange={(e) => toggleTheme(e.target.checked)} style={{cursor:"pointer"}} />
          </div>
        )}
      </div>

      {/* General Section */}
      <div style={{...(styles.section || {}), backgroundColor: theme.cardBackground}}>
        <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
          General
        </span>

        <button style={styles.settingItem}>
          <div style={styles.settingLeft}>
            <MdCheck />
            <span style={{...(styles.settingText || {}), color: theme.text}}>
              Language
            </span>
          </div>
          <span style={{...(styles.settingValue || {}), color: theme.secondaryText}}>
            English
          </span>
          <TbDots />
        </button>
      </div>

      {/* Privacy & Security Section */}
      <div style={{...(styles.section || {}), backgroundColor: theme.cardBackground}}>
        <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
          Privacy & Security
        </span>

        <div style={styles.settingItem}>
          <div style={styles.settingLeft}>
            <MdCheck />
            <span style={{...(styles.settingText || {}), color: theme.text}}>
              Push Notifications
            </span>
          </div>
          <input type="checkbox" checked={notifications} onChange={(e) => handleToggleNotifications(e.target.checked)} style={{cursor:"pointer"}} />
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingLeft}>
            <MdCheck />
            <span style={{...(styles.settingText || {}), color: theme.text}}>
              Location Services
            </span>
          </div>
          <input type="checkbox" checked={locationServices} onChange={(e) => handleLocationMainToggle(e.target.checked)} style={{cursor:"pointer"}} />
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingLeft}>
            <MdCheck />
            <span style={{...(styles.settingText || {}), color: theme.text}}>
              Biometric Authentication
            </span>
          </div>
          <input type="checkbox" checked={biometricAuth} onChange={(e) => handleToggleBiometric(e.target.checked)} style={{cursor:"pointer"}} />
        </div>

        <button
          style={styles.settingItem}
          onClick={async () => {
            if (window.confirm("You will be signed out and redirected to reset your password.")) {
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  currentUser?.email || "",
                  { redirectTo: `${window.location.origin}/setnewpassword` },
                );
                if (!error) {
                  window.alert("We've sent a password reset link to your email address.");
                  await supabase.auth.signOut();
                  router.push("/");
                } else {
                  window.alert("Something went wrong. Please try again.");
                }
              } catch (error) {
                console.error("Error changing password:", error);
                window.alert("Something went wrong. Please try again.");
              }
            }
          }}
        >
          <div style={styles.settingLeft}>
            <MdCheck />
            <span style={{...(styles.settingText || {}), color: theme.text}}>
              Change Password
            </span>
          </div>
          <TbDots />
        </button>

        {/* Active Devices Section */}
        <div style={styles.devicesSection}>
          <div style={styles.devicesSectionHeader}>
            <MdCheck />
            <span style={{...(styles.devicesSectionTitle || {}), color: theme.text}}>
              Active Devices
            </span>
          </div>
          <span
            style={{...(styles.settingSubtext || {}), color: theme.secondaryText, marginBottom: spacing.md}}
          >
            Devices currently signed in to your account
          </span>

          {loadingDevices ? (
            <span
              style={{...(styles.settingSubtext || {}), color: theme.secondaryText}}
            >
              Loading devices...
            </span>
          ) : devices.length === 0 ? (
            <span
              style={{...(styles.settingSubtext || {}), color: theme.secondaryText}}
            >
              No devices found
            </span>
          ) : (
            devices.map((device) => (
              <div
                key={device.device_id}
                style={{...(styles.deviceCard || {}), backgroundColor: theme.background,
                    borderColor: theme.border,}}
              >
                <div style={styles.deviceInfo}>
                  <div style={styles.deviceIcon}>
                    <MdCheck />
                  </div>
                  <div style={styles.deviceDetails}>
                    <div style={styles.deviceTitleRow}>
                      <span style={{...(styles.deviceType || {}), color: theme.text}}>
                        {device.device_type}
                      </span>
                      {device.is_current && (
                        <div
                          style={{...(styles.currentBadge || {}), backgroundColor: theme.accent}}
                        >
                          <span style={styles.currentBadgeText}>Current</span>
                        </div>
                      )}
                    </div>
                    {device.browser && (
                      <span
                        style={{...(styles.deviceBrowser || {}), color: theme.secondaryText}}
                      >
                        {device.browser}
                      </span>
                  )}
                    <span
                      style={{...(styles.deviceLastActive || {}), color: theme.secondaryText}}
                    >
                      Last active: {formatLastActive(device.last_active)}
                    </span>
                  </div>
                </div>
                {!device.is_current && (
                  <button
                    onClick={() => handleRemoveDevice(device.device_id)}
                    style={styles.removeDeviceButton}
                  >
                    <MdCheck />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Location Options Modal */}
      {(locationModalVisible) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setLocationModalVisible(false)}>
        <div style={styles.modalContainer}>
          <div
            style={{...(styles.modalContent || {}), backgroundColor: theme.cardBackground}}
          >
            <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
              Location Usage
            </span>
            <span
              style={{...(styles.settingSubtext || {}), color: theme.secondaryText}}
            >
              Select which features may use your location
            </span>

            <div style={styles.optionRow}>
              <span style={{...(styles.settingText || {}), color: theme.text}}>
                Nearby content
              </span>
              <input type="checkbox" checked={locationOptions.nearbyContent} onChange={(e) => () => toggleLocationOption("nearbyContent")(e.target.checked)} style={{cursor:"pointer"}} />
            </div>

            <div style={styles.optionRow}>
              <span style={{...(styles.settingText || {}), color: theme.text}}>
                Tag location in posts
              </span>
              <input type="checkbox" checked={locationOptions.tagLocation} onChange={(e) => () => toggleLocationOption("tagLocation")(e.target.checked)} style={{cursor:"pointer"}} />
            </div>

            <div style={styles.optionRow}>
              <span style={{...(styles.settingText || {}), color: theme.text}}>
                Location-based recommendations
              </span>
              <input type="checkbox" checked={locationOptions.recommendations} onChange={(e) => () => toggleLocationOption("recommendations")(e.target.checked)} style={{cursor:"pointer"}} />
            </div>

            <div style={styles.modalButtons}>
              <button
                style={styles.modalButton}
                onClick={() => setLocationModalVisible(false)}
              >
                <span style={styles.settingText}>Cancel</span>
              </button>
              <button
                style={{...(styles.modalButton || {}), backgroundColor: theme.accent}}
                onClick={saveLocationOptions}
              >
                <span style={{...(styles.settingText || {}), color: "#fff"}}>
                  Save
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
  )}
      {/* Account Actions */}
      <div style={{...(styles.section || {}), backgroundColor: theme.cardBackground}}>
        <button
          style={{...(styles.actionButton || {}), ...(deletingAccount ? styles.actionButtonDisabled : {})}}
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <MdCheck />
          <span style={{...(styles.actionButtonText || {}), color: "#ff4757"}}>
            {deletingAccount ? "Deleting..." : "Delete Account"}
          </span>
        </button>
      </div>

      <div style={styles.versionContainer}>
        <span style={{...(styles.versionText || {}), color: theme.secondaryText}}>
          Verrsa v1.2.0
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerLeft: {
    width: 60,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: 60,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "400",
  },
  section: {
    marginTop: spacing.lg,
    marginLeft: spacing.base,
    marginRight: spacing.base,
    borderRadius: radius.lg,
    padding: spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "400",
    marginBottom: spacing.base,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    marginRight: spacing.base,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: fontSize.md,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    fontSize: fontSize.base,
    marginLeft: spacing.md,
  },
  settingSubtext: {
    fontSize: fontSize.sm,
    marginLeft: spacing.md,
    marginTop: spacing.px,
  },
  settingValue: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    marginLeft: spacing.md,
    color: "#ff6b6b",
    fontWeight: "500",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
  },
  versionText: {
    fontSize: fontSize.md,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    padding: spacing.base,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    gap: spacing.md,
  },
  modalButton: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    borderRadius: radius.md,
    backgroundColor: "#fff",
  },
  devicesSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  devicesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  devicesSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceIcon: {
    marginRight: spacing.md,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  deviceType: {
    fontSize: fontSize.md,
    fontWeight: "500",
    flex: 1,
  },
  currentBadge: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
    borderRadius: radius.xs,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  deviceBrowser: {
    fontSize: fontSize.sm,
    marginBottom: spacing.px,
  },
  deviceLastActive: {
    fontSize: fontSize.xs,
  },
  removeDeviceButton: {
    padding: spacing.sm,
  },
};

export default VerrsaSettings;
