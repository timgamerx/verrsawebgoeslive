import { supabase } from "../components/supabase";
import { shouldSendNotification } from "./notificationService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export interface PushNotificationData {
  userIds?: string[];
  pushTokens?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

/**
 * Send push notification to specific users by their user IDs
 */
export const sendPushNotificationToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<{ success: boolean; sent?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userIds,
          title,
          body,
          data,
          sound: "default",
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Push notification error:", errorData);
      return {
        success: false,
        error: errorData.error || "Failed to send push notification",
      };
    }

    const result = await response.json();
    return {
      success: true,
      sent: result.sent || 0,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send push notification to specific push tokens directly
 */
export const sendPushNotificationToTokens = async (
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<{ success: boolean; sent?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          pushTokens,
          title,
          body,
          data,
          sound: "default",
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Push notification error:", errorData);
      return {
        success: false,
        error: errorData.error || "Failed to send push notification",
      };
    }

    const result = await response.json();
    return {
      success: true,
      sent: result.sent || 0,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send notification when someone likes user's content
 */
export const sendLikeNotification = async (
  recipientUserId: string,
  actorName: string,
  contentType: string,
  contentId: string,
) => {
  // Check if user has this notification enabled
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "followerActivity",
    "postReactions",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers(
    [recipientUserId],
    "New Like! ❤️",
    `${actorName} liked your ${contentType}`,
    {
      type: "like",
      contentType,
      contentId,
    },
  );
};

/**
 * Send notification when someone comments on user's content
 */
export const sendCommentNotification = async (
  recipientUserId: string,
  actorName: string,
  contentType: string,
  contentId: string,
  commentPreview: string,
) => {
  // Check if user has this notification enabled
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "followerActivity",
    "newComment",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers(
    [recipientUserId],
    "New Comment 💬",
    `${actorName} commented on your ${contentType}: "${commentPreview}"`,
    {
      type: "comment",
      contentType,
      contentId,
    },
  );
};

/**
 * Send notification when someone follows user
 */
export const sendFollowNotification = async (
  recipientUserId: string,
  actorName: string,
  actorId: string,
) => {
  // Check if user has this notification enabled
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "followerActivity",
    "newFollower",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers(
    [recipientUserId],
    "New Follower 👤",
    `${actorName} started following you`,
    {
      type: "follow",
      userId: actorId,
    },
  );
};

/**
 * Send notification when someone mentions user
 */
export const sendMentionNotification = async (
  recipientUserId: string,
  actorName: string,
  contentType: string,
  contentId: string,
) => {
  // Check if user has this notification enabled
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "followerActivity",
    "mentionedInPost",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers(
    [recipientUserId],
    "You were mentioned! 📢",
    `${actorName} mentioned you in a ${contentType}`,
    {
      type: "mention",
      contentType,
      contentId,
    },
  );
};

/**
 * Send notification when someone shares user's content
 */
export const sendShareNotification = async (
  recipientUserId: string,
  actorName: string,
  contentType: string,
  contentId: string,
) => {
  // Check if user has this notification enabled
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "followerActivity",
    "postShared",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers(
    [recipientUserId],
    "Content Shared 🔄",
    `${actorName} shared your ${contentType}`,
    {
      type: "share",
      contentType,
      contentId,
    },
  );
};

/**
 * Send push notification to a user when they receive a new message
 */
export const sendNewMessageNotification = async (
  recipientUserId: string,
  senderName: string,
  senderId: string,
  messagePreview: string,
  senderAvatar?: string,
) => {
  // Truncate long messages so the notification body is readable
  const preview =
    messagePreview.length > 60
      ? `${messagePreview.substring(0, 60)}…`
      : messagePreview;

  return sendPushNotificationToUsers(
    [recipientUserId],
    `New message from ${senderName} 💬`,
    preview,
    {
      type: "new_message",
      senderId,
      senderName,
      senderAvatar: senderAvatar || "",
      screen: "VerrsaChat",
    },
  );
};

/**
 * Send notification about community activity
 */
export const sendCommunityNotification = async (
  recipientUserId: string,
  title: string,
  message: string,
  communityId: string,
) => {
  return sendPushNotificationToUsers([recipientUserId], title, message, {
    type: "community",
    communityId,
  });
};

/**
 * Send notification about payment/monetization
 */
export const sendPaymentNotification = async (
  recipientUserId: string,
  title: string,
  message: string,
  amount?: number,
  currency?: string,
) => {
  // Check if user has payment notifications enabled
  // This checks tipReceived as a proxy for payment notifications
  const shouldSend = await shouldSendNotification(
    recipientUserId,
    "monetization",
    "tipReceived",
  );

  if (!shouldSend) {
    return { success: true, sent: 0 };
  }

  return sendPushNotificationToUsers([recipientUserId], title, message, {
    type: "payment",
    amount,
    currency,
  });
};

/**
 * Send broadcast notification to all users (use with caution)
 */
export const sendBroadcastNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
) => {
  try {
    // Get all users with push tokens
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .not("push_token", "is", null)
      .limit(1000); // Limit to prevent overwhelming the system

    if (error || !profiles || profiles.length === 0) {
      console.error("No users with push tokens found");
      return { success: false, error: "No recipients found" };
    }

    const userIds = profiles.map((p) => p.id);
    return sendPushNotificationToUsers(userIds, title, body, data);
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send welcome notification to new user
 */
export const sendWelcomeNotification = async (
  userId: string,
  userName: string,
) => {
  return sendPushNotificationToUsers(
    [userId],
    "Welcome to Verrsa! 🎉",
    `Hi ${userName}! Start exploring amazing content from creators around the world.`,
    {
      type: "welcome",
    },
  );
};

/**
 * Send notification when a new post is created
 * Notifies all users about new content from creators
 */
export const sendNewPostNotification = async (
  creatorName: string,
  postType: "article" | "podcast" | "video" | "community" | "verse",
  postTitle: string,
  postId: string,
  communityId?: string,
) => {
  try {
    // Get all users with push tokens (excluding the creator)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .not("push_token", "is", null)
      .limit(1000); // Limit to prevent overwhelming the system

    if (error || !profiles || profiles.length === 0) {
      console.log("No users with push tokens found for new post notification");
      return { success: false, error: "No recipients found" };
    }

    // Format notification based on post type
    const emoji = {
      article: "📰",
      podcast: "🎙️",
      video: "🎬",
      community: "💬",
      verse: "✨",
    }[postType];

    const typeLabel = {
      article: "article",
      podcast: "podcast",
      video: "video",
      community: "community post",
      verse: "verse",
    }[postType];

    const title = `${emoji} New ${typeLabel} from ${creatorName}`;
    const body = postTitle;

    const notificationData: Record<string, any> = {
      type: "new_post",
      post_type: postType,
      post_id: postId,
      creator_name: creatorName,
    };

    if (communityId) {
      notificationData.community_id = communityId;
    }

    const userIds = profiles.map((p) => p.id);
    return sendPushNotificationToUsers(userIds, title, body, notificationData);
  } catch (error) {
    console.error("Error sending new post notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send notification when a new community is created
 * Notifies all users about new communities they can join
 */
export const sendNewCommunityNotification = async (
  creatorName: string,
  communityName: string,
  communityId: string,
  communityDescription?: string,
) => {
  try {
    // Get all users with push tokens (excluding the creator)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .not("push_token", "is", null)
      .limit(1000); // Limit to prevent overwhelming the system

    if (error || !profiles || profiles.length === 0) {
      console.log(
        "No users with push tokens found for new community notification",
      );
      return { success: false, error: "No recipients found" };
    }

    const emoji = "🏘️";
    const title = `${emoji} New community created by ${creatorName}`;
    const body = communityDescription
      ? `${communityName} - ${communityDescription.substring(0, 100)}`
      : communityName;

    const notificationData: Record<string, any> = {
      type: "new_community",
      community_id: communityId,
      community_name: communityName,
      creator_name: creatorName,
    };

    const userIds = profiles.map((p) => p.id);
    return sendPushNotificationToUsers(userIds, title, body, notificationData);
  } catch (error) {
    console.error("Error sending new community notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
