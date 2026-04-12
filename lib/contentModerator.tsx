/**
 * Content Moderation Service
 * Auto-flags inappropriate content and manages moderation queue
 */

import { supabase } from "../components/supabase";
import { sendContentReportNotification } from "./emailService";

export type ModerationStatus = "pending" | "approved" | "rejected" | "flagged";
export type ContentType =
  | "post"
  | "comment"
  | "message"
  | "profile"
  | "community";
export type ViolationType =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "explicit_content"
  | "copyright"
  | "misinformation"
  | "other";

interface ModerationResult {
  shouldFlag: boolean;
  confidence: number;
  violations: ViolationType[];
  reason: string;
}

// Offensive words and phrases (basic list - expand as needed)
const OFFENSIVE_PATTERNS = [
  /\b(fuck|shit|damn|bitch|asshole|bastard)\b/gi,
  /\b(kill yourself|kys|die)\b/gi,
  /\b(n[i1]gg[ae]r|f[a4]gg[o0]t)\b/gi,
  /\b(rape|molest|abuse)\b/gi,
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(click here|buy now|limited offer|act now)\b/gi,
  /(https?:\/\/[^\s]+){3,}/gi, // Multiple links
  /(.)\1{5,}/gi, // Repeated characters
  /\b(free money|get rich|work from home)\b/gi,
];

// Explicit content patterns
const EXPLICIT_PATTERNS = [
  /\b(porn|xxx|sex|nude|naked)\b/gi,
  /\b(dick|cock|pussy|tits|ass)\b/gi,
];

class ContentModerator {
  /**
   * Analyze content for violations
   */
  analyzeContent(content: string): ModerationResult {
    const violations: ViolationType[] = [];
    let confidence = 0;
    const reasons: string[] = [];

    // Check for offensive language
    for (const pattern of OFFENSIVE_PATTERNS) {
      if (pattern.test(content)) {
        violations.push("hate_speech");
        confidence += 0.3;
        reasons.push("Contains offensive language");
        break;
      }
    }

    // Check for spam
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        violations.push("spam");
        confidence += 0.2;
        reasons.push("Appears to be spam");
        break;
      }
    }

    // Check for explicit content
    for (const pattern of EXPLICIT_PATTERNS) {
      if (pattern.test(content)) {
        violations.push("explicit_content");
        confidence += 0.3;
        reasons.push("Contains explicit content");
        break;
      }
    }

    // Check for excessive caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.6 && content.length > 20) {
      violations.push("spam");
      confidence += 0.1;
      reasons.push("Excessive use of capital letters");
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
    if (emojiCount > 10) {
      violations.push("spam");
      confidence += 0.1;
      reasons.push("Excessive emoji usage");
    }

    const shouldFlag = confidence >= 0.3;

    return {
      shouldFlag,
      confidence: Math.min(1, confidence),
      violations: [...new Set(violations)],
      reason: reasons.join(", ") || "No violations detected",
    };
  }

  /**
   * Moderate post content
   */
  async moderatePost(
    postId: string,
    userId: string,
    content: {
      title?: string;
      description?: string;
    },
  ): Promise<ModerationResult> {
    const fullContent = `${content.title || ""} ${content.description || ""}`;
    const result = this.analyzeContent(fullContent);

    if (result.shouldFlag) {
      await this.createModerationReport({
        contentId: postId,
        contentType: "post",
        userId,
        violations: result.violations,
        confidence: result.confidence,
        reason: result.reason,
        autoFlagged: true,
      });
    }

    return result;
  }

  /**
   * Moderate comment content
   */
  async moderateComment(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<ModerationResult> {
    const result = this.analyzeContent(content);

    if (result.shouldFlag) {
      await this.createModerationReport({
        contentId: commentId,
        contentType: "comment",
        userId,
        violations: result.violations,
        confidence: result.confidence,
        reason: result.reason,
        autoFlagged: true,
      });
    }

    return result;
  }

  /**
   * Create moderation report
   */
  private async createModerationReport(data: {
    contentId: string;
    contentType: ContentType;
    userId: string;
    violations: ViolationType[];
    confidence: number;
    reason: string;
    autoFlagged: boolean;
  }): Promise<void> {
    try {
      await supabase.from("moderation_reports").insert({
        content_id: data.contentId,
        content_type: data.contentType,
        reported_user_id: data.userId,
        violation_types: data.violations,
        confidence_score: data.confidence,
        reason: data.reason,
        status: "pending",
        auto_flagged: data.autoFlagged,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error creating moderation report:", error);
    }
  }

  /**
   * User-initiated content report
   */
  async reportContent(
    reporterId: string,
    contentId: string,
    contentType: ContentType,
    reportedUserId: string,
    violationType: ViolationType,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Handle comment reports separately
      if (contentType === "comment") {
        // Check duplicate
        const { data: existingComment, error: checkCommentError } =
          await supabase
            .from("reported_comments")
            .select("id")
            .eq("comment_id", contentId)
            .eq("reported_by", reporterId)
            .maybeSingle();

        if (existingComment) {
          return {
            success: false,
            message: "You have already reported this comment",
          };
        }

        // Detect scope: community vs regular
        let commentScope: "community" | "regular" = "regular";
        let authorId: string | null = null;
        try {
          const { data: communityComment } = await supabase
            .from("community_comments")
            .select("id, user_id")
            .eq("id", contentId)
            .maybeSingle();
          if (communityComment) {
            commentScope = "community";
            authorId = (communityComment as any).user_id || null;
          } else {
            const { data: regularComment } = await supabase
              .from("comments")
              .select("id, user_id")
              .eq("id", contentId)
              .maybeSingle();
            if (regularComment) {
              authorId = (regularComment as any).user_id || null;
            }
          }
        } catch {}

        const { error: insertCommentError } = await supabase
          .from("reported_comments")
          .insert({
            comment_id: contentId,
            comment_scope: commentScope,
            reported_by: reporterId,
            reported_user_id: reportedUserId || authorId,
            reason: reason || violationType,
            status: "pending",
          });

        if (insertCommentError) {
          console.error("Error inserting comment report:", insertCommentError);
          return {
            success: false,
            message: "Failed to submit report. Please try again.",
          };
        }

        // Send email notification to admin
        try {
          const { data: reporterData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", reporterId)
            .single();

          const { data: reportedUserData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", reportedUserId || authorId)
            .maybeSingle();

          await sendContentReportNotification(
            reporterData?.email || "Unknown",
            "comment",
            violationType,
            reason,
            contentId,
            reportedUserData?.email || null,
          );
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
          // Don't fail the report if email fails
        }

        return {
          success: true,
          message: "Comment reported successfully. Our team will review it.",
        };
      }

      // Check if user already reported this content
      const { data: existing, error: checkError } = await supabase
        .from("reported_posts")
        .select("id")
        .eq("post_id", contentId)
        .eq("reported_by", reporterId)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          message: "You have already reported this content",
        };
      }

      // Map contentType to post_type for the reported_posts table
      const postType = contentType === "post" ? "article" : contentType;

      const { error: insertError } = await supabase
        .from("reported_posts")
        .insert({
          post_id: contentId,
          post_type: postType,
          reported_by: reporterId,
          reason: reason || violationType,
          status: "pending",
        });

      if (insertError) {
        console.error("Error inserting report:", insertError);
        return {
          success: false,
          message: "Failed to submit report. Please try again.",
        };
      }

      // Send email notification to admin
      try {
        const { data: reporterData } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", reporterId)
          .single();

        const { data: reportedUserData } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", reportedUserId)
          .maybeSingle();

        await sendContentReportNotification(
          reporterData?.email || "Unknown",
          postType,
          violationType,
          reason,
          contentId,
          reportedUserData?.email || null,
        );
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the report if email fails
      }

      return {
        success: true,
        message: "Content reported successfully. Our team will review it.",
      };
    } catch (error) {
      console.error("Error reporting content:", error);
      return {
        success: false,
        message: "Failed to submit report. Please try again.",
      };
    }
  }

  /**
   * Get moderation queue (admin only)
   */
  async getModerationQueue(
    status: ModerationStatus = "pending",
    limit: number = 50,
  ) {
    try {
      // 1) Auto-flagged moderation reports
      const { data: modReports, error: modError } = await supabase
        .from("moderation_reports")
        .select(
          "id, content_id, content_type, reported_user_id, violation_types, reason, confidence_score, status, auto_flagged, created_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (modError) throw modError;

      // 2) User-reported posts (articles, podcasts, videos)
      const { data: reportedPosts, error: postsError } = await supabase
        .from("reported_posts")
        .select(
          "id, post_id, post_type, reported_by, reason, status, created_at, enforcement_action, enforcement_until, enforcement_message, enforced_by, enforced_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (postsError && postsError.code !== "PGRST205") throw postsError;

      // Map reported_posts -> ModerationReport shape
      const mappedReportedPosts = (reportedPosts || []).map((rp: any) => ({
        id: rp.id,
        content_id: rp.post_id,
        content_type: rp.post_type, // "article" | "podcast" | "video" | "forum"
        reported_user_id: null, // could be joined from content tables if needed
        reporter_user_id: rp.reported_by,
        violation_types: rp.reason ? [rp.reason] : [],
        reason: rp.reason || "",
        confidence_score: 0,
        status: rp.status || "pending",
        auto_flagged: false,
        created_at: rp.created_at,
        origin: "reported_posts",
        enforcement_action: rp.enforcement_action,
        enforcement_until: rp.enforcement_until,
        enforcement_message: rp.enforcement_message,
        enforced_by: rp.enforced_by,
        enforced_at: rp.enforced_at,
      }));

      // 3) Reported users (profiles)
      const { data: reportedUsers, error: usersError } = await supabase
        .from("reported_users")
        .select("id, reported_user_id, reported_by, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (usersError && usersError.code !== "PGRST205") throw usersError;

      const mappedReportedUsers = (reportedUsers || []).map((ru: any) => ({
        id: ru.id,
        content_id: ru.reported_user_id,
        content_type: "profile",
        reported_user_id: ru.reported_user_id,
        reporter_user_id: ru.reported_by,
        violation_types: ru.reason ? [ru.reason] : [],
        reason: ru.reason || "",
        confidence_score: 0,
        status: "pending",
        auto_flagged: false,
        created_at: ru.created_at,
        origin: "reported_users",
      }));

      // 4) Reported comments
      const { data: reportedComments, error: commentsError } = await supabase
        .from("reported_comments")
        .select(
          "id, comment_id, reported_by, reported_user_id, reason, status, created_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (commentsError && commentsError.code !== "PGRST205")
        throw commentsError;

      const mappedReportedComments = (reportedComments || []).map(
        (rc: any) => ({
          id: rc.id,
          content_id: rc.comment_id,
          content_type: "comment",
          reported_user_id: rc.reported_user_id,
          reporter_user_id: rc.reported_by,
          violation_types: rc.reason ? [rc.reason] : [],
          reason: rc.reason || "",
          confidence_score: 0,
          status: rc.status || "pending",
          auto_flagged: false,
          created_at: rc.created_at,
          origin: "reported_comments",
        }),
      );

      // Merge and sort by created_at desc, then apply limit
      const combined = [
        ...(modReports || []).map((m: any) => ({
          ...m,
          origin: "moderation_reports",
        })),
        ...mappedReportedPosts,
        ...mappedReportedUsers,
        ...mappedReportedComments,
      ].sort((a: any, b: any) => {
        const ad = new Date(a.created_at).getTime();
        const bd = new Date(b.created_at).getTime();
        return bd - ad;
      });

      return combined.slice(0, limit);
    } catch (error) {
      console.error("Error fetching moderation queue:", error);
      return [];
    }
  }

  /**
   * Take moderation action (admin only)
   */
  async moderateContent(
    reportId: string,
    moderatorId: string,
    action: "approve" | "reject" | "delete",
    notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const newStatus: ModerationStatus =
        action === "approve" ? "approved" : "rejected";

      await supabase
        .from("moderation_reports")
        .update({
          status: newStatus,
          moderator_id: moderatorId,
          moderated_at: new Date().toISOString(),
          moderator_notes: notes,
        })
        .eq("id", reportId);

      // If action is delete, mark content as deleted/hidden
      if (action === "delete") {
        // Implement content deletion logic here
        // This depends on your content tables structure
      }

      return {
        success: true,
        message: `Content ${action}d successfully`,
      };
    } catch (error) {
      console.error("Error moderating content:", error);
      return {
        success: false,
        message: "Failed to moderate content",
      };
    }
  }

  /**
   * Approve a reported user and optionally apply enforcement (admin only)
   * enforcementDays: number of days for enforcement window (e.g., 7 for a week)
   * action: 'none' | 'restricted' | 'banned'
   */
  async approveReportedUser(
    reportedUserRowId: string,
    moderatorId: string,
    options?: {
      enforcementDays?: number;
      action?: "none" | "restricted" | "banned";
      message?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const action = options?.action || "none";
      const enforcementUntil =
        action === "banned"
          ? null
          : options?.enforcementDays
            ? new Date(
                Date.now() +
                  (options.enforcementDays || 0) * 24 * 60 * 60 * 1000,
              ).toISOString()
            : null;

      const { error } = await supabase
        .from("reported_users")
        .update({
          status: "approved",
          enforcement_action: action,
          enforcement_until: enforcementUntil,
          enforcement_message: options?.message || null,
          enforced_by: moderatorId,
          enforced_at: new Date().toISOString(),
        })
        .eq("id", reportedUserRowId);

      if (error) {
        console.error("approveReportedUser: update error", error);
        return { success: false, message: "Failed to approve reported user" };
      }

      return { success: true, message: "Reported user approved" };
    } catch (err) {
      console.error("approveReportedUser: unexpected error", err);
      return { success: false, message: "Unexpected error" };
    }
  }

  /**
   * Approve a reported post and optionally apply enforcement (admin only)
   * action: 'none' | 'under_review' | 'blocked' | 'removed'
   */
  async approveReportedPost(
    reportedPostRowId: string,
    moderatorId: string,
    options?: {
      enforcementDays?: number;
      action?: "none" | "under_review" | "blocked" | "removed";
      message?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const action = options?.action || "none";
      const enforcementUntil =
        action === "removed"
          ? null
          : options?.enforcementDays
            ? new Date(
                Date.now() +
                  (options.enforcementDays || 0) * 24 * 60 * 60 * 1000,
              ).toISOString()
            : null;

      const { error } = await supabase
        .from("reported_posts")
        .update({
          status: "approved",
          enforcement_action: action,
          enforcement_until: enforcementUntil,
          enforcement_message: options?.message || null,
          enforced_by: moderatorId,
          enforced_at: new Date().toISOString(),
        })
        .eq("id", reportedPostRowId);

      if (error) {
        console.error("approveReportedPost: update error", error);
        return { success: false, message: "Failed to approve reported post" };
      }

      return { success: true, message: "Reported post approved" };
    } catch (err) {
      console.error("approveReportedPost: unexpected error", err);
      return { success: false, message: "Unexpected error" };
    }
  }
}

export const contentModerator = new ContentModerator();
export default contentModerator;
