/**
 * postHelpers.js
 *
 * Real implementations of the four helper functions used by the content-creation
 * screens (write-article, create-podcast, post-video, create-verse).
 *
 * Ported from:
 *   verrsa-master/lib/api.ts           → notifyFollowersOfNewPost, createNotification
 *   verrsa-master/lib/contentModerator.ts → contentModerator
 *   verrsa-master/lib/activityTracker.ts  → updateLastActive
 *   verrsa-master/lib/pushNotifications.ts → sendNewPostNotification
 */

import { supabase } from "../components/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────────────────────

const OFFENSIVE_PATTERNS = [
  /\b(fuck|shit|damn|bitch|asshole|bastard)\b/gi,
  /\b(kill yourself|kys|die)\b/gi,
  /\b(rape|molest|abuse)\b/gi,
];

const SPAM_PATTERNS = [
  /\b(click here|buy now|limited offer|act now)\b/gi,
  /(https?:\/\/[^\s]+){3,}/gi,
  /(.)\1{5,}/gi,
  /\b(free money|get rich|work from home)\b/gi,
];

const EXPLICIT_PATTERNS = [
  /\b(porn|xxx|nude|naked)\b/gi,
];

function analyzeContent(text) {
  const violations = new Set();
  let confidence = 0;
  const reasons = [];

  for (const p of OFFENSIVE_PATTERNS) {
    if (p.test(text)) { violations.add("hate_speech"); confidence += 0.3; reasons.push("Offensive language"); break; }
  }
  for (const p of SPAM_PATTERNS) {
    if (p.test(text)) { violations.add("spam"); confidence += 0.2; reasons.push("Spam content"); break; }
  }
  for (const p of EXPLICIT_PATTERNS) {
    if (p.test(text)) { violations.add("explicit_content"); confidence += 0.3; reasons.push("Explicit content"); break; }
  }

  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (capsRatio > 0.6 && text.length > 20) {
    violations.add("spam"); confidence += 0.1; reasons.push("Excessive caps");
  }

  return {
    shouldFlag: confidence >= 0.3,
    confidence: Math.min(1, confidence),
    violations: [...violations],
    reason: reasons.join(", ") || "No violations detected",
  };
}

export const contentModerator = {
  /**
   * Auto-moderate a post. Inserts a moderation_reports row if flagged.
   * @param {string} postId
   * @param {string} userId
   * @param {{ title?: string, description?: string }} content
   */
  async moderatePost(postId, userId, content) {
    const fullText = `${content.title || ""} ${content.description || ""}`;
    const result = analyzeContent(fullText);

    if (result.shouldFlag) {
      try {
        await supabase.from("moderation_reports").insert({
          content_id: postId,
          content_type: "post",
          reported_user_id: userId,
          violation_types: result.violations,
          confidence_score: result.confidence,
          reason: result.reason,
          status: "pending",
          auto_flagged: true,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error creating moderation report:", err);
      }
    }

    return result;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TRACKER
// ─────────────────────────────────────────────────────────────────────────────

let _lastActiveUpdate = 0;
const ACTIVE_INTERVAL = 60_000; // throttle to once per minute

/**
 * Update last_active timestamp for the current user (throttled).
 */
export async function updateLastActive() {
  const now = Date.now();
  if (now - _lastActiveUpdate < ACTIVE_INTERVAL) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", session.user.id);

    if (!error) _lastActiveUpdate = now;
  } catch (err) {
    console.error("[ActivityTracker] Error updating last_active:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function sendPushNotificationToUsers(userIds, title, body, data = {}) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userIds, title, body, data, sound: "default" }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.error || "Failed to send push notification" };
    }

    const result = await response.json();
    return { success: true, sent: result.sent || 0 };
  } catch (err) {
    console.error("Error sending push notification:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a push notification about a new post to all users who have a push token.
 * @param {string} creatorName
 * @param {"article"|"podcast"|"video"|"verse"} postType
 * @param {string} postTitle
 * @param {string} postId
 */
export async function sendNewPostNotification(creatorName, postType, postTitle, postId) {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .not("push_token", "is", null)
      .limit(1000);

    if (error || !profiles?.length) return { success: false, error: "No recipients" };

    const emoji = { article: "📰", podcast: "🎙️", video: "🎬", verse: "✨" }[postType] || "📢";
    const typeLabel = { article: "article", podcast: "podcast", video: "video", verse: "verse" }[postType] || "post";

    return sendPushNotificationToUsers(
      profiles.map((p) => p.id),
      `${emoji} New ${typeLabel} from ${creatorName}`,
      postTitle,
      { type: "new_post", post_type: postType, post_id: postId, creator_name: creatorName },
    );
  } catch (err) {
    console.error("Error sending new post notification:", err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOWER NOTIFICATIONS (in-app + push)
// ─────────────────────────────────────────────────────────────────────────────

async function createNotification(userId, actorId, type, message, postId, communityId, title, meta) {
  try {
    const { error } = await supabase.from("notifications").insert([{
      user_id: userId,
      actor_id: actorId,
      type,
      message,
      post_id: postId || null,
      community_id: communityId || null,
      title: title || null,
      meta: meta || null,
      is_read: false,
    }]);
    if (error) console.error("Error creating notification:", error);
    return !error;
  } catch (err) {
    console.error("Error in createNotification:", err);
    return false;
  }
}

/**
 * Create an in-app notification for every follower of a user when they publish
 * new content, and fire a preference-aware push notification.
 *
 * @param {string} authorId
 * @param {"article"|"podcast"|"video"|"verse"} contentType
 * @param {string} contentId
 * @param {string} contentTitle
 */
export async function notifyFollowersOfNewPost(authorId, contentType, contentId, contentTitle) {
  try {
    const { data: followers, error: followersError } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", authorId);

    if (followersError) {
      console.error("Error fetching followers:", followersError);
      return false;
    }

    if (!followers?.length) return true;

    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", authorId)
      .single();

    const authorName = authorProfile?.full_name || authorProfile?.username || "A user";

    const messages = {
      article: `${authorName} published a new article`,
      podcast: `${authorName} published a new podcast`,
      video: `${authorName} posted a new video`,
      verse: `${authorName} posted a new verse`,
    };
    const notificationMessage = messages[contentType] || `${authorName} posted new content`;

    await Promise.all(
      followers.map((f) =>
        createNotification(
          f.follower_id,
          authorId,
          "engagement",
          notificationMessage,
          contentId,
          undefined,
          contentTitle,
          { content_type: contentType, notification_category: "followingPosted" },
        ),
      ),
    );

    // Fire push notifications to follower tokens (non-blocking)
    supabase
      .from("profiles")
      .select("id")
      .in("id", followers.map((f) => f.follower_id))
      .not("push_token", "is", null)
      .then(({ data: withTokens }) => {
        if (withTokens?.length) {
          const emoji = { article: "📰", podcast: "🎙️", video: "🎬", verse: "✨" }[contentType] || "📢";
          const typeLabel = contentType;
          sendPushNotificationToUsers(
            withTokens.map((p) => p.id),
            `${emoji} New ${typeLabel} from ${authorName}`,
            contentTitle,
            { type: "new_post", post_type: contentType, post_id: contentId, creator_name: authorName },
          ).catch(() => {});
        }
      })
      .catch(() => {});

    return true;
  } catch (err) {
    console.error("Error in notifyFollowersOfNewPost:", err);
    return false;
  }
}
