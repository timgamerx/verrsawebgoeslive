export interface DatabaseNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type:
    | "like"
    | "share"
    | "comment"
    | "payment"
    | "community"
    | "engagement"
    | "monetization"
    | "follow"
    | "mention"
    | "chat";
  post_id?: string;
  community_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  meta?: any;
  title?: string;
}

export interface NotificationWithActor extends DatabaseNotification {
  actor_profile?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

export interface UINotification {
  id: string;
  type:
    | "like"
    | "share"
    | "comment"
    | "payment"
    | "community"
    | "engagement"
    | "monetization"
    | "follow"
    | "mention"
    | "chat";
  user?: string;
  message: string;
  date: string;
  time: string;
  dotColor: string;
  isRead: boolean;
  post_id?: string;
  community_id?: string;
  title?: string;
  meta?: any;
  actor_id?: string;
}

export type NotificationFilterType = "All" | "Engagements" | "Monetization" | "Newsletters";

/**
 * Notification Preferences System
 * Strategically grouped to drive engagement without spamming
 */

export interface NotificationPreferences {
  // A. Follower & Social Activity (High Engagement)
  followerActivity: {
    followingPosted: boolean; // Someone you follow just posted
    creatorWentLive: boolean; // [Creator Name] just went live
    newComment: boolean; // Your post received a new comment
    commentReply: boolean; // Someone replied to your comment
    postReactions: boolean; // Your post got new reactions
    mentionedInPost: boolean; // [User] mentioned you in a post
    mentionedInBio: boolean; // [User] mentioned you in their bio
    newFollower: boolean; // [User] started following you
    followingFollowedCreator: boolean; // Someone you follow followed a new creator
    postShared: boolean; // [User] shared your post
    postTrending: boolean; // Your article is trending today
    viewMilestone: boolean; // Your post reached X views
    followerMilestone: boolean; // You gained X new followers today
    commentAttention: boolean; // Your comment is getting attention
    postSaved: boolean; // Someone saved your post
  };

  // B. FOMO / Urgency Triggers
  fomoTriggers: {
    multiplePostsToday: boolean; // X creators you follow posted today
    liveSessionStarting: boolean; // A live session you might like is starting now
    topicTrending: boolean; // Your favorite topic is trending
    viralPost: boolean; // This post is blowing up
    liveSessionEnding: boolean; // Only X mins left in this live session
    topPostInCommunity: boolean; // New top post in your community
    postMomentum: boolean; // Your post is gaining momentum
    activeDiscussion: boolean; // People are discussing [Topic] right now
    creatorInactive: boolean; // A creator you follow hasn't posted in a while
    streakExpiring: boolean; // Your streak is about to expire
  };

  // C. Monetization & Earnings Triggers
  monetization: {
    tipReceived: boolean; // You received a tip
    newSubscriber: boolean; // Someone subscribed to you
    liveEarnings: boolean; // You earned from your live session
    premiumUnlocked: boolean; // Your premium content was unlocked
    payoutReady: boolean; // Your payout ready
    monetizationProgress: boolean; // You're close to unlocking monetization
    impressionMilestone: boolean; // You just crossed X impressions
    boostSuggestion: boolean; // Boost your post to reach more creators
    weeklyRevenue: boolean; // Your revenue this week: $X
    brandInterest: boolean; // A brand is interested in your profile
  };

  // D. Community & Relationship Triggers
  community: {
    newCommunityPost: boolean; // New post in your community
    newCommunityMembers: boolean; // Your community has X new members
    communityInvite: boolean; // Someone invited you to join a community
    pollResults: boolean; // A poll you voted in has new results
    communityDiscussion: boolean; // Your community discussion is heating up
    creatorSpotlight: boolean; // A creator spotlight featuring someone you follow
    profileViews: boolean; // Your profile was viewed X times today
    addedToList: boolean; // You were added to a creator list
    collaborationRequest: boolean; // A collaboration request is waiting
    liveCollabRequest: boolean; // Someone requested to go live with you
  };

  // E. Smart AI / Personalization Triggers
  smartTriggers: {
    personalizedRecommendation: boolean; // Based on your interest in [Topic]
    inactivityReminder: boolean; // You haven't posted in X days
    audienceReminder: boolean; // Your audience hasn't heard from you
    weeklyPerformance: boolean; // Here's your weekly performance summary
    newFeatures: boolean; // New features just dropped on Verrsa
  };
}

// Default preferences with essential notifications enabled
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  followerActivity: {
    followingPosted: true,
    creatorWentLive: true, // Essential
    newComment: true, // Essential
    commentReply: true, // Essential
    postReactions: true, // Essential
    mentionedInPost: true, // Essential
    mentionedInBio: true, // Essential
    newFollower: true, // Essential
    followingFollowedCreator: true, // Essential
    postShared: true, // Essential
    postTrending: true, // Essential
    viewMilestone: false,
    followerMilestone: true, // Essential
    commentAttention: true, // Essential
    postSaved: true, // Essential
  },
  fomoTriggers: {
    multiplePostsToday: true, // Essential
    liveSessionStarting: true, // Essential
    topicTrending: true, // Essential
    viralPost: false,
    liveSessionEnding: true, // Essential
    topPostInCommunity: false,
    postMomentum: true, // Essential
    activeDiscussion: true, // Essential
    creatorInactive: true, // Essential
    streakExpiring: true, // Essential
  },
  monetization: {
    tipReceived: true, // Essential
    newSubscriber: true, // Essential
    liveEarnings: true, // Essential
    premiumUnlocked: true, // Essential
    payoutReady: true, // Essential
    monetizationProgress: true, // Essential
    impressionMilestone: true, // Essential
    boostSuggestion: true, // Essential
    weeklyRevenue: true, // Essential
    brandInterest: true, // Essential
  },
  community: {
    newCommunityPost: true, // Essential
    newCommunityMembers: true, // Essential
    communityInvite: true, // Essential
    pollResults: false,
    communityDiscussion: true, // Essential
    creatorSpotlight: true, // Essential
    profileViews: true, // Essential
    addedToList: true, // Essential
    collaborationRequest: true, // Essential
    liveCollabRequest: true, // Essential
  },
  smartTriggers: {
    personalizedRecommendation: true, // Essential
    inactivityReminder: true, // Essential
    audienceReminder: true, // Essential
    weeklyPerformance: true, // Essential
    newFeatures: true, // Essential
  },
};

// Notification labels for UI
export const NOTIFICATION_LABELS = {
  followerActivity: {
    title: "Follower & Social Activity",
    description: "Stay updated on interactions and engagement",
    items: {
      followingPosted: "Someone you follow posted",
      creatorWentLive: "Creator went live",
      newComment: "New comment on your post",
      commentReply: "Reply to your comment",
      postReactions: "Reactions on your post",
      mentionedInPost: "Mentioned in a post",
      mentionedInBio: "Mentioned in a bio",
      newFollower: "New follower",
      followingFollowedCreator: "Following followed someone",
      postShared: "Your post was shared",
      postTrending: "Your post is trending",
      viewMilestone: "View milestones",
      followerMilestone: "Follower milestones",
      commentAttention: "Comment getting attention",
      postSaved: "Someone saved your post",
    },
  },
  fomoTriggers: {
    title: "Urgency",
    description: "Don't miss trending content and live sessions",
    items: {
      multiplePostsToday: "Multiple posts from following",
      liveSessionStarting: "Live session starting",
      topicTrending: "Favorite topic trending",
      viralPost: "Viral post alert",
      liveSessionEnding: "Live session ending soon",
      topPostInCommunity: "Top post in community",
      postMomentum: "Your post gaining momentum",
      activeDiscussion: "Active topic discussion",
      creatorInactive: "Creator check-in reminder",
      streakExpiring: "Streak expiring",
    },
  },
  monetization: {
    title: "Monetization & Earnings",
    description: "Track your revenue and growth opportunities",
    items: {
      tipReceived: "Tip received",
      newSubscriber: "New subscriber",
      liveEarnings: "Live session earnings",
      premiumUnlocked: "Premium content unlocked",
      payoutReady: "Payout ready",
      monetizationProgress: "Monetization progress",
      impressionMilestone: "Impression milestones",
      boostSuggestion: "Post boost suggestions",
      weeklyRevenue: "Weekly revenue summary",
      brandInterest: "Brand partnership interest",
    },
  },
  community: {
    title: "Community & Relationships",
    description: "Connect with your community and collaborators",
    items: {
      newCommunityPost: "New community post",
      newCommunityMembers: "New community members",
      communityInvite: "Community invite",
      pollResults: "Poll results",
      communityDiscussion: "Community discussion active",
      creatorSpotlight: "Creator spotlight",
      profileViews: "Profile view count",
      addedToList: "Added to creator list",
      collaborationRequest: "Collaboration request",
      liveCollabRequest: "Live collab request",
    },
  },
  smartTriggers: {
    title: "Smart & Personalized",
    description: "AI-powered recommendations and insights",
    items: {
      personalizedRecommendation: "Personalized recommendations",
      inactivityReminder: "Inactivity reminder",
      audienceReminder: "Audience engagement reminder",
      weeklyPerformance: "Weekly performance",
      newFeatures: "New features",
    },
  },
};
