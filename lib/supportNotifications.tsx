// @ts-nocheck
// NOTE: Install expo-notifications first: npx expo install expo-notifications
import React from "react";
import { useRouter } from 'next/router';
import { supabase } from "../components/supabase";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationService {
  registerForPushNotifications(): Promise<string | null>;
  subscribeToSupportNotifications(): Promise<void>;
  unsubscribeFromSupportNotifications(): void;
  handleSupportResponse(notification: any): void;
}

class SupportNotificationService implements NotificationService {
  private supportSubscription: any = null;

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Push notification permissions not granted");
        return null;
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Push token:", token);

      // Store token in user profile or separate table
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // You might want to store this in a user_devices table
        await supabase
          .from("user_profiles") // Assuming you have a user_profiles table
          .upsert({
            user_id: user.id,
            push_token: token,
            updated_at: new Date().toISOString(),
          });
      }

      return token;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  /**
   * Subscribe to support message notifications
   */
  async subscribeToSupportNotifications(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn(
          "User not authenticated, cannot subscribe to notifications"
        );
        return;
      }

      // Subscribe to agent messages in user's tickets
      this.supportSubscription = supabase
        .channel(`support_notifications_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `sender_type=eq.agent`,
          },
          async (payload) => {
            const message = payload.new;

            // Check if this message is for the current user's ticket
            const { data: ticket } = await supabase
              .from("support_tickets")
              .select("user_id")
              .eq("id", message.ticket_id)
              .single();

            if (ticket && ticket.user_id === user.id) {
              await this.showSupportNotification(message);
            }
          }
        )
        .subscribe();

      console.log("Subscribed to support notifications");
    } catch (error) {
      console.error("Error subscribing to support notifications:", error);
    }
  }

  /**
   * Unsubscribe from support notifications
   */
  unsubscribeFromSupportNotifications(): void {
    if (this.supportSubscription) {
      supabase.removeChannel(this.supportSubscription);
      this.supportSubscription = null;
      console.log("Unsubscribed from support notifications");
    }
  }

  /**
   * Show local notification for support response
   */
  private async showSupportNotification(message: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Support Response",
          body: `You have a new message from our support team: ${message.message.substring(0, 100)}${message.message.length > 100 ? "..." : ""}`,
          data: {
            type: "support_message",
            ticketId: message.ticket_id,
            messageId: message.id,
          },
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("Error showing support notification:", error);
    }
  }

  /**
   * Handle notification when user taps on it
   */
  handleSupportResponse(notification: any): void {
    const data = notification.request.content.data;

    if (data && data.type === "support_message") {
      //to support screen
      // You'll need to implement navigation logic based on your app structure
      console.log("Opening support chat for ticket:", data.ticketId);

      // Example navigation (adjust based on your navigation setup):
      // router.push('/support');
    }
  }

  /**
   * Clear all support notifications
   */
  async clearSupportNotifications(): Promise<void> {
    try {
      const notifications =
        await Notifications.getPresentedNotificationsAsync();
      const supportNotifications = notifications.filter(
        (notification) =>
          notification.request.content.data?.type === "support_message"
      );

      for (const notification of supportNotifications) {
        await Notifications.dismissNotificationAsync(
          notification.request.identifier
        );
      }
    } catch (error) {
      console.error("Error clearing support notifications:", error);
    }
  }

  /**
   * Get unread support messages count for badge
   */
  async getUnreadSupportCount(): Promise<number> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return 0;

      // Get user's tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", user.id);

      if (!tickets || tickets.length === 0) return 0;

      const ticketIds = tickets.map((t) => t.id);

      // Count unread agent messages
      const { count } = await supabase
        .from("support_messages")
        .select("*", { count: "exact", head: true })
        .in("ticket_id", ticketIds)
        .eq("sender_type", "agent")
        .is("metadata->>read_at", null);

      return count || 0;
    } catch (error) {
      console.error("Error getting unread support count:", error);
      return 0;
    }
  }

  /**
   * Update notification badge
   */
  async updateNotificationBadge(): Promise<void> {
    try {
      const unreadCount = await this.getUnreadSupportCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error("Error updating notification badge:", error);
    }
  }
}

// Export singleton instance
export const supportNotificationService = new SupportNotificationService();

// Hook for React components
export const useSupportNotifications = () => {
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  const subscribe = (async () => {
    if (!isSubscribed) {
      await supportNotificationService.registerForPushNotifications();
      await supportNotificationService.subscribeToSupportNotifications();
      setIsSubscribed(true);
    }
  }, [isSubscribed]);

  const unsubscribe = (() => {
    if (isSubscribed) {
      supportNotificationService.unsubscribeFromSupportNotifications();
      setIsSubscribed(false);
    }
  }, [isSubscribed]);

  React.useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed,
  };
};

// Example usage in App.tsx or main component:
/*
import { supportNotificationService } from './lib/supportNotifications';

export default function App() {
  useEffect(() => {
    // Register for notifications when app starts
    supportNotificationService.registerForPushNotifications()
      .then(() => supportNotificationService.subscribeToSupportNotifications());

    // Handle notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      supportNotificationService.handleSupportResponse(response.notification);
    });

    return () => subscription.remove();
  }, []);

  // ... rest of your app
}
*/
