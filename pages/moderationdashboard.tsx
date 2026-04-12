// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { MdAdd, MdArrowBack, MdArrowForward, MdBlock, MdCheck, MdClose, MdDelete, MdEdit, MdFavorite, MdHome, MdNotifications, MdPerson, MdRemove, MdReport, MdSearch, MdSettings, MdShare, MdStar, MdVerified } from 'react-icons/md';
import { contentModerator } from '../lib/contentModerator';
import { fetchCurrentUserProfile } from '../lib/profileUtils';
import { useTheme } from '../context/ThemeProvider';
import { sendBroadcastNotification } from '../lib/pushNotifications';
import EmailCampaignManager from "../components/EmailCampaignManager";
import { supabase } from '../components/supabase';
import { IoArrowBack, IoChevronBack, IoNotifications } from 'react-icons/io5'

interface ModerationReport {
  id: string;
  content_id: string;
  content_type: string;
  reported_user_id: string;
  reporter_user_id?: string;
  violation_types: string[];
  reason: string;
  confidence_score: number;
  status: "pending" | "approved" | "rejected";
  auto_flagged: boolean;
  created_at: string;
  origin?:
    | "moderation_reports"
    | "reported_posts"
    | "reported_users"
    | "reported_comments";
}

export default function ModerationDashboard() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const [sendingInvites, setSendingInvites] = useState(false);

  // Email campaign states
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [emailSearchResults, setEmailSearchResults] = useState<{ id: string; email: string; username: string }[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [searchingEmails, setSearchingEmails] = useState(false);

  // Custom notification states
  const [showCustomNotificationModal, setShowCustomNotificationModal] =
    useState(false);
  const [customNotificationTitle, setCustomNotificationTitle] = useState("");
  const [customNotificationBody, setCustomNotificationBody] = useState("");
  const [sendingCustomNotification, setSendingCustomNotification] =
    useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const profile = await fetchCurrentUserProfile();
      if (profile && profile.id) {
        setUserId(profile.id);
        // @ts-ignore - is_admin might not be in type definition yet
        const adminStatus = profile.is_admin === true;
        setIsAdmin(adminStatus);
        if (adminStatus) {
          await loadReports();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      // Increase limit to ensure we fetch more reported_posts
      const moderationQueue = await contentModerator.getModerationQueue(
        "pending",
        200,
      );
      setReports(moderationQueue);
    } catch (error) {
      console.error("Error loading reports:", error);
      window.alert("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleSendUpdateNotification = () => {
  const router = useRouter();
    window.alert(/* Alert: */ 
      "Send App Update Notification",
      "This will send a push notification to all users asking them to update the app. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send",
          style: "default",
          onPress: async () => {
            try {
              const result = await sendBroadcastNotification(
                "🚀 Update Available!",
                "A new version of Verrsa is available. Please update your app for the best experience.",
                {
                  type: "app_update",
                  action: "update",
                },
              );

              if (result.success) {
                window.alert(/* Alert: */ 
                  "Success",
                  `Update notification sent to ${result.sent || "all"} users!`,
                );
              } else {
                window.alert(/* Alert: */ 
                  "Error",
                  result.error || "Failed to send notification",
                );
              }
            } catch (error) {
              console.error("Error sending broadcast:", error);
              window.alert("Failed to send notification");
            }
          },
        },
      ],
    );
  };

  const searchEmails = async (query: string) => {
    setEmailSearchQuery(query);
    if (!query.trim()) {
      setEmailSearchResults([]);
      return;
    }
    try {
      setSearchingEmails(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username')
        .or(`email.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(8);
      if (!error && data) {
        setEmailSearchResults(data.filter((u: any) => u.email));
      }
    } catch (e) {
      console.error('Email search error:', e);
    } finally {
      setSearchingEmails(false);
    }
  };

  const addEmail = (email: string) => {
    if (!selectedEmails.includes(email)) {
      setSelectedEmails((prev) => [...prev, email]);
    }
    setEmailSearchQuery('');
    setEmailSearchResults([]);
  };

  const removeEmail = (email: string) => {
    setSelectedEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSendCampaignEmail = async () => {
    if (selectedEmails.length === 0) {
      window.alert('Please add at least one email address.');
      return;
    }
    if (!emailSubject.trim()) {
      window.alert('Please enter a subject/message name.');
      return;
    }
    if (!emailBody.trim()) {
      window.alert('Please type an email message.');
      return;
    }
    const confirmed = window.confirm(`Send "${emailSubject}" to ${selectedEmails.length} recipient${selectedEmails.length !== 1 ? 's' : ''}?`);
    if (!confirmed) return;
    try {
      setSendingCampaign(true);
      const { data, error: invokeError } = await supabase.functions.invoke('send-campaign-email', {
        body: { emails: selectedEmails, subject: emailSubject, body: emailBody },
      });
      if (invokeError) throw invokeError;
      if (data.success) {
                setEmailSubject('');
                setEmailBody('');
              } else {
                window.alert(data.error || 'Failed to send emails');
              }
            } catch (err) {
              console.error('Campaign send error:', err);
              window.alert('Failed to send campaign emails');
            } finally {
              setSendingCampaign(false);
            }
  };

  const handleSendTeamInvites = async () => {
    const confirmed = window.confirm('This will send the team invite email to all 4 recipients. Continue?');
    if (!confirmed) return;
    try {
      setSendingInvites(true);
      const { data, error: invokeError } = await supabase.functions.invoke('send-custom-email', {
        body: { mode: 'invite' },
      });
      if (invokeError) throw invokeError;
      if (data.success) {
        window.alert(data.message || 'Team invites sent!');
      } else {
        window.alert(data.error || 'Failed to send invites');
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      window.alert('Failed to send team invites');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleShowCustomNotificationModal = () => {
    setCustomNotificationTitle("");
    setCustomNotificationBody("");
    setShowCustomNotificationModal(true);
  };

  const handleSendCustomNotification = async () => {
    if (!customNotificationTitle.trim() || !customNotificationBody.trim()) {
      window.alert("Please enter both title and message for the notification.");
      return;
    }

    const confirmed = window.confirm(`This will send a push notification to all users:\n\nTitle: ${customNotificationTitle}\nMessage: ${customNotificationBody}\n\nContinue?`);
    if (!confirmed) return;
    try {
      setSendingCustomNotification(true);
      const result = await sendBroadcastNotification(
        customNotificationTitle,
        customNotificationBody,
        {
          type: "custom_admin",
          action: "view",
        },
      );

      if (result.success) {
        window.alert(`Custom notification sent to ${result.sent || "all"} users!`);
        setShowCustomNotificationModal(false);
        setCustomNotificationTitle("");
        setCustomNotificationBody("");
      } else {
        window.alert(result.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending custom notification:", error);
      window.alert("Failed to send notification");
    } finally {
      setSendingCustomNotification(false);
    }
  };

  const handleModerate = async (
    reportId: string,
    action: "approve" | "reject" | "delete",
    reason?: string,
  ) => {
    try {
      await contentModerator.moderateContent(reportId, userId, action, reason);
      if (action === "approve") {
        setApprovedIds((prev) => {
          const next = new Set(prev);
          next.add(reportId);
          return next;
        });
      }
      window.alert(`Content ${
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : "deleted"
        } successfully`);
      await loadReports();
    } catch (error) {
      console.error("Error moderating content:", error);
      window.alert("Failed to moderate content");
    }
  };

  const sendEnforcementEmail = async (
    reportedUserId: string,
    enforcementAction: string,
    enforcementMessage: string,
  ) => {
    if (!reportedUserId || !enforcementMessage?.trim()) {
      return { success: false, message: "Missing user or enforcement message" };
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, username")
        .eq("id", reportedUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.email) {
        return { success: false, message: "No email found for this user" };
      }

      const readableAction = enforcementAction
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const greetingName = profile.username || "there";


      const { data, error: invokeError } = await supabase.functions.invoke(
        "send-custom-email",
        {
          body: {
            emails: [profile.email],
            subject: emailSubject,
            body: emailBody,
          },
        },
      );

      if (invokeError) throw invokeError;
      if (!data?.success) {
        return {
          success: false,
          message: data?.error || "Failed to send enforcement email",
        };
      }

      return { success: true, message: "Enforcement email sent" };
    } catch (error) {
      console.error("Error sending enforcement email:", error);
      return { success: false, message: "Failed to send enforcement email" };
    }
  };

  // Approve handler for reported users (profiles), with optional enforcement
  const handleApproveProfile = async (report: ModerationReport) => {
    window.alert(/* Alert: */ 
      "Approve Reported User",
      "Apply an optional enforcement window?",
      [
        {
          text: "Approve only",
          onPress: async () => {
            const res = await contentModerator.approveReportedUser(
              report.id,
              userId,
              {
                action: "none",
              },
            );
            if (res.success) {
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert("Reported user approved.");
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        {
          text: "Approve + 1w restricted",
          onPress: async () => {
            const enforcementMessage =
              "Temporarily restricted due to moderation decision.";
            const res = await contentModerator.approveReportedUser(
              report.id,
              userId,
              {
                enforcementDays: 7,
                action: "restricted",
                message: enforcementMessage,
              },
            );
            if (res.success) {
              const emailResult = await sendEnforcementEmail(
                report.reported_user_id,
                "restricted",
                enforcementMessage,
              );
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert(/* Alert: */ 
                "Success",
                emailResult.success
                  ? "User approved with 1-week restriction and email notification sent."
                  : "User approved with 1-week restriction, but email notification could not be sent.",
              );
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        {
          text: "Approve + 1w ban",
          style: "destructive",
          onPress: async () => {
            const enforcementMessage =
              "Temporarily banned due to moderation decision.";
            const res = await contentModerator.approveReportedUser(
              report.id,
              userId,
              {
                enforcementDays: 7,
                action: "banned",
                message: enforcementMessage,
              },
            );
            if (res.success) {
              const emailResult = await sendEnforcementEmail(
                report.reported_user_id,
                "banned",
                enforcementMessage,
              );
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert(/* Alert: */ 
                "Success",
                emailResult.success
                  ? "User approved with 1-week ban and email notification sent."
                  : "User approved with 1-week ban, but email notification could not be sent.",
              );
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Approve handler for reported posts with enforcement options
  const handleApprovePost = async (report: ModerationReport) => {
    window.alert(/* Alert: */ 
      "Approve Reported Post",
      "Apply an optional enforcement action?",
      [
        {
          text: "Approve only",
          onPress: async () => {
            const res = await contentModerator.approveReportedPost(
              report.id,
              userId,
              { action: "none" },
            );
            if (res.success) {
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert("Reported post approved.");
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        {
          text: "Approve + 1w review",
          onPress: async () => {
            const enforcementMessage =
              "This post is currently blocked and under review, appeal if you think this is not right.";
            const res = await contentModerator.approveReportedPost(
              report.id,
              userId,
              {
                enforcementDays: 7,
                action: "under_review",
                message: enforcementMessage,
              },
            );
            if (res.success) {
              const emailResult = await sendEnforcementEmail(
                report.reported_user_id,
                "under_review",
                enforcementMessage,
              );
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert(/* Alert: */ 
                "Success",
                emailResult.success
                  ? "Post approved with 1-week under-review enforcement and email notification sent."
                  : "Post approved with 1-week under-review enforcement, but email notification could not be sent.",
              );
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        {
          text: "Approve + Block",
          onPress: async () => {
            const enforcementMessage = "This post is blocked pending review.";
            const res = await contentModerator.approveReportedPost(
              report.id,
              userId,
              {
                action: "blocked",
                message: enforcementMessage,
              },
            );
            if (res.success) {
              const emailResult = await sendEnforcementEmail(
                report.reported_user_id,
                "blocked",
                enforcementMessage,
              );
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert(/* Alert: */ 
                "Success",
                emailResult.success
                  ? "Post approved and blocked with email notification sent."
                  : "Post approved and blocked, but email notification could not be sent.",
              );
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        {
          text: "Approve + Remove",
          style: "destructive",
          onPress: async () => {
            const enforcementMessage =
              "This post has been removed for violating our guidelines.";
            const res = await contentModerator.approveReportedPost(
              report.id,
              userId,
              {
                action: "removed",
                message: enforcementMessage,
              },
            );
            if (res.success) {
              const emailResult = await sendEnforcementEmail(
                report.reported_user_id,
                "removed",
                enforcementMessage,
              );
              setApprovedIds((prev) => {
                const next = new Set(prev);
                next.add(report.id);
                return next;
              });
              window.alert(/* Alert: */ 
                "Success",
                emailResult.success
                  ? "Post approved and removed with email notification sent."
                  : "Post approved and removed, but email notification could not be sent.",
              );
              await loadReports();
            } else {
              window.alert(res.message);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const confirmAction = (
    reportId: string,
    action: "approve" | "reject" | "delete",
  ) => {
    window.alert(/* Alert: */ 
      "Confirm Action",
      `Are you sure you want to ${action} this content?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => handleModerate(reportId, action),
          style: action === "delete" ? "destructive" : "default",
        },
      ],
    );
  };

  const getViolationColor = (type: string) => {
    const colors: { [key: string]: string } = {
      spam: "#FF9800",
      harassment: "#F44336",
      hate_speech: "#D32F2F",
      violence: "#C62828",
      explicit_content: "#E91E63",
      copyright: "#9C27B0",
      misinformation: "#FF5722",
      other: "#607D8B",
    };
    return colors[type] || "#757575";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return { label: "High", color: "#F44336" };
    if (score >= 0.5) return { label: "Medium", color: "#FF9800" };
    return { label: "Low", color: "#FFC107" };
  };

  if (loading) {
    return (
      <div
        style={{...(styles.container || {}), ...(styles.centerContent || {}), backgroundColor: theme.background}}
      >
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={{ marginTop: spacing.base, color: theme.secondaryText }}>
          Loading...
        </span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        style={{...(styles.container || {}), ...(styles.centerContent || {}), backgroundColor: theme.background}}
      >
        <MdCheck />
        <span style={{...(styles.emptyText || {}), color: theme.text}}>
          Access Denied
        </span>
        <span style={{...(styles.emptySubtext || {}), color: theme.secondaryText}}>
          You need access this page
        </span>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <span style={styles.backButtonText}>Go Back</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      {/* Header */}
      <div
        style={{...(styles.header || {}), backgroundColor: theme.background,
            borderBottomColor: theme.border,}}
      >
        <button onClick={() => router.back()}>
          <IoArrowBack />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>
          Moderation Dashboard
        </span>
        <div style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <button onClick={handleSendUpdateNotification}>
            <IoNotifications />
          </button>
          <button onClick={handleShowCustomNotificationModal}>
            <MdCheck />
          </button>
          <button
            onClick={handleSendTeamInvites}
            disabled={sendingInvites}
            style={{
              backgroundColor: '#4CAF50',
              paddingLeft: spacing.md,
    paddingRight: spacing.md,
              paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
              borderRadius: radius.sm,
              opacity: sendingInvites ? 0.5 : 1,
            }}
          >
            {sendingInvites ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : (
              <span style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.sm2 }}>Send Now</span>
            )}
          </button>
          <button onClick={onRefresh}>
            <IoChevronBack />
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div style={{...(styles.centerContent || {}), flex: 1}}>
          <MdCheck />
          <span style={{...(styles.emptyText || {}), color: theme.text}}>
            All Clear!
          </span>
          <span style={{...(styles.emptySubtext || {}), color: theme.secondaryText}}>
            No pending reports to review
          </span>
        </div>
      ) : (
        <div style={{...(styles.scrollView), overflowY: "auto"}}
        >
          <EmailCampaignManager />

          {/* ── Custom Email Campaign ── */}
          <span style={{ color: theme.text, marginLeft: spacing.base, marginTop: -35, fontSize: fontSize.xl, fontWeight: '600' }}>
            Send Custom Email Messages
          </span>
          <span style={{ color: theme.secondaryText, marginLeft: spacing.base, marginTop: spacing.sm, marginLeft: spacing.base,
    marginRight: spacing.base, fontSize: fontSize.md }}>
            Search creator emails, add recipients, then send a custom campaign.
          </span>

          {/* Search input */}
          <div style={{ marginLeft: spacing.base,
    marginRight: spacing.base, marginTop: spacing.base }}>
            <input
              placeholder="Search by email or username..."
              placeholderTextColor="#888"
              value={emailSearchQuery}
              onChange={(e) => searchEmails(e.target.value)}
              style={{
                backgroundColor: theme.background,
                color: theme.text,
                paddingLeft: spacing.md,
    paddingRight: spacing.md,
                paddingTop: spacing.md,
    paddingBottom: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.border,
                fontSize: fontSize.md2,
              }}
            />
            {searchingEmails && (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          )}
            {emailSearchResults.length > 0 && (
              <div style={{ backgroundColor: theme.cardBackground || '#1e1e1e', borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, marginTop: spacing.xs }}>
                {emailSearchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addEmail(user.email)}
                    style={{ paddingLeft: spacing.md,
    paddingRight: spacing.md, paddingTop: spacing.md,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  >
                    <span style={{ color: theme.text, fontWeight: '600' }}>{user.email}</span>
                    {user.username ? (
                      <span style={{ color: theme.secondaryText, fontSize: fontSize.sm }}>@{user.username}</span>
                    ) : null}
                  </button>
                ))}
              </div>
                    )}
          </div>

          {/* Selected emails box */}
          <div style={{ backgroundColor: theme.background, marginTop: spacing.md, marginLeft: spacing.base,
    marginRight: spacing.base, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, minHeight: 80, borderWidth: 1, borderColor: theme.border }}>
            {selectedEmails.length === 0 ? (
              <span style={{ color: '#666', fontSize: fontSize.sm2, textAlign: 'center', marginTop: spacing.sm }}>No recipients added yet. Search above to add.</span>
            ) : (
              <div style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {selectedEmails.map((email) => (
                  <div key={email} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#00BFFF22', borderRadius: radius.xl2, paddingLeft: spacing.md,
    paddingRight: spacing.md, paddingTop: spacing.xs,
    paddingBottom: spacing.xs, borderWidth: 1, borderColor: '#00BFFF55' }}>
                    <span style={{ color: '#00BFFF', fontSize: fontSize.sm2, marginRight: spacing.sm }}>{email}</span>
                    <button onClick={() => removeEmail(email)}>
                      <MdCheck />
                    </button>
                  </div>
                ))}
              </div>
                )}
          </div>
          {selectedEmails.length > 0 && (
            <span style={{ color: theme.secondaryText, fontSize: fontSize.sm, marginLeft: spacing.base,
    marginRight: spacing.base, marginBottom: spacing.sm }}>
              {selectedEmails.length} recipient{selectedEmails.length !== 1 ? 's' : ''} selected
            </span>
        )}
          {/* Subject */}
          <input
            placeholder="Subject / Message Name..."
            placeholderTextColor="#888"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              marginLeft: spacing.base,
    marginRight: spacing.base,
              marginBottom: spacing.md,
              paddingLeft: spacing.md,
    paddingRight: spacing.md,
              paddingTop: spacing.md,
    paddingBottom: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              fontSize: fontSize.md2,
            }}
          />

          {/* Body */}
          <input
            placeholder="Type email message..."
            placeholderTextColor="#888"
            multiline
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              marginLeft: spacing.base,
    marginRight: spacing.base,
              marginBottom: spacing.base,
              paddingLeft: spacing.md,
    paddingRight: spacing.md,
              paddingTop: spacing.md,
    paddingBottom: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              fontSize: fontSize.md2,
              minHeight: 300,
              textAlignVertical: 'top',
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSendCampaignEmail}
            disabled={sendingCampaign}
            style={{ opacity: sendingCampaign ? 0.6 : 1 }}
          >
            <div style={{ backgroundColor: '#00BFFF', marginBottom: spacing.xl3, padding: spacing.base, borderRadius: radius.md, alignItems: 'center', marginLeft: spacing.base,
    marginRight: spacing.base, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
              {sendingCampaign
                ? <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
                : <MdCheck />}
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: fontSize.base }}>
                {sendingCampaign ? 'Sending...' : 'Send'}
              </span>
            </div>
          </button>

          <span
            style={{...(styles.statsText || {}), backgroundColor: theme.background, color: theme.text}}
          >
            {reports.length} Pending Report{reports.length !== 1 ? "s" : ""}
          </span>

          {reports.map((report) => {
            const confidence = getConfidenceLabel(report.confidence_score);
            return (
              <div
                key={report.id}
                style={{...(styles.reportCard || {}), backgroundColor: theme.background}}
              >
                {/* Header */}
                <div style={styles.reportHeader}>
                  <div style={styles.reportHeaderLeft}>
                    <MdCheck />
                    <span
                      style={{...(styles.contentType || {}), color: theme.secondaryText}}
                    >
                      {report.content_type.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  {report.auto_flagged && (
                    <div style={styles.autoFlagBadge}>
                      <span style={styles.autoFlagText}>AUTO</span>
                    </div>
                  )}
                </div>

                {/* Violations */}
                <div style={styles.violationsContainer}>
                  {report.violation_types.map((type) => (
                    <div
                      key={type}
                      style={{...(styles.violationBadge || {}), backgroundColor: getViolationColor(type) + "20"}}
                    >
                      <span
                        style={{...(styles.violationText || {}), color: getViolationColor(type)}}
                      >
                        {type.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confidence Score */}
                <div style={styles.confidenceContainer}>
                  <span style={styles.confidenceLabel}>Confidence:</span>
                  <div
                    style={{...(styles.confidenceBadge || {}), backgroundColor: confidence.color + "20"}}
                  >
                    <span
                      style={{...(styles.confidenceText || {}), color: confidence.color}}
                    >
                      {confidence.label} (
                      {Math.round(report.confidence_score * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Reason */}
                {report.reason && (
                  <div
                    style={{...(styles.reasonContainer || {}), backgroundColor: theme.background}}
                  >
                    <span
                      style={{...(styles.reasonLabel || {}), color: theme.secondaryText}}
                    >
                      Reason:
                    </span>
                    <span style={{...(styles.reasonText || {}), color: theme.text}}>
                      {report.reason}
                    </span>
                  </div>
              )}
                {/* Timestamp */}
                <span
                  style={{...(styles.timestamp || {}), color: theme.secondaryText}}
                >
                  Reported {new Date(report.created_at).toLocaleString()}
                </span>

                {/* Action Buttons */}
                <div style={styles.actionButtons}>
                  <button
                    style={{...(styles.actionButton || {}), ...(styles.approveButton || {})}}
                    disabled={
                      approvedIds.has(report.id) || report.status === "approved"
                    }
                    onClick={() =>
                      report.origin === "reported_users"
                        ? handleApproveProfile(report)
                        : report.origin === "reported_posts"
                          ? handleApprovePost(report)
                          : confirmAction(report.id, "approve")
                    }
                  >
                    <MdCheck />
                    <span style={styles.actionButtonText}>
                      {approvedIds.has(report.id) ||
                      report.status === "approved"
                        ? "Approved"
                        : "Approve"}
                    </span>
                  </button>

                  <button
                    style={{...(styles.actionButton || {}), ...(styles.rejectButton || {})}}
                    onClick={() => confirmAction(report.id, "reject")}
                  >
                    <MdCheck />
                    <span style={styles.actionButtonText}>Reject</span>
                  </button>

                  <button
                    style={{...(styles.actionButton || {}), ...(styles.deleteButton || {})}}
                    onClick={() => confirmAction(report.id, "delete")}
                  >
                    <MdCheck />
                    <span style={styles.actionButtonText}>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
    )}
      {/* Custom Notification Modal */}
      {(showCustomNotificationModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowCustomNotificationModal(false)}>
        <div>
          <div
            style={{...(styles.modalContent || {}), backgroundColor: theme.cardBackground}}
          >
            <div style={styles.modalHeader}>
              <span style={{...(styles.modalTitle || {}), color: theme.text}}>
                Send Custom Notification
              </span>
              <button
                onClick={() => setShowCustomNotificationModal(false)}
              >
                <MdCheck />
              </button>
            </div>

            <span
              style={{...(styles.modalDescription || {}), color: theme.secondaryText}}
            >
              This will send a push notification to all users with push
              notifications enabled.
            </span>

            <div style={styles.inputContainer}>
              <span style={{...(styles.inputLabel || {}), color: theme.text}}>
                Notification Title
              </span>
              <input
                style={{...(styles.input || {}), backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,}}
                placeholder="Enter notification title..."
                placeholderTextColor={theme.secondaryText}
                value={customNotificationTitle}
                onChange={(e) => setCustomNotificationTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div style={styles.inputContainer}>
              <span style={{...(styles.inputLabel || {}), color: theme.text}}>
                Notification Message
              </span>
              <input
                style={{...(styles.input || {}), ...(styles.textArea || {}), backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,}}
                placeholder="Enter notification message..."
                placeholderTextColor={theme.secondaryText}
                value={customNotificationBody}
                onChange={(e) => setCustomNotificationBody(e.target.value)}
                multiline
                
                maxLength={200}
              />
              <span
                style={{...(styles.characterCount || {}), color: theme.secondaryText}}
              >
                {customNotificationBody.length}/200
              </span>
            </div>

            <div style={styles.modalButtons}>
              <button
                style={{...(styles.modalButton || {}), ...(styles.cancelButton || {}), borderColor: theme.border}}
                onClick={() => setShowCustomNotificationModal(false)}
              >
                <span style={{...(styles.cancelButtonText || {}), color: theme.text}}>
                  Cancel
                </span>
              </button>
              <button
                style={{...(styles.modalButton || {}), ...(styles.sendButton || {}), ...((sendingCustomNotification ||
                    !customNotificationTitle.trim() ||
                    !customNotificationBody.trim()) ? styles.disabledButton : {})}}
                onClick={handleSendCustomNotification}
                disabled={
                  sendingCustomNotification ||
                  !customNotificationTitle.trim() ||
                  !customNotificationBody.trim()
                }
              >
                {sendingCustomNotification ? (
                  <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
                ) : (
                  <>
                    <MdCheck />
                    <span style={styles.sendButtonText}>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
                )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  statsText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  reportCard: {
    marginLeft: spacing.base,
    marginRight: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  reportHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentType: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  autoFlagBadge: {
    backgroundColor: "#FF9800",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.xs,
  },
  autoFlagText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: "#fff",
  },
  violationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  violationBadge: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  violationText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  confidenceLabel: {
    fontSize: fontSize.md,
    color: "#666",
    marginRight: spacing.sm,
  },
  confidenceBadge: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
  },
  confidenceText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  reasonContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  reasonLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: fontSize.sm,
    marginBottom: spacing.base,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.md,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#FF9800",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    marginTop: spacing.base,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
  },
  backButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  modalDescription: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.base,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: fontSize.sm,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: "#FF9800",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.base,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  },
};
