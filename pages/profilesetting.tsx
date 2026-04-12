// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import {
  fetchCurrentUserProfile,
  getMemberSinceDate,
} from '../lib/profileUtils';
import { useTheme } from '../context/ThemeProvider';
import {
  getUserDevices,
  removeDevice,
  DeviceInfo,
  trackDevice,
} from '../lib/deviceTracking';
import { TbChevronLeft, TbDots } from 'react-icons/tb'
import { MdCheck, MdVerified } from 'react-icons/md'
import {
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
} from '../lib/notificationService';

type NotificationPreferences = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  mentions: true,
};

const NOTIFICATION_LABELS: Record<keyof NotificationPreferences, string> = {
  likes: "Likes",
  comments: "Comments",
  follows: "Follows",
  messages: "Messages",
  mentions: "Mentions",
};


interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  isVerified: boolean;
  isOnline: boolean;
  memberSince: string;
  avatar?: string;
  avatar_url?: string; // Add this for consistency
}

export default function ProfileSetting() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    isVerified: false,
    isOnline: true,
    memberSince: "Jan 2023",
    });
  const [refreshing, setRefreshing] = useState(false);
  const [isSupportAgent, setIsSupportAgent] = useState(false);

  // Settings state
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

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);

  const API_BASE_URL = "https://www.verrsa.org/api";

  // Load user profile data when screen focuses
  useEffect(
    (() => {
      loadUserProfile();
    }, []),
  );

  const loadUserProfile = async () => {
    try {
      // Get current authenticated user for member since date
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found");
        window.alert(/* Alert: */ 
          "Authentication Error",
          "Please log in again to view your profile.",
        );
        return;
      }

      // Use the utility function to fetch profile
      const profileData = await fetchCurrentUserProfile();

      console.log("ProfileSetting - Authenticated user:", user.id);
      console.log("ProfileSetting - Profile data:", profileData);

      if (profileData) {
        const memberSinceDate = getMemberSinceDate(user.created_at);

        // Check if user is admin via database field
        setIsSupportAgent(profileData.is_admin === true);

        const userProfileData = {
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          email: profileData.email || user.email || "",
          phone: profileData.phone || "",
          username: profileData.username || user.email?.split("@")[0] || "",
          isVerified: profileData.is_verified || false,
          isOnline: true,
          memberSince: memberSinceDate,
          avatar: profileData.avatar_url || profileData.avatar || "",
        };

        console.log("ProfileSetting - Setting user profile:", userProfileData);
        setUserProfile(userProfileData);
      } else {
        // Fallback: create a basic profile from authentication data
        // No database profile means not an admin
        setIsSupportAgent(false);

        const fallbackProfile = {
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
          phone: "",
          username: user.email?.split("@")[0] || "",
          isVerified: false,
          isOnline: true,
          memberSince: getMemberSinceDate(user.created_at),
          avatar: user.user_metadata?.avatar_url || "",
        };

        console.log(
          "ProfileSetting - Using fallback profile:",
          fallbackProfile,
        );
        setUserProfile(fallbackProfile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }

    // Load settings preferences
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
            JSON.stringify(actuallyEnabled)
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

      // Load notification preferences (from DB with AsyncStorage fallback)
      const notifPrefs = localStorage.getItem("notificationPreferences");
      if (notifPrefs !== null) {
        setNotificationPrefs(JSON.parse(notifPrefs));
      } else {
        // Set defaults and save them
        localStorage.setItem(
          "notificationPreferences",
          JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
        );
        setNotificationPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }

    // Load user devices
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      console.error("Failed to load devices:", err);
    }
  };

  const handleLogout = () => {
  const router = useRouter();
    window.alert("Are you sure you want to logout?");
  };

  const handleVerification = () => {
    if (userProfile.isVerified) {
      window.alert("Your account is already verified!");
      return;
    }

    window.alert(/* Alert: */ 
      "Account Verification",
      "This will redirect you to the verification process. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => router.push("/monetization"),
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  // Settings handler functions
  const handleToggleNotifications = async (val: boolean) => {
    try {
      if (val) {
        // Check current permission status first
        const { status: currentStatus } =
          await Notifications.getPermissionsAsync();

        if (currentStatus === "denied") {
          // Permission was previously denied - can't request again
          window.alert(/* Alert: */ 
            "Enable Notifications",
            "Notification permissions are disabled. Please enable them in your device settings:\n\niOS: Settings > Verrsa > Notifications\nAndroid: Settings > Apps > Verrsa > Notifications",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  if (false) {
                    window.open("app-settings:", "_blank");
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ],
          );
          return;
        }

        if (currentStatus !== "granted") {
          // Request permission (first time or undetermined)
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            // Just denied - show helpful message with Open Settings
            window.alert(/* Alert: */ 
              "Enable Notifications",
              "To receive updates from Verrsa, please enable notifications in your device settings:\n\niOS: Settings > Verrsa > Notifications\nAndroid: Settings > Apps > Verrsa > Notifications",
              [
                { text: "Maybe Later", style: "cancel" },
                {
                  text: "Open Settings",
                  onPress: () => {
                    if (false) {
                      window.open("app-settings:", "_blank");
                    } else {
                      Linking.openSettings();
                    }
                  },
                },
              ],
            );
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
        JSON.stringify(false)
      );
      // clear options
      localStorage.setItem(
        "locationOptions",
        JSON.stringify({
          nearbyContent: false,
          tagLocation: false,
          recommendations: false,
        })
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
          JSON.stringify(true)
        );
      } else {
        setLocationServices(false);
        localStorage.setItem(
          "locationServicesEnabled",
          JSON.stringify(false)
        );
      }
      localStorage.setItem(
        "locationOptions",
        JSON.stringify(locationOptions)
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
          window.alert(/* Alert: */ 
            "Not supported",
            "Biometric authentication is not available on this device",
          );
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable biometric authentication",
        });
        if (!result.success) {
          window.alert(/* Alert: */ 
            "Authentication failed",
            "Could not verify your identity",
          );
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
    window.alert(/* Alert: */ 
      "Remove Device",
      "Are you sure you want to remove this device from your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
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
          },
        },
      ],
    );
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

  // Notification preferences management
  const updateNotificationPref = async (
    category: keyof NotificationPreferences,
    key: string,
    value: boolean,
  ) => {
    try {
      const updatedPrefs = {
        ...notificationPrefs,
        [category]: {
          ...notificationPrefs[category],
          [key]: value,
        },
      };
      setNotificationPrefs(updatedPrefs);
      // Persist to AsyncStorage (fast) — full DB save happens on modal close
      localStorage.setItem(
        "notificationPreferences",
        JSON.stringify(updatedPrefs)
      );
    } catch (error) {
      console.error("Error updating notification preference:", error);
      window.alert("Failed to update notification settings");
    }
  };

  const saveAllNotificationPrefs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await saveUserNotificationPreferences(user.id, notificationPrefs);
      } else {
        // Fallback to AsyncStorage only
        localStorage.setItem(
          "notificationPreferences",
          JSON.stringify(notificationPrefs)
        );
      }

      setNotificationModalVisible(false);
      window.alert("Notification preferences saved");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      window.alert("Failed to save notification settings");
    }
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

      await supabase.auth.signOut();

      window.alert(/* Alert: */ 
        "Account Deleted",
        "Your Verrsa account has been deleted.",
        [
          {
            text: "OK",
            onPress: () =>
              router.push("/"),
          },
        ],
        { cancelable: false },
      );
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
    window.alert(/* Alert: */ 
      "Delete Account",
      "This action cannot be undone. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: performAccountDeletion,
        },
      ],
    );
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>
      <div
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{...(styles.title || {}), color: theme.text}}>Profile</span>
      </div>

      <div style={{...(styles.settingsContainer), overflowY: "auto"}}
      >
        <button
          onClick={() => router.push("/edit-profile-information")}
        >
          <img
            src={
              userProfile.avatar
                ? { uri: userProfile.avatar }
                : "/assets/../assets/avatar.jpg"
            }
            style={{
              width: 85,
              height: 85,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: "#000",
              alignSelf: "center",
              marginBottom: spacing.lg,
              marginTop: spacing.lg,
            }}
          />
        </button>

        <div style={styles.infoContainer}>
          <span style={{...(styles.infoText || {}), color: theme.text}}>
            {userProfile.firstName || userProfile.lastName
              ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
              : userProfile.username || "User"}
            {userProfile.isVerified && (
              <MdVerified />
            )}
          </span>
          <span style={styles.infoSubText}>{userProfile.email}</span>
          <button
            onClick={handleVerification}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "center",
              backgroundColor: userProfile.isVerified ? "#000" : "#00BFFF",
              paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
              paddingLeft: spacing.base,
    paddingRight: spacing.base,
              borderRadius: radius.md,
              marginTop: spacing.base,
              marginBottom: -10,
            }}
          >
            <span style={{ color: "#fff", marginRight: spacing.sm, fontSize: fontSize.md }}>
              {userProfile.isVerified ? "Verified" : "Get Verified"}
            </span>
            <MdVerified />
          </button>
        </div>

        <span
          style={{
            textAlign: "center",
            color: userProfile.isOnline ? "green" : "#999",
            fontSize: fontSize.sm,
            marginBottom: spacing.lg,
          }}
        >
          {userProfile.isOnline ? "Online" : "Offline"}
        </span>

        <span
          style={{
            textAlign: "center",
            color: "#777",
            fontSize: fontSize.sm,
            marginTop: -10,
            marginBottom: spacing.lg,
          }}
        >
          Member since {userProfile.memberSince}
        </span>

        {/* Profile Settings Options */}
        <button
          style={styles.menuItem}
          onClick={() => router.push("/edit-profile-information")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Edit Information
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        <button
          style={styles.menuItem}
          onClick={() => router.push("/termsand-conditions")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <IoChevronBack />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Terms
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        <button
          style={styles.menuItem}
          onClick={() => router.push("/privacy")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Privacy
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        <button
          style={styles.menuItem}
          onClick={() => router.push("/community-guidelines")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Content & Community Guidelines
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        {/* Settings Section - Inline */}
        <div
          style={{...(styles.settingsSection || {}), backgroundColor: theme.cardBackground}}
        >
          <span style={{...(styles.sectionHeader || {}), color: theme.text}}>
            General Settings
          </span>

          {/* General Section */}
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
        <div
          style={{...(styles.settingsSection || {}), backgroundColor: theme.cardBackground}}
        >
          <span style={{...(styles.sectionHeader || {}), color: theme.text}}>
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

          {/* Manage Notifications - Only show if notifications are enabled */}
          {notifications && (
            <button
              style={styles.settingItem}
              onClick={() => setNotificationModalVisible(true)}
            >
              <div style={styles.settingLeft}>
                <MdCheck />
                <div>
                  <span style={{...(styles.settingText || {}), color: theme.text}}>
                    Manage Notifications
                  </span>
                  <span
                    style={{...(styles.settingSubtext || {}), color: theme.secondaryText}}
                  >
                    Customize what you want to be notified about
                  </span>
                </div>
              </div>
              <TbDots />
            </button>
        )}
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
            onClick={() => {
              window.alert(/* Alert: */ 
                "Change Password",
                "You will be signed out and redirected to reset your password.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Continue",
                    onPress: async () => {
                      try {
                        const { data } = await supabase.auth.getUser();
                        const email = (data as any)?.user?.email;

                        if (email) {
                          // Send password reset email
                          const { error } =
                            await supabase.auth.resetPasswordForEmail(email, {
                              redirectTo:
                                "https://www.verrsa.org/reset-password",
                            });

                          if (error) {
                            window.alert(/* Alert: */ 
                              "Error",
                              "Failed to send reset email. Please try again.",
                            );
                          } else {
                            window.alert(/* Alert: */ 
                              "Check Your Email",
                              "We've sent a password reset link to your email address.",
                              [
                                {
                                  text: "OK",
                                  onPress: async () => {
                                    await supabase.auth.signOut();
                                    router.push("/");
                                  },
                                },
                              ],
                            );
                          }
                        }
                      } catch (error) {
                        console.error("Error changing password:", error);
                        window.alert(/* Alert: */ 
                          "Error",
                          "Something went wrong. Please try again.",
                        );
                      }
                    },
                  },
                ],
              );
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
        </div>

        {/* Location Options Modal */}
        {(locationModalVisible) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setLocationModalVisible(false)}>
          <div style={styles.modalContainer}>
            <div
              style={{...(styles.modalContent || {}), backgroundColor: theme.cardBackground}}
            >
              <span style={{...(styles.sectionHeader || {}), color: theme.text}}>
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
                  style={{...(styles.modalButton || {}), backgroundColor: "#eee"}}
                  onClick={() => setLocationModalVisible(false)}
                >
                  <span style={{...(styles.settingText || {}), color: "#333"}}>
                    Cancel
                  </span>
                </button>
                <button
                  style={{...(styles.modalButton || {}), backgroundColor: "#00BFFF"}}
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
        {/* Notification Preferences Modal */}
        {(notificationModalVisible) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setNotificationModalVisible(false)}>
          <div style={styles.modalContainer}>
            <div
              style={{...(styles.notificationModalContent || {}), backgroundColor: theme.cardBackground}}
            >
              <div style={styles.modalHeader}>
                <span style={{...(styles.modalTitle || {}), color: theme.text}}>
                  Notification Preferences
                </span>
                <button
                  onClick={() => setNotificationModalVisible(false)}
                >
                  <MdCheck />
                </button>
              </div>

              <div style={{...(styles.notificationScrollView), overflowY: "auto"}}>
                {/* Follower & Social Activity */}
                <div style={styles.notificationCategory}>
                  <span
                    style={{...(styles.notificationCategoryTitle || {}), color: theme.text}}
                  >
                    {NOTIFICATION_LABELS.followerActivity.title}
                  </span>
                  <span
                    style={{...(styles.notificationCategoryDesc || {}), color: theme.secondaryText}}
                  >
                    {NOTIFICATION_LABELS.followerActivity.description}
                  </span>
                  {Object.entries(
                    NOTIFICATION_LABELS.followerActivity.items,
                  ).map(([key, label]) => (
                    <div key={key} style={styles.notificationRow}>
                      <div style={styles.notificationRowText}>
                        <span
                          style={{...(styles.settingText || {}), color: theme.text}}
                        >
                          {label}
                        </span>
                        {/* Mark essential ones */}
                        {DEFAULT_NOTIFICATION_PREFERENCES.followerActivity[
                          key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.followerActivity
                        ] && (
                          <span
                            style={{...(styles.essentialBadge || {}), color: theme.accent}}
                          >
                            Essential
                          </span>
                        )}
                      </div>
                      <input type="checkbox" checked={
                          notificationPrefs.followerActivity[
                            key as keyof typeof notificationPrefs.followerActivity
                          ]
                        } onChange={(e) => (val) =>
                          updateNotificationPref("followerActivity", key, val)
                        (e.target.checked)} style={{cursor:"pointer"}} />
                    </div>
                  ))}
                </div>

                {/* FOMO & Urgency Triggers */}
                <div style={styles.notificationCategory}>
                  <span
                    style={{...(styles.notificationCategoryTitle || {}), color: theme.text}}
                  >
                    {NOTIFICATION_LABELS.fomoTriggers.title}
                  </span>
                  <span
                    style={{...(styles.notificationCategoryDesc || {}), color: theme.secondaryText}}
                  >
                    {NOTIFICATION_LABELS.fomoTriggers.description}
                  </span>
                  {Object.entries(NOTIFICATION_LABELS.fomoTriggers.items).map(
                    ([key, label]) => (
                      <div key={key} style={styles.notificationRow}>
                        <div style={styles.notificationRowText}>
                          <span
                            style={{...(styles.settingText || {}), color: theme.text}}
                          >
                            {label}
                          </span>
                          {DEFAULT_NOTIFICATION_PREFERENCES.fomoTriggers[
                            key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.fomoTriggers
                          ] && (
                            <span
                              style={{...(styles.essentialBadge || {}), color: theme.accent}}
                            >
                              Essential
                            </span>
                          )}
                        </div>
                        <input type="checkbox" checked={
                            notificationPrefs.fomoTriggers[
                              key as keyof typeof notificationPrefs.fomoTriggers
                            ]
                          } onChange={(e) => (val) =>
                            updateNotificationPref("fomoTriggers", key, val)
                          (e.target.checked)} style={{cursor:"pointer"}} />
                      </div>
                    ),
                  )}
                </div>

                {/* Monetization & Earnings */}
                <div style={styles.notificationCategory}>
                  <span
                    style={{...(styles.notificationCategoryTitle || {}), color: theme.text}}
                  >
                    {NOTIFICATION_LABELS.monetization.title}
                  </span>
                  <span
                    style={{...(styles.notificationCategoryDesc || {}), color: theme.secondaryText}}
                  >
                    {NOTIFICATION_LABELS.monetization.description}
                  </span>
                  {Object.entries(NOTIFICATION_LABELS.monetization.items).map(
                    ([key, label]) => (
                      <div key={key} style={styles.notificationRow}>
                        <div style={styles.notificationRowText}>
                          <span
                            style={{...(styles.settingText || {}), color: theme.text}}
                          >
                            {label}
                          </span>
                          {DEFAULT_NOTIFICATION_PREFERENCES.monetization[
                            key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.monetization
                          ] && (
                            <span
                              style={{...(styles.essentialBadge || {}), color: theme.accent}}
                            >
                              Essential
                            </span>
                          )}
                        </div>
                        <input type="checkbox" checked={
                            notificationPrefs.monetization[
                              key as keyof typeof notificationPrefs.monetization
                            ]
                          } onChange={(e) => (val) =>
                            updateNotificationPref("monetization", key, val)
                          (e.target.checked)} style={{cursor:"pointer"}} />
                      </div>
                    ),
                  )}
                </div>

                {/* Community & Relationships */}
                <div style={styles.notificationCategory}>
                  <span
                    style={{...(styles.notificationCategoryTitle || {}), color: theme.text}}
                  >
                    {NOTIFICATION_LABELS.community.title}
                  </span>
                  <span
                    style={{...(styles.notificationCategoryDesc || {}), color: theme.secondaryText}}
                  >
                    {NOTIFICATION_LABELS.community.description}
                  </span>
                  {Object.entries(NOTIFICATION_LABELS.community.items).map(
                    ([key, label]) => (
                      <div key={key} style={styles.notificationRow}>
                        <div style={styles.notificationRowText}>
                          <span
                            style={{...(styles.settingText || {}), color: theme.text}}
                          >
                            {label}
                          </span>
                          {DEFAULT_NOTIFICATION_PREFERENCES.community[
                            key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.community
                          ] && (
                            <span
                              style={{...(styles.essentialBadge || {}), color: theme.accent}}
                            >
                              Essential
                            </span>
                          )}
                        </div>
                        <input type="checkbox" checked={
                            notificationPrefs.community[
                              key as keyof typeof notificationPrefs.community
                            ]
                          } onChange={(e) => (val) =>
                            updateNotificationPref("community", key, val)
                          (e.target.checked)} style={{cursor:"pointer"}} />
                      </div>
                    ),
                  )}
                </div>

                {/* Smart & Personalized */}
                <div style={styles.notificationCategory}>
                  <span
                    style={{...(styles.notificationCategoryTitle || {}), color: theme.text}}
                  >
                    {NOTIFICATION_LABELS.smartTriggers.title}
                  </span>
                  <span
                    style={{...(styles.notificationCategoryDesc || {}), color: theme.secondaryText}}
                  >
                    {NOTIFICATION_LABELS.smartTriggers.description}
                  </span>
                  {Object.entries(NOTIFICATION_LABELS.smartTriggers.items).map(
                    ([key, label]) => (
                      <div key={key} style={styles.notificationRow}>
                        <div style={styles.notificationRowText}>
                          <span
                            style={{...(styles.settingText || {}), color: theme.text}}
                          >
                            {label}
                          </span>
                          {DEFAULT_NOTIFICATION_PREFERENCES.smartTriggers[
                            key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.smartTriggers
                          ] && (
                            <span
                              style={{...(styles.essentialBadge || {}), color: theme.accent}}
                            >
                              Essential
                            </span>
                          )}
                        </div>
                        <input type="checkbox" checked={
                            notificationPrefs.smartTriggers[
                              key as keyof typeof notificationPrefs.smartTriggers
                            ]
                          } onChange={(e) => (val) =>
                            updateNotificationPref("smartTriggers", key, val)
                          (e.target.checked)} style={{cursor:"pointer"}} />
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  style={{...(styles.modalButton || {}), backgroundColor: "#00BFFF"}}
                  onClick={saveAllNotificationPrefs}
                >
                  <span style={{...(styles.settingText || {}), color: "#fff"}}>
                    Save Changes
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
        <button
          style={styles.menuItem}
          onClick={() => router.push("/blocked-users")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Blocked Users
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        <button
          style={styles.menuItem}
          onClick={() => router.push("/blocked-communities")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Blocked Communities
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        <button
          style={styles.menuItem}
          onClick={() => router.push("/customer-support")}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdVerified />
            <span style={{...(styles.menuItemText || {}), color: theme.text}}>
              Help & Support
            </span>
          </div>
          <IoChevronForward />
        </button>
        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        {/* Support Agent Dashboard */}
        {isSupportAgent && (
          <>
            <button
              style={styles.menuItem}
              onClick={() => router.push("/support-agent-dashboard")}
            >
              <div style={{ flexDirection: "row", alignItems: "center" }}>
                <MdVerified />
                <span style={{...(styles.menuItemText || {}), color: theme.text}}>
                  Support Dashboard
                </span>
              </div>
              <IoChevronForward />
            </button>
            <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />
          </>
        )}

        {/* Active Devices - Moved to bottom */}
        <div
          style={{...(styles.settingsSection || {}), backgroundColor: theme.cardBackground}}
        >
          <div style={styles.devicesSectionHeader}>
            <MdCheck />
            <span style={{...(styles.devicesSectionTitle || {}), color: theme.text}}>
              Active Devices
            </span>
          </div>
          <span
            style={{...(styles.settingSubtext || {}), color: theme.secondaryText, marginBottom: spacing.md, marginLeft: 0}}
          >
            Devices currently signed in to your account
          </span>

          {loadingDevices ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : devices.length === 0 ? (
            <span
              style={{...(styles.settingSubtext || {}), color: theme.secondaryText, marginLeft: 0}}
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
                          style={{...(styles.currentBadge || {}), backgroundColor: "#00BFFF"}}
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

        {/* Delete Account - Moved to bottom */}
        <button
          style={{...(styles.menuItem || {}), marginBottom: spacing.xl2}}
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <div style={{ flexDirection: "row", alignItems: "center" }}>
            <MdCheck />
            <span style={{...(styles.menuItemText || {}), color: "#ff4757"}}>
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </span>
          </div>
          <IoChevronForward />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 70,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  backButton: {
    position: "absolute",
    top: 65,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  settingsContainer: {
    marginTop: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "space-between",
  },
  menuIcon: {
    marginRight: spacing.sm,
    backgroundColor: "#eee",
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  menuItemText: {
    fontSize: fontSize.md,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomColor: "#eee",
  },
  infoContainer: { marginBottom: spacing.lg, alignItems: "center" },
  infoText: { fontSize: fontSize.xl, marginBottom: spacing.xs, marginTop: -9 },
  infoSubText: { fontSize: fontSize.md, color: "#777" },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  settingsSection: {
    marginTop: spacing.lg,
    marginLeft: 0,
    marginRight: 0,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  sectionHeader: {
    fontSize: fontSize.base,
    fontWeight: "600",
    marginBottom: spacing.base,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    fontSize: fontSize.lg,
    marginLeft: spacing.sm,
  },
  settingSubtext: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    marginTop: spacing.px,
  },
  settingValue: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
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
  },
  // Notification Modal Styles
  notificationModalContent: {
    height: "90%",
    padding: spacing.base,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  notificationScrollView: {
    flex: 1,
  },
  notificationCategory: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  notificationCategoryTitle: {
    fontSize: fontSize.base,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  notificationCategoryDesc: {
    fontSize: fontSize.sm2,
    marginBottom: spacing.md,
  },
  notificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
  },
  notificationRowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  essentialBadge: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: spacing.px,
    marginLeft: spacing.sm,
  },
  modalFooter: {
    paddingTop: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
};
