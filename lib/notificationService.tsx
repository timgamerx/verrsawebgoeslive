/**
 * Notification Service with Preference Checking
 * Handles all 50 notification types and respects user preferences
 */

import { webStorage as AsyncStorage } from "./webStorage";
import { supabase } from "../components/supabase";
import { sendPushNotificationToUsers } from "./pushNotifications";

type NotificationPreferences = Record<string, Record<string, boolean>>;

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  comments: {},
  posts: {},
  messages: {},
  follows: {},
  payments: {},
  system: {},
};

// Mapping between preference keys and notification types
type NotificationCategory = keyof NotificationPreferences;
type NotificationKey<T extends NotificationCategory> =
  keyof NotificationPreferences[T];

/**
 * Get user's notification preferences
 */
export const getUserNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  try {
    // Try in-memory cache first (fast path)
    const cached = await AsyncStorage.getItem(
      `notificationPreferences_${userId}`,
    );
    if (cached) {
      return JSON.parse(cached);
    }

    // Try Supabase DB
    const { data } = await supabase
      .from("notification_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .single();

    if (data?.preferences) {
      const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data.preferences };
      await AsyncStorage.setItem(
        `notificationPreferences_${userId}`,
        JSON.stringify(merged),
      );
      return merged;
    }

    // Fallback to defaults
    return DEFAULT_NOTIFICATION_PREFERENCES;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
};

/**
 * Save user notification preferences to Supabase and invalidate local cache
 */
export const saveUserNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving notification preferences:", error);
      return false;
    }

    // Update local cache
    await AsyncStorage.setItem(
      `notificationPreferences_${userId}`,
      JSON.stringify(preferences),
    );
    return true;
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return false;
  }
};

/**
 * Check if user has enabled a specific notification type
 */
export const shouldSendNotification = async (
  userId: string,
  category: NotificationCategory,
  key: string,
): Promise<boolean> => {
  try {
    const prefs = await getUserNotificationPreferences(userId);
    const categoryPrefs = prefs[category] as any;
    return categoryPrefs?.[key] ?? false;
  } catch (error) {
    console.error("Error checking notification preference:", error);
    // Default to sending for essential notifications
    const essentials = [
      "newComment",
      "commentReply",
      "postReactions",
      "mentionedInPost",
      "newFollower",
      "tipReceived",
      "payoutReady",
    ];
    return essentials.includes(key);
  }
};

/**
 * Send notification with preference checking
 */
const sendNotificationWithPreferenceCheck = async (
  userId: string,
  category: NotificationCategory,
  key: string,
  title: string,
  message: string,
  data: Record<string, any>,
): Promise<{ success: boolean; sent?: number; error?: string }> => {
  try {
    // Check if user has this notification enabled
    const shouldSend = await shouldSendNotification(userId, category, key);

    if (!shouldSend) {
      console.log(
        `Notification ${category}.${key} disabled for user ${userId}`,
      );
      return { success: true, sent: 0 };
    }

    // Send push notification only.
    // In-app (DB) notifications are created by the direct createNotification()
    // calls in api.ts at each event trigger site. Calling createNotification()
    // here would produce duplicates AND can hit a DB-level UUID type error on
    // some Supabase setups (trigger tries to cast message text as uuid).
    const pushResult = await sendPushNotificationToUsers(
      [userId],
      title,
      message,
      data,
    );

    return pushResult;
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// ============================================================================
// A. FOLLOWER & SOCIAL ACTIVITY NOTIFICATIONS (15)
// ============================================================================

export const notifyFollowingPosted = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  postType: string,
  postTitle: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "followingPosted",
    `${creatorName} just posted`,
    `New ${postType}: ${postTitle}`,
    {
      type: "following_posted",
      actorId: creatorId,
      postId,
      postType,
    },
  );
};

export const notifyCreatorWentLive = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  liveSessionId: string,
  liveTitle: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "creatorWentLive",
    `${creatorName} just went live 🔴`,
    liveTitle ? `${liveTitle} — join now` : "Join now",
    {
      type: "live_session",
      actorId: creatorId,
      liveSessionId,
    },
  );
};

export const notifyNewComment = async (
  userId: string,
  commenterName: string,
  commenterId: string,
  postType: string,
  postId: string,
  commentPreview: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "newComment",
    "New Comment 💬",
    `${commenterName} commented: "${commentPreview}"`,
    {
      type: "comment",
      actorId: commenterId,
      postId,
      postType,
    },
  );
};

export const notifyCommentReply = async (
  userId: string,
  replierName: string,
  replierId: string,
  postId: string,
  replyPreview: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "commentReply",
    "Reply to your comment 💬",
    `${replierName} replied: "${replyPreview}"`,
    {
      type: "comment_reply",
      actorId: replierId,
      postId,
    },
  );
};

export const notifyPostReactions = async (
  userId: string,
  count: number,
  postType: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "postReactions",
    `${count} new reactions! ❤️`,
    `Your ${postType} got ${count} new reactions`,
    {
      type: "reactions",
      postId,
      count,
    },
  );
};

export const notifyMentionedInPost = async (
  userId: string,
  mentionerName: string,
  mentionerId: string,
  postType: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "mentionedInPost",
    "You were mentioned! 📢",
    `${mentionerName} mentioned you in a ${postType}`,
    {
      type: "mention",
      actorId: mentionerId,
      postId,
      postType,
    },
  );
};

export const notifyMentionedInBio = async (
  userId: string,
  mentionerName: string,
  mentionerId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "mentionedInBio",
    "Mentioned in bio! 📝",
    `${mentionerName} mentioned you in their bio`,
    {
      type: "bio_mention",
      actorId: mentionerId,
    },
  );
};

export const notifyNewFollower = async (
  userId: string,
  followerName: string,
  followerId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "newFollower",
    "New Follower 👤",
    `${followerName} started following you`,
    {
      type: "follow",
      actorId: followerId,
    },
  );
};

export const notifyFollowingFollowedCreator = async (
  userId: string,
  followerName: string,
  followerId: string,
  newCreatorName: string,
  newCreatorId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "followingFollowedCreator",
    "New creator to discover",
    `${followerName} started following ${newCreatorName}`,
    {
      type: "following_activity",
      actorId: followerId,
      targetUserId: newCreatorId,
    },
  );
};

export const notifyPostShared = async (
  userId: string,
  sharerName: string,
  sharerId: string,
  postType: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "postShared",
    "Content Shared 🔄",
    `${sharerName} shared your ${postType}`,
    {
      type: "share",
      actorId: sharerId,
      postId,
      postType,
    },
  );
};

export const notifyPostTrending = async (
  userId: string,
  postType: string,
  postTitle: string,
  postId: string,
  views: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "postTrending",
    "Your post is trending! 🔥",
    `"${postTitle}" has ${views} views and counting`,
    {
      type: "trending",
      postId,
      postType,
      views,
    },
  );
};

export const notifyViewMilestone = async (
  userId: string,
  postType: string,
  postTitle: string,
  postId: string,
  milestone: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "viewMilestone",
    `${milestone} views! 👀`,
    `"${postTitle}" reached ${milestone.toLocaleString()} views`,
    {
      type: "milestone",
      postId,
      milestone,
      milestoneType: "views",
    },
  );
};

export const notifyFollowerMilestone = async (
  userId: string,
  count: number,
  timeframe: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "followerMilestone",
    `${count} new followers! 🎉`,
    `You gained ${count} new followers ${timeframe}`,
    {
      type: "milestone",
      milestoneType: "followers",
      count,
    },
  );
};

export const notifyCommentAttention = async (
  userId: string,
  postId: string,
  commentId: string,
  reactions: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "commentAttention",
    "Your comment is popular! 💬",
    `Your comment got ${reactions} reactions`,
    {
      type: "comment_attention",
      postId,
      commentId,
      reactions,
    },
  );
};

export const notifyPostSaved = async (
  userId: string,
  saverName: string,
  saverId: string,
  postType: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "followerActivity",
    "postSaved",
    "Content Saved 🔖",
    `${saverName} saved your ${postType}`,
    {
      type: "save",
      actorId: saverId,
      postId,
      postType,
    },
  );
};

// ============================================================================
// B. FOMO / URGENCY TRIGGERS (10)
// ============================================================================

export const notifyMultiplePostsToday = async (
  userId: string,
  count: number,
  creatorNames: string[],
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "multiplePostsToday",
    `${count} new posts today! 📱`,
    `${creatorNames.slice(0, 3).join(", ")} and others posted new content`,
    {
      type: "multiple_posts",
      count,
    },
  );
};

export const notifyLiveSessionStarting = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  liveSessionId: string,
  topic: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "liveSessionStarting",
    `Live session starting! 🎥`,
    `${creatorName}: ${topic}`,
    {
      type: "live_starting",
      actorId: creatorId,
      liveSessionId,
    },
  );
};

export const notifyTopicTrending = async (
  userId: string,
  topic: string,
  postCount: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "topicTrending",
    `${topic} is trending! 🔥`,
    `${postCount} new posts about ${topic}`,
    {
      type: "trending_topic",
      topic,
      postCount,
    },
  );
};

export const notifyViralPost = async (
  userId: string,
  postTitle: string,
  postId: string,
  postType: string,
  engagement: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "viralPost",
    "This post is blowing up! 💥",
    `"${postTitle}" - ${engagement} engagements`,
    {
      type: "viral_post",
      postId,
      postType,
      engagement,
    },
  );
};

export const notifyLiveSessionEnding = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  liveSessionId: string,
  minutesLeft: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "liveSessionEnding",
    `Only ${minutesLeft} mins left! ⏰`,
    `${creatorName}'s live session is ending soon`,
    {
      type: "live_ending",
      actorId: creatorId,
      liveSessionId,
      minutesLeft,
    },
  );
};

export const notifyTopPostInCommunity = async (
  userId: string,
  communityName: string,
  communityId: string,
  postTitle: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "topPostInCommunity",
    `Top post in ${communityName}`,
    postTitle,
    {
      type: "top_community_post",
      communityId,
      postId,
    },
  );
};

export const notifyPostMomentum = async (
  userId: string,
  postTitle: string,
  postId: string,
  growthRate: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "postMomentum",
    "Your post is gaining momentum! 🚀",
    `"${postTitle}" is ${growthRate}`,
    {
      type: "post_momentum",
      postId,
      growthRate,
    },
  );
};

export const notifyActiveDiscussion = async (
  userId: string,
  topic: string,
  participants: number,
  discussionId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "activeDiscussion",
    `Hot discussion: ${topic} 🔥`,
    `${participants} people are discussing this now`,
    {
      type: "active_discussion",
      topic,
      discussionId,
      participants,
    },
  );
};

export const notifyCreatorInactive = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  daysSincePost: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "creatorInactive",
    `Check in on ${creatorName}`,
    `They haven't posted in ${daysSincePost} days`,
    {
      type: "creator_inactive",
      actorId: creatorId,
      daysSincePost,
    },
  );
};

export const notifyStreakExpiring = async (
  userId: string,
  streakDays: number,
  hoursLeft: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "fomoTriggers",
    "streakExpiring",
    `Your ${streakDays}-day streak is expiring! ⚡`,
    `Post something in the next ${hoursLeft} hours to keep it alive`,
    {
      type: "streak_expiring",
      streakDays,
      hoursLeft,
    },
  );
};

// ============================================================================
// C. MONETIZATION & EARNINGS TRIGGERS (10)
// ============================================================================

export const notifyTipReceived = async (
  userId: string,
  tipperName: string,
  tipperId: string,
  amount: number,
  currency: string,
  postId?: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "tipReceived",
    `You received a tip! 💰`,
    `${tipperName} tipped you ${currency}${amount}`,
    {
      type: "payment",
      subType: "tip",
      actorId: tipperId,
      amount,
      currency,
      postId,
    },
  );
};

export const notifyNewSubscriber = async (
  userId: string,
  subscriberName: string,
  subscriberId: string,
  plan: string,
  amount: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "newSubscriber",
    `New ${plan} subscriber! 🎉`,
    `${subscriberName} subscribed to your ${plan} plan`,
    {
      type: "payment",
      subType: "subscription",
      actorId: subscriberId,
      plan,
      amount,
    },
  );
};

export const notifyLiveEarnings = async (
  userId: string,
  amount: number,
  currency: string,
  liveSessionId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "liveEarnings",
    `You earned ${currency}${amount}! 💵`,
    `From your live session tips and gifts`,
    {
      type: "payment",
      subType: "live_earnings",
      amount,
      currency,
      liveSessionId,
    },
  );
};

export const notifyPremiumUnlocked = async (
  userId: string,
  unlockerName: string,
  unlockerId: string,
  contentTitle: string,
  contentId: string,
  amount: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "premiumUnlocked",
    `Premium content unlocked! 🔓`,
    `${unlockerName} unlocked "${contentTitle}"`,
    {
      type: "payment",
      subType: "premium_unlock",
      actorId: unlockerId,
      contentId,
      amount,
    },
  );
};

export const notifyPayoutReady = async (
  userId: string,
  amount: number,
  currency: string,
  period: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "payoutReady",
    `Payout ready: ${currency}${amount}! 💰`,
    `Your ${period} earnings are ready to withdraw`,
    {
      type: "payment",
      subType: "payout",
      amount,
      currency,
      period,
    },
  );
};

export const notifyMonetizationProgress = async (
  userId: string,
  metric: string,
  current: number,
  target: number,
  percentage: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "monetizationProgress",
    `${percentage}% to monetization! 📊`,
    `${current}/${target} ${metric} - Keep it up!`,
    {
      type: "milestone",
      subType: "monetization_progress",
      metric,
      current,
      target,
      percentage,
    },
  );
};

export const notifyImpressionMilestone = async (
  userId: string,
  impressions: number,
  postTitle?: string,
  postId?: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "impressionMilestone",
    `${impressions.toLocaleString()} impressions! 👀`,
    postTitle
      ? `"${postTitle}" crossed ${impressions.toLocaleString()} impressions`
      : `You reached ${impressions.toLocaleString()} total impressions`,
    {
      type: "milestone",
      impressions,
      postId,
    },
  );
};

export const notifyBoostSuggestion = async (
  userId: string,
  postTitle: string,
  postId: string,
  currentReach: number,
  potentialReach: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "boostSuggestion",
    `Boost "${postTitle}"? 🚀`,
    `Reach ${potentialReach.toLocaleString()} more users`,
    {
      type: "engagement",
      subType: "boost_suggestion",
      postId,
      currentReach,
      potentialReach,
    },
  );
};

export const notifyWeeklyRevenue = async (
  userId: string,
  amount: number,
  currency: string,
  change: number,
) => {
  const trend = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "weeklyRevenue",
    `Weekly revenue: ${currency}${amount} ${trend}`,
    change !== 0
      ? `${Math.abs(change)}% ${change > 0 ? "up" : "down"} from last week`
      : "Same as last week",
    {
      type: "payment",
      subType: "weekly_summary",
      amount,
      currency,
      change,
    },
  );
};

export const notifyBrandInterest = async (
  userId: string,
  brandName: string,
  opportunityType: string,
  estimatedValue?: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "monetization",
    "brandInterest",
    `${brandName} is interested! 🤝`,
    `Partnership opportunity: ${opportunityType}`,
    {
      type: "engagement",
      subType: "brand_interest",
      brandName,
      opportunityType,
      estimatedValue,
    },
  );
};

// ============================================================================
// D. COMMUNITY & RELATIONSHIP TRIGGERS (10)
// ============================================================================

export const notifyNewCommunityPost = async (
  userId: string,
  communityName: string,
  communityId: string,
  authorName: string,
  postTitle: string,
  postId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "newCommunityPost",
    `New post in ${communityName}`,
    `${authorName}: ${postTitle}`,
    {
      type: "community",
      communityId,
      postId,
    },
  );
};

export const notifyNewCommunityMembers = async (
  userId: string,
  communityName: string,
  communityId: string,
  count: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "newCommunityMembers",
    `${count} new members in ${communityName}`,
    `Your community is growing!`,
    {
      type: "community",
      communityId,
      memberCount: count,
    },
  );
};

export const notifyCommunityInvite = async (
  userId: string,
  inviterName: string,
  inviterId: string,
  communityName: string,
  communityId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "communityInvite",
    `Invited to ${communityName}`,
    `${inviterName} invited you to join`,
    {
      type: "community",
      subType: "invite",
      actorId: inviterId,
      communityId,
    },
  );
};

export const notifyPollResults = async (
  userId: string,
  pollTitle: string,
  pollId: string,
  winningOption: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "pollResults",
    `Poll results: ${pollTitle}`,
    `"${winningOption}" is leading`,
    {
      type: "engagement",
      subType: "poll",
      pollId,
      winningOption,
    },
  );
};

export const notifyCommunityDiscussion = async (
  userId: string,
  communityName: string,
  communityId: string,
  topic: string,
  participants: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "communityDiscussion",
    `Hot topic in ${communityName} 🔥`,
    `${participants} members discussing ${topic}`,
    {
      type: "community",
      communityId,
      topic,
      participants,
    },
  );
};

export const notifyCreatorSpotlight = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  reason: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "creatorSpotlight",
    `Creator Spotlight: ${creatorName} ⭐`,
    reason,
    {
      type: "engagement",
      subType: "spotlight",
      actorId: creatorId,
      reason,
    },
  );
};

export const notifyProfileViews = async (
  userId: string,
  count: number,
  timeframe: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "profileViews",
    `${count} profile views ${timeframe}`,
    `People are checking out your profile`,
    {
      type: "engagement",
      subType: "profile_views",
      count,
      timeframe,
    },
  );
};

export const notifyAddedToList = async (
  userId: string,
  creatorName: string,
  creatorId: string,
  listName: string,
  listId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "addedToList",
    `Added to "${listName}" list`,
    `${creatorName} added you to their list`,
    {
      type: "engagement",
      subType: "list_add",
      actorId: creatorId,
      listId,
      listName,
    },
  );
};

export const notifyCollaborationRequest = async (
  userId: string,
  requesterName: string,
  requesterId: string,
  projectTitle: string,
  requestId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "collaborationRequest",
    `Collaboration request from ${requesterName}`,
    projectTitle,
    {
      type: "engagement",
      subType: "collab_request",
      actorId: requesterId,
      requestId,
    },
  );
};

export const notifyLiveCollabRequest = async (
  userId: string,
  requesterName: string,
  requesterId: string,
  liveSessionId: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "community",
    "liveCollabRequest",
    `${requesterName} wants to go live with you! 🎥`,
    `Tap to accept or decline`,
    {
      type: "engagement",
      subType: "live_collab",
      actorId: requesterId,
      liveSessionId,
    },
  );
};

// ============================================================================
// E. SMART AI / PERSONALIZATION TRIGGERS (5)
// ============================================================================

export const notifyPersonalizedRecommendation = async (
  userId: string,
  topic: string,
  contentTitle: string,
  contentId: string,
  contentType: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "smartTriggers",
    "personalizedRecommendation",
    `Recommended for you: ${topic}`,
    contentTitle,
    {
      type: "engagement",
      subType: "recommendation",
      contentId,
      contentType,
      topic,
    },
  );
};

export const notifyInactivityReminder = async (
  userId: string,
  daysSincePost: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "smartTriggers",
    "inactivityReminder",
    `You haven't posted in ${daysSincePost} days`,
    `Your audience is waiting to hear from you`,
    {
      type: "engagement",
      subType: "inactivity_reminder",
      daysSincePost,
    },
  );
};

export const notifyAudienceReminder = async (
  userId: string,
  followerCount: number,
  engagementDrop: number,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "smartTriggers",
    "audienceReminder",
    `Your ${followerCount} followers miss you`,
    `Engagement is down ${engagementDrop}% - post something today`,
    {
      type: "engagement",
      subType: "audience_reminder",
      followerCount,
      engagementDrop,
    },
  );
};

export const notifyWeeklyPerformance = async (
  userId: string,
  stats: {
    views: number;
    likes: number;
    comments: number;
    newFollowers: number;
  },
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "smartTriggers",
    "weeklyPerformance",
    `Your week on Verrsa 📊`,
    `${stats.views} views • ${stats.likes} likes • ${stats.newFollowers} new followers`,
    {
      type: "engagement",
      subType: "weekly_performance",
      stats,
    },
  );
};

export const notifyNewFeatures = async (
  userId: string,
  featureName: string,
  featureDescription: string,
) => {
  return sendNotificationWithPreferenceCheck(
    userId,
    "smartTriggers",
    "newFeatures",
    `New feature: ${featureName} ✨`,
    featureDescription,
    {
      type: "engagement",
      subType: "new_feature",
      featureName,
    },
  );
};

// ============================================================================
// BATCH NOTIFICATION HELPERS
// ============================================================================

/**
 * Send notification to multiple users with preference checking
 */
export const sendBatchNotification = async (
  userIds: string[],
  category: NotificationCategory,
  key: string,
  title: string,
  message: string,
  data: Record<string, any>,
): Promise<{ totalSent: number; totalSkipped: number }> => {
  let totalSent = 0;
  let totalSkipped = 0;

  // Check preferences for all users in parallel
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const shouldSend = await shouldSendNotification(userId, category, key);
      return { userId, shouldSend };
    }),
  );

  // Filter users who have this notification enabled
  const enabledUsers = results.filter((r) => r.shouldSend).map((r) => r.userId);

  totalSkipped = userIds.length - enabledUsers.length;

  if (enabledUsers.length > 0) {
    const result = await sendPushNotificationToUsers(
      enabledUsers,
      title,
      message,
      data,
    );
    totalSent = result.sent || 0;
  }

  return { totalSent, totalSkipped };
};

// Backward-compatible service object used by src/api.ts.
export const notificationService = {
  notifyNewPost: async (actorName: string, contentType: string, title: string, contentId: string) =>
    notifyFollowingPosted("", actorName, "", contentType, title, contentId),

  notifyLike: async (userId: string, actorName: string, contentType: string, contentId: string) =>
    notifyPostReactions(userId, 1, contentType, contentId),

  notifyShare: async (userId: string, actorName: string, actorId: string, contentType: string, contentId: string) =>
    notifyPostShared(userId, actorName, actorId, contentType, contentId),

  notifySave: async (userId: string, actorName: string, actorId: string, contentType: string, contentId: string) =>
    notifyPostSaved(userId, actorName, actorId, contentType, contentId),

  notifyComment: async (
    userId: string,
    actorName: string,
    actorId: string,
    contentType: string,
    contentId: string,
    commentPreview: string,
  ) => notifyNewComment(userId, actorName, actorId, contentType, contentId, commentPreview),

  notifyMention: async (
    userId: string,
    actorName: string,
    actorId: string,
    location: string,
    contentId: string,
  ) => notifyMentionedInPost(userId, actorName, actorId, location, contentId),

  notifyReply: async (
    userId: string,
    actorName: string,
    actorId: string,
    commentId: string,
    replyPreview: string,
  ) => notifyCommentReply(userId, actorName, actorId, commentId, replyPreview),
};
