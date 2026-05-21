// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { IoClose, IoCopyOutline, IoCheckmarkCircle, IoImageOutline, IoLogoWhatsapp, IoLogoFacebook, IoLogoLinkedin, IoPeopleOutline } from 'react-icons/io5';
// react-native-view-shot not available on web - use html2canvas instead
const captureRef = async (ref: any, options?: any): Promise<string> => {
  // Fallback: return empty string on web
  return '';
};
import { trackShare } from './api';
import { sendPushNotificationToUsers } from '../lib/pushNotifications';
import { supabase } from '../components/supabase';

// Add spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

type SharePostModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
  date?: string;
  postId?: string;
  postType?:
    | "article"
    | "podcast"
    | "video"
    | "profile"
    | "community"
    | "verse"
    | "communitypost";
  postUrl?: string;
  description?: string;
  imageUrl?: string;
};

export default function SharePostModal({
  visible,
  onClose,
  title,
  url,
  date,
  postId,
  postType,
  postUrl,
  description,
  imageUrl,
}: SharePostModalProps) {
  const [following, setFollowing] = useState<
    { id: any; username: any; full_name: any; avatar_url: any; bio: any }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const imageCardRef = useRef<HTMLDivElement>(null);

  const getWebSharePath = (
    type?: SharePostModalProps["postType"],
    id?: string,
  ): string | null => {
    if (!type || !id) return null;
    if (type === "article") return `/post/${encodeURIComponent(id)}`;
    if (type === "podcast") return `/post/${encodeURIComponent(id)}`;
    if (type === "video") return `/post/${encodeURIComponent(id)}`;
    if (type === "verse") return `/post/${encodeURIComponent(id)}`;
    if (type === "community") return `/community/${encodeURIComponent(id)}`;
    if (type === "communitypost") {
      return `/post/${encodeURIComponent(id)}`;
    }
    if (type === "profile") return `/user/${encodeURIComponent(id)}`;
    return null;
  };

  const webSharePath = getWebSharePath(postType, postId);

  const getTrackShareType = (
    type?: SharePostModalProps["postType"],
  ): "article" | "podcast" | "video" | "community" | "verse" | null => {
    if (!type || type === "profile") return null;
    if (type === "communitypost") return "community";
    return type;
  };

  const trackShareType = getTrackShareType(postType);

  const shareUrl =
    webSharePath
      ? `https://www.verrsa.org${webSharePath}`
      : postUrl || url;
  const shareDescription =
    description ||
    (postType === "podcast"
      ? "Listen to this podcast on Verrsa."
      : postType === "video"
        ? "Watch this video on Verrsa."
        : postType === "community"
          ? "Check out this community post on Verrsa."
          : postType === "profile"
            ? "View this profile on Verrsa."
            : postType === "verse"
              ? "Check this verse out on Verrsa."
            : "Read this article on Verrsa.");

  // Fetch following users when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchFollowing();
    }
  }, [visible]);

  const fetchFollowing = async () => {
    try {
      setLoadingUsers(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("follows")
          .select(
            `
          following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `,
          )
          .eq("follower_id", user.id)
          .limit(6); // Limit to 6 users

        if (error) throw error;

        const followingList = data
          ? data
              .flatMap((item) =>
                Array.isArray(item.profiles) ? item.profiles : [item.profiles],
              )
              .filter(Boolean) // Remove any null/undefined entries
              .slice(0, 6) // Ensure we only get 6 users max
          : [];

        setFollowing(followingList);
      }
    } catch (error) {
      console.error("Error fetching following users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleShareToUser = async (userId: string, userName: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Create a notification for the shared content
      const contentLabel =
        postType === "verse"
          ? "verse"
          : postType === "communitypost"
            ? "community post"
            : postType || "post";

      const shareContent =
        postType === "profile"
          ? `${
              user.user_metadata?.full_name || "Someone"
            } shared a profile with you`
          : `${
              user.user_metadata?.full_name || "Someone"
            } shared a ${contentLabel} with you: ${title}`;

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: userId,
            actor_id: user.id,
            title: "Content Shared",
            message: shareContent,
            type: "share",
            meta: {
              shared_by_id: user.id,
              shared_by_name: user.user_metadata?.full_name || "User",
              content_id: postId,
              content_type: postType,
              content_title: title,
              content_url: shareUrl,
            },
            post_id: null,
            is_read: false,
          },
        ]);

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Send push notification so recipient gets alerted immediately.
      await sendPushNotificationToUsers(
        [userId],
        "Content Shared",
        shareContent,
        {
          type: "share",
          contentType: postType,
          contentId: postId,
          sharedByName: user.user_metadata?.full_name || "Someone",
          screen: "Notifications",
        },
      );

      // Track the share action
      if (postId && trackShareType) {
        await trackShare(postId, trackShareType, "internal_user", userName);
      }

      console.log(`Successfully shared to ${userName}`);
      onClose();
    } catch (error) {
      console.error(`Error sharing to ${userName}:`, error);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (shareUrl) {
        // Use Web Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);

          if (postId && trackShareType) {
            await trackShare(postId, trackShareType, "copy_link");
          }

          setLinkCopied(true);
          // Reset after 2 seconds
          setTimeout(() => {
            setLinkCopied(false);
          }, 2000);

          console.log("Link copied to clipboard:", shareUrl);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          try {
            document.execCommand("copy");

            if (postId && trackShareType) {
              await trackShare(postId, trackShareType, "copy_link");
            }

            setLinkCopied(true);
            setTimeout(() => {
              setLinkCopied(false);
            }, 2000);

            console.log("Link copied to clipboard (fallback):", shareUrl);
          } catch (err) {
            console.error("Fallback: Unable to copy", err);
          }

          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleShareToApp = async (platform: string) => {
    try {
      if (postId && trackShareType) {
        await trackShare(postId, trackShareType, "external_app", platform);
      }

      const content =
        postType === "profile"
          ? `Check out ${title} on Verrsa!`
          : `Check out this ${postType}: ${title}`;

      const shareText = content + (shareUrl ? ` ${shareUrl}` : "");

      // Use Web Share API if available
      if (navigator.share) {
        try {
          await navigator.share({
            title: title || "Check this out on Verrsa",
            text: content,
            url: shareUrl,
          });
          onClose();
          return;
        } catch (err) {
          // User cancelled or share failed
          console.log("Share cancelled or failed:", err);
        }
      }

      // Fallback to opening URLs for specific platforms
      let shareUrlPlatform = "";

      switch (platform) {
        case "whatsapp":
          shareUrlPlatform = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          break;
        case "twitter":
          shareUrlPlatform = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
          break;
        case "facebook":
          shareUrlPlatform = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl || "")}`;
          break;
        case "linkedin":
          shareUrlPlatform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || "")}`;
          break;
      }

      if (shareUrlPlatform) {
        window.open(shareUrlPlatform, "_blank", "noopener,noreferrer");
      }

      onClose();
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
    }
  };

  const handleSaveImage = async () => {
    if (!imageCardRef.current) return;
    try {
      setSavingImage(true);
      const dataUrl = await captureRef(imageCardRef, {
        format: "png",
        quality: 1,
        result: "data-uri",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${(title || "verrsa-share").replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (postId && trackShareType) {
        await trackShare(postId, trackShareType, "save_image");
      }
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <>
      {visible && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            {/* Header */}
            <div style={styles.header}>
              <span style={styles.headerTitle}>Share</span>
              <button onClick={onClose} style={styles.closeButton}>
                <IoClose size={24} color="#000" />
              </button>
            </div>

            {/* Post Info */}
            {title && <div style={styles.title}>{title}</div>}
            {date && <div style={styles.subtitle}>{date}</div>}

            <button style={styles.linkBox} onClick={handleCopyLink}>
              {linkCopied ? (
                <IoCheckmarkCircle size={20} color="#4CAF50" />
              ) : (
                <IoCopyOutline size={20} color="#000" />
              )}
              <span style={linkCopied ? { ...styles.linkText, ...styles.linkCopiedText } : styles.linkText}>
                {linkCopied ? "Link Copied!" : "Copy Link"}
              </span>
            </button>

            <button
              style={styles.imageShareBox}
              onClick={() => setImageModalVisible(true)}
            >
              <IoImageOutline size={20} color="#000" />
              <span style={styles.linkText}>Share as Image</span>
            </button>

            {/* Share Options */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Share via</div>
              <div style={styles.shareOptions}>
                <button
                  style={styles.shareOption}
                  onClick={() => handleShareToApp("whatsapp")}
                >
                  <div style={{ ...styles.shareIcon, backgroundColor: "#25D366" }}>
                    <IoLogoWhatsapp size={24} color="#fff" />
                  </div>
                  <span style={styles.shareLabel}>WhatsApp</span>
                </button>

                <button
                  style={styles.shareOption}
                  onClick={() => handleShareToApp("twitter")}
                >
                  <div style={{ ...styles.shareIcon, backgroundColor: "#000000" }}>
                    <span style={{ color: "#fff", fontSize: "24px", fontWeight: "bold" }}>
                      𝕏
                    </span>
                  </div>
                  <span style={styles.shareLabel}>X</span>
                </button>

                <button
                  style={styles.shareOption}
                  onClick={() => handleShareToApp("facebook")}
                >
                  <div style={{ ...styles.shareIcon, backgroundColor: "#1877F2" }}>
                    <IoLogoFacebook size={24} color="#fff" />
                  </div>
                  <span style={styles.shareLabel}>Facebook</span>
                </button>

                <button
                  style={styles.shareOption}
                  onClick={() => handleShareToApp("linkedin")}
                >
                  <div style={{ ...styles.shareIcon, backgroundColor: "#0A66C2" }}>
                    <IoLogoLinkedin size={24} color="#fff" />
                  </div>
                  <span style={styles.shareLabel}>LinkedIn</span>
                </button>
              </div>
            </div>

            {/* Share to Following Users */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Share to Following</div>
              {loadingUsers ? (
                <div style={styles.emptyState}>
                  <div style={styles.spinner} />
                  <div style={{ ...styles.emptyStateText, marginTop: "8px" }}>
                    Loading users...
                  </div>
                </div>
              ) : following.length > 0 ? (
                <div style={styles.userList}>
                  {following.map((user) => (
                    <button
                      key={user.id}
                      style={styles.userCard}
                      onClick={() => handleShareToUser(user.id, user.username)}
                    >
                      <img
                        src={user.avatar_url || "https://via.placeholder.com/50"}
                        alt={user.full_name || user.username}
                        style={styles.userAvatar}
                      />
                      <div style={styles.userName}>
                        {user.full_name || user.username}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <IoPeopleOutline size={32} color="#999" />
                  <div style={styles.emptyStateText}>
                    You're not following anyone yet
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Share Modal */}
      {imageModalVisible && (
        <div style={styles.imageOverlay}>
          <div style={styles.imageModal}>
            <div style={styles.imageHeader}>
              <span style={styles.imageHeaderTitle}>Share Image</span>
              <button
                onClick={() => setImageModalVisible(false)}
                style={styles.closeButton}
              >
                <IoClose size={20} color="#000" />
              </button>
            </div>

            <div style={styles.imageCardWrapper}>
              <div ref={imageCardRef} style={styles.imageCard}>
                {imageUrl ? (
                  <img src={imageUrl} alt={title || "Share"} style={styles.shareImage} />
                ) : (
                  <div style={styles.shareImageFallback}>
                    <IoImageOutline size={36} color="#666" />
                  </div>
                )}
                <div style={styles.imageCardContent}>
                  <div style={styles.imageCardTitle}>
                    {title || "Verrsa"}
                  </div>
                  <div style={styles.imageCardDesc}>
                    {shareDescription}
                  </div>
                  {shareUrl && (
                    <div style={styles.imageCardUrl}>
                      {shareUrl}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.imageActions}>
              <button
                style={styles.saveImageButton}
                onClick={handleSaveImage}
                disabled={savingImage}
              >
                {savingImage ? (
                  <div style={styles.spinner} />
                ) : (
                  <span style={styles.saveImageText}>Save Image</span>
                )}
              </button>
              <button
                style={styles.copyLinkButton}
                onClick={handleCopyLink}
              >
                <span style={styles.copyLinkText}>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    width: "100%",
    maxWidth: "600px",
    backgroundColor: "#fff",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    padding: "20px",
    maxHeight: "80vh",
    overflowY: "auto" as const,
  },
  header: {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#000",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "16px",
  },
  linkBox: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f5f5f5",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "none",
    cursor: "pointer",
    width: "100%",
  },
  imageShareBox: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f5f5f5",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "none",
    cursor: "pointer",
    width: "100%",
  },
  linkText: {
    marginLeft: "12px",
    fontSize: "16px",
    color: "#000",
    fontWeight: "500",
  },
  linkCopiedText: {
    color: "#4CAF50",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#000",
    marginBottom: "12px",
  },
  shareOptions: {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-around",
    flexWrap: "wrap" as const,
    gap: "16px",
  },
  shareOption: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    marginBottom: "12px",
  },
  shareIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "8px",
  },
  shareLabel: {
    fontSize: "12px",
    color: "#000",
  },
  userList: {
    display: "flex",
    flexDirection: "row" as const,
    overflowX: "auto" as const,
    gap: "16px",
    paddingBottom: "8px",
  },
  userCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    minWidth: "70px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  userAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "28px",
    marginBottom: "8px",
    backgroundColor: "#f0f0f0",
    objectFit: "cover" as const,
  },
  userName: {
    fontSize: "12px",
    color: "#000",
    textAlign: "center" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: "70px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 0",
  },
  emptyStateText: {
    fontSize: "14px",
    color: "#999",
    marginTop: "8px",
  },
  spinner: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "3px solid #00BFFF",
    borderTopColor: "transparent",
    animation: "spin 1s linear infinite",
  },
  imageOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 1001,
    display: "flex",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  imageModal: {
    width: "100%",
    maxWidth: "500px",
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "16px",
  },
  imageHeader: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  imageHeaderTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#000",
  },
  imageCardWrapper: {
    borderRadius: "14px",
    overflow: "hidden",
    border: "1px solid #eee",
  },
  imageCard: {
    backgroundColor: "#fafafa",
  },
  shareImage: {
    width: "100%",
    height: "160px",
    objectFit: "cover" as const,
  },
  shareImageFallback: {
    width: "100%",
    height: "160px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaeaea",
  },
  imageCardContent: {
    padding: "12px",
  },
  imageCardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#000",
    marginBottom: "6px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  },
  imageCardDesc: {
    fontSize: "13px",
    color: "#444",
    marginBottom: "8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as const,
  },
  imageCardUrl: {
    fontSize: "11px",
    color: "#666",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  imageActions: {
    display: "flex",
    flexDirection: "row" as const,
    marginTop: "16px",
    gap: "10px",
  },
  saveImageButton: {
    flex: 1,
    backgroundColor: "#000",
    padding: "12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
  },
  saveImageText: {
    color: "#fff",
    fontWeight: "600",
  },
  copyLinkButton: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    padding: "12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
  },
  copyLinkText: {
    color: "#000",
    fontWeight: "600",
  },
};
