// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack, IoVideocam } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { contentModerator } from '../lib/contentModerator';
import { sendNewPostNotification } from '../lib/pushNotifications';
import { notifyNewCommunityPost } from '../lib/notificationService';
import { usePlanLimits, useSubscription } from "../hooks/useSubscription";
import { updateLastActive } from '../lib/activityTracker';
import { useTheme } from '../context/ThemeProvider';
import { TbDots } from 'react-icons/tb'
import { MdCheck } from 'react-icons/md'

type Props = NavigationProps<"CreateCommunityPost">;

const CreateCommunityPost = ({ navigation, route }: Props) => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const communityId =
    typeof router.query.communityId === "string" ? router.query.communityId : "";
  const communityName =
    typeof router.query.communityName === "string"
      ? router.query.communityName
      : "Community";
  const communityAvatar =
    typeof router.query.communityAvatar === "string"
      ? router.query.communityAvatar
      : "";
  

  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    duration?: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Subscription hooks for video duration limits
  const { limits, checks } = usePlanLimits();
  const { plan } = useSubscription();

  // Web fallback: no native video player hook in this migration state.
  const player = null;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setCurrentUser({ ...user, profile: profileData });
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const pickImages = async () => {
    try {
      // Don't allow images if video is selected
      if (selectedVideo) {
        window.alert("Please remove the video first to add images. You can post either images or a video.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...imageUris].slice(0, 5));
      }
    } catch (error) {
      console.error("Error picking images:", error);
      window.alert("Failed to pick images");
    }
  };

  const pickVideo = async () => {
    try {
      // Check if user has Basic or Premium subscription
      if (plan === "free") {
        if (window.confirm("Video posting is only available for Basic and Premium subscribers. Upgrade your subscription to post videos in communities.")) { router.push("/verrsa-subscription") }
        return;
      }

      // Don't allow video if images are selected
      if (selectedImages.length > 0) {
        window.alert("Please remove images first to add a video. You can post either images or a video.");
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        window.alert("Media library access is needed to select videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.7,
        videoMaxDuration: limits?.uploadTimeMinutes
          ? limits.uploadTimeMinutes * 60
          : 60, // Convert minutes to seconds based on plan
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationMinutes = asset.duration ? asset.duration / 60000 : 0;

        // Check duration against plan limits
        if (asset.duration && checks) {
          if (!checks.canUploadContent(durationMinutes)) {
            const message = checks.getUploadLimitMessage(durationMinutes);
            window.alert(message ||
                `Video duration (${Math.ceil(durationMinutes)} min) exceeds your ${plan} plan limit (${limits?.uploadTimeMinutes} min).`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Upgrade Plan",
                  onPress: () => router.push("/verrsa-subscription"),
                },
              ],
            );
            return;
          }
        }

        if (asset.type === "video") {
          setSelectedVideo({
            uri: asset.uri,
            duration: asset.duration ?? undefined,
            width: asset.width,
            height: asset.height,
          });
        } else {
          window.alert("Please select a video file only.");
        }
      }
    } catch (error) {
      console.error("Error picking video:", error);
      window.alert("Failed to pick video");
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string) => {
    try {
      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36)}.${fileExt}`;
      const filePath = `community-posts/${fileName}`;

      // For React Native, we need to read the file as ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("media-public")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media-public").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const uploadVideo = async (uri: string) => {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36)}.mp4`;
      const filePath = `community-posts/${fileName}`;

      // Read the video file as ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // Start progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 150);

      const { error: uploadError } = await supabase.storage
        .from("media-public")
        .upload(filePath, arrayBuffer, {
          contentType: "video/mp4",
          upsert: false,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media-public").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  };

  const createPost = async () => {
    if (!postContent.trim()) {
      window.alert("Please write something for your post");
      return;
    }

    if (!currentUser) {
      window.alert("You must be logged in to create a post");
      return;
    }

    setPosting(true);
    setUploadProgress(0);

    try {
      // Track user activity
      updateLastActive();

      // Upload images if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map((uri) => uploadImage(uri));
        imageUrls = await Promise.all(uploadPromises);
      }

      // Upload video if selected
      let videoUrl: string | null = null;
      if (selectedVideo) {
        videoUrl = await uploadVideo(selectedVideo.uri);
      }

      // Create the post
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            post_type: "community_post",
            community_id: communityId,
            user_id: currentUser.id,
            title: postTitle.trim() || null,
            content: postContent.trim(),
            images: imageUrls.length > 0 ? imageUrls : null,
            video_url: videoUrl,
            video_duration: selectedVideo?.duration || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Auto-moderate content
      if (data && data[0]) {
        await contentModerator.moderatePost(data[0].id, currentUser.id, {
          title: postTitle.trim() || "",
          description: postContent.trim(),
        });

        // Send notification to all users about the new community post
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", currentUser.id)
          .single();

        const creatorName =
          creatorProfile?.full_name || creatorProfile?.username || "A member";

        const postTitleText =
          postTitle.trim() || postContent.trim().substring(0, 50) + "...";

        // Send notification asynchronously (don't wait for it)
        sendNewPostNotification(
          creatorName,
          "community",
          postTitleText,
          data[0].id,
          communityId,
        ).catch((err) =>
          console.error("Failed to send new community post notification:", err),
        );

        // Notify all community members about the new post
        try {
          const { data: members } = await supabase
            .from("community_members")
            .select("user_id")
            .eq("community_id", communityId)
            .neq("user_id", currentUser.id);

          if (members && members.length > 0) {
            for (const member of members) {
              notifyNewCommunityPost(
                member.user_id,
                communityName,
                communityId,
                creatorName,
                postTitleText,
                data[0].id,
              ).catch(() => {});
            }
          }
        } catch (memberNotifErr) {
          console.error("Failed to notify community members:", memberNotifErr);
        }
      }

      window.alert("Your post has been created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      window.alert("Failed to create post. Please try again.");
    } finally {
      setPosting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{...(styles.header || {}), borderBottomColor: theme.border,
            backgroundColor: theme.background,}}
      >
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <TbDots />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>
          Create Post
        </span>
        <button
          style={{...(styles.postButton || {}), backgroundColor: theme.accent || "#00BFFF", ...(posting ? styles.postButtonDisabled : {})}}
          onClick={createPost}
          disabled={posting || !postContent.trim()}
        >
          {posting ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : (
            <span style={styles.postButtonText}>Post</span>
          )}
        </button>
      </div>

      <div style={{...(styles.content || {}), backgroundColor: theme.background, overflowY: "auto"}}
      >
        {/* Community Info */}
        <div
          style={{...(styles.communityInfo || {}), borderBottomColor: theme.border}}
        >
          <img
            src={
              communityAvatar
                ? { uri: communityAvatar }
                : "/assets/../assets/avatar.jpg"
            }
            style={styles.communityAvatar}
          />
          <div style={styles.communityDetails}>
            <span style={{...(styles.communityName || {}), color: theme.text}}>
              {communityName}
            </span>
            <span style={{...(styles.postingAs || {}), color: theme.secondaryText}}>
              Posting as{" "}
              {currentUser?.profile?.full_name ||
                currentUser?.profile?.username ||
                "User"}
            </span>
          </div>
        </div>

        {/* Post Title (Optional) */}
        <div style={styles.section}>
          <input
            style={{...(styles.titleInput || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
            placeholder="Post title (optional)"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            maxLength={200}
            placeholderTextColor={theme.secondaryText}
          />
        </div>

        {/* Post Content */}
        <div style={styles.section}>
          <input
            style={{...(styles.contentInput || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
            placeholder="What's on your mind?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            multiline
            
            maxLength={2000}
            placeholderTextColor={theme.secondaryText}
          />
          <span style={{...(styles.characterCount || {}), color: theme.secondaryText}}>
            {postContent.length}/2000 characters
          </span>
        </div>

        {/* Selected Images */}
        {selectedImages.length > 0 && (
          <div style={styles.section}>
            <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
              Selected Images
            </span>
            <div style={{overflowY: "auto", flex: 1}}>
              <div style={styles.imagesContainer}>
                {selectedImages.map((uri, index) => (
                  <div key={index} style={styles.imageWrapper}>
                    <img src={{ uri }} style={styles.selectedImage} />
                    <button
                      style={styles.removeImageButton}
                      onClick={() => removeImage(index)}
                    >
                      <MdCheck />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
      )}
        {/* Selected Video */}
        {selectedVideo && (
          <div style={styles.section}>
            <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
              Selected Video
            </span>
            <div style={styles.videoPreviewContainer}>
              {player && (
                <VideoView
                  player={player}
                  style={styles.videoPreview}
                  contentFit="cover"
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                />
              )}
              <button
                style={styles.removeVideoButton}
                onClick={() => setSelectedVideo(null)}
              >
                <MdCheck />
              </button>
              {selectedVideo.duration && (
                <div style={styles.videoDurationBadge}>
                  <span style={styles.videoDurationText}>
                    {Math.ceil(selectedVideo.duration / 60000)} min
                  </span>
                </div>
              )}
            </div>
            <span
              style={{...(styles.videoLimitText || {}), color: theme.secondaryText}}
            >
              Your {plan} plan allows videos up to{" "}
              {limits?.uploadTimeMinutes || 1} minutes
            </span>
          </div>
      )}
        {/* Upload Progress */}
        {posting && uploadProgress > 0 && (
          <div style={styles.progressContainer}>
            <span style={{...(styles.progressText || {}), color: theme.secondaryText}}>
              Uploading... {uploadProgress}%
            </span>
            <div
              style={{...(styles.progressBar || {}), backgroundColor: theme.border}}
            >
              <div
                style={{...(styles.progressFill || {}), width: `${uploadProgress}%`,
                    backgroundColor: theme.accent || "#00BFFF",}}
              />
            </div>
          </div>
      )}
        {/* Add Media Section */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Add to your post
          </span>
          <div style={styles.mediaOptions}>
            <button
              style={{...(styles.mediaOption || {}), backgroundColor: theme.cardBackground}}
              onClick={pickImages}
              disabled={selectedImages.length >= 5 || !!selectedVideo}
            >
              <MdCheck />
              <span
                style={{...(styles.mediaOptionText || {}), color: theme.text, ...((selectedImages.length >= 5 || selectedVideo) ? {
                    color: theme.border,
                  } : {})}}
              >
                Photos ({selectedImages.length}/5)
              </span>
            </button>
            <button
              style={{...(styles.mediaOption || {}), backgroundColor: theme.cardBackground}}
              onClick={pickVideo}
              disabled={!!selectedVideo || selectedImages.length > 0}
            >
              <IoVideocam />
              <div style={{ flex: 1 }}>
                <span
                  style={{...(styles.mediaOptionText || {}), color: theme.text, ...((selectedVideo || selectedImages.length > 0) ? {
                      color: theme.border,
                    } : {})}}
                >
                  Video {selectedVideo ? "(1/1)" : ""}
                </span>
                {plan === "free" && (
                  <span
                    style={{
                      fontSize: fontSize.xs,
                      color: theme.secondaryText,
                      marginTop: spacing.px,
                    }}
                  >
                    Basic/Premium only
                  </span>
                    )}
              </div>
              {plan !== "free" && (
                <MdCheck />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginRight: 80,
  },
  postButton: {
    backgroundColor: "#00BFFF",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl2,
    minWidth: 70,
    alignItems: "center",
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  communityInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  communityAvatar: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  communityDetails: {
    flex: 1,
  },
  communityName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#333",
  },
  postingAs: {
    fontSize: fontSize.md,
    color: "#666",
    marginTop: spacing.px,
  },
  section: {
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    marginBottom: spacing.md,
    color: "#333",
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: radius.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: "#f9f9f9",
  },
  contentInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: radius.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: "#f9f9f9",
    height: 120,
    textAlignVertical: "top",
  },
  characterCount: {
    textAlign: "right",
    color: "#999",
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  imagesContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  imageWrapper: {
    position: "relative",
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff4444",
    borderRadius: radius.lg,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaOptions: {
    flexDirection: "row",
    gap: spacing.base,
  },
  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#f0f0f0",
    borderRadius: radius.md,
    flex: 1,
  },
  mediaOptionText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: "#333",
  },
  loadingText: {
    marginTop: spacing.md,
    color: "#666",
    fontSize: fontSize.base,
  },
  videoPreviewContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  removeVideoButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 68, 68, 0.9)",
    borderRadius: radius.xl2,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.xs,
  },
  videoDurationText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  videoLimitText: {
    fontSize: fontSize.sm,
    color: "#666",
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  progressContainer: {
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  progressText: {
    fontSize: fontSize.md,
    color: "#666",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: radius.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00BFFF",
  },
};

export default CreateCommunityPost;
