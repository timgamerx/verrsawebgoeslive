import { webStorage as AsyncStorage } from "./webStorage";
// expo-notifications is not available in web/Next.js - using browser Notification API stub
const Notifications = {
  getPermissionsAsync: async () => ({ status: typeof window !== 'undefined' && Notification?.permission }),
  requestPermissionsAsync: async () => ({ status: typeof window !== 'undefined' ? await Notification.requestPermission() : 'denied' }),
};

const NOTIFICATION_LAST_PROMPT_KEY = "lastNotificationPromptTime";
const NOTIFICATION_STATUS_KEY = "notificationsEnabled";
const PROMPT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between prompts

/**
 * Get the last time the notification prompt was shown
 */
const getLastPromptTime = async (): Promise<number> => {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_LAST_PROMPT_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error("Error getting last prompt time:", error);
    return 0;
  }
};

/**
 * Mark that the notification prompt was just shown
 */
export const markNotificationPromptSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_LAST_PROMPT_KEY,
      Date.now().toString(),
    );
  } catch (error) {
    console.error("Error marking notification prompt time:", error);
  }
};

/**
 * Check if notifications are currently enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    // First check AsyncStorage
    const storedValue = await AsyncStorage.getItem(NOTIFICATION_STATUS_KEY);
    if (storedValue !== null) {
      return storedValue === "true";
    }

    // Then check system permissions
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking notification status:", error);
    return false;
  }
};

/**
 * Request notification permissions and update storage
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === "granted";

    // Save to AsyncStorage
    await AsyncStorage.setItem(
      NOTIFICATION_STATUS_KEY,
      JSON.stringify(granted),
    );

    return granted;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
};

/**
 * Check if we should show the notification prompt
 * Returns true if:
 * 1. Notifications are not enabled
 * 2. Cooldown period has passed (24 hours since last prompt)
 *
 * This ensures the prompt keeps appearing until user enables notifications,
 * but respects a cooldown to avoid being too annoying.
 */
export const shouldShowNotificationPrompt = async (): Promise<boolean> => {
  try {
    // First check if notifications are already enabled
    const notificationsEnabled = await areNotificationsEnabled();
    if (notificationsEnabled) {
      return false; // Don't show if already enabled
    }

    // Check cooldown - has it been 24 hours since last prompt?
    const lastPromptTime = await getLastPromptTime();
    const timeSinceLastPrompt = Date.now() - lastPromptTime;

    // Show prompt if:
    // - Never shown before (lastPromptTime is 0), OR
    // - Cooldown period has passed
    return lastPromptTime === 0 || timeSinceLastPrompt >= PROMPT_COOLDOWN_MS;
  } catch (error) {
    console.error("Error checking if should show notification prompt:", error);
    return false;
  }
};

/**
 * Enable notifications (to be called from settings)
 */
export const enableNotifications = async (): Promise<boolean> => {
  const granted = await requestNotificationPermissions();
  if (granted) {
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, "true");
  }
  return granted;
};

/**
 * Disable notifications (to be called from settings)
 */
export const disableNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, "false");
  } catch (error) {
    console.error("Error disabling notifications:", error);
  }
};
