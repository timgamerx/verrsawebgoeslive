import React, { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/router';
import {
  IoArrowBack,
  IoClose,
  IoVideocamOutline,
  IoFolderOutline,
  IoPlayCircle,
  IoPauseCircle,
} from "react-icons/io5";
import { supabase } from "../components/supabase";
import { notifyFollowersOfNewPost, contentModerator } from "../lib/postHelpers";

// Supabase storage functions
async function uploadPublicVideo(file, fileName) {
  try {
    const filePath = `videos/${fileName}`;

    const { data, error } = await supabase.storage
      .from("media-public")
      .upload(filePath, file, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("media-public")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

async function uploadPrivateVideo(file, fileName) {
  try {
    const filePath = `premium/${fileName}`;

    const { data, error } = await supabase.storage
      .from("media-private")
      .upload(filePath, file, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    return data.path;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

async function getSignedUrl(filePath) {
  const { data, error } = await supabase.storage
    .from("media-private")
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

async function getMediaUrl(bucket, filePath, isPrivate = false) {
  if (!filePath) return null;

  if (isPrivate) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60); // 1 hour
    return error ? null : data.signedUrl;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}

// notifyFollowersOfNewPost and contentModerator imported from ./lib/postHelpers

export default function PostVideo() {
  const router = useRouter();
  const [explicit, setExplicit] = useState(false);
  const [video, setVideo] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [plan, setPlan] = useState("free"); // Mock plan state
  const [uploadTimeLimit, setUploadTimeLimit] = useState(1); // minutes

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch user's subscription plan
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", user.id)
            .single();
          if (data) {
            setPlan(data.plan || "free");
            // Set upload time limits based on plan
            const limits = {
              free: 1,
              basic: 5,
              premium: 60,
            };
            setUploadTimeLimit(limits[data.plan] || 1);
          }
        }
      } catch (error) {
        console.error("Error fetching plan:", error);
      }
    };
    fetchPlan();
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const pickVideo = () => {
    fileInputRef.current?.click();
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file");
      return;
    }

    // Check file size (optional, e.g., 500MB max)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      alert("Video file is too large. Maximum size is 500MB");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewUrl);

    // Get video duration
    const videoElement = document.createElement("video");
    videoElement.preload = "metadata";
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      const duration = videoElement.duration * 1000; // Convert to milliseconds
      console.log("Video duration:", duration);

      setVideo({
        file,
        uri: previewUrl,
        duration,
      });
    };
    videoElement.src = previewUrl;

    setIsVideoPlaying(false);
  };

  const formatDuration = (duration) => {
    const seconds = Math.round(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
      : `${seconds}s`;
  };

  const validateVideo = () => {
    if (!title.trim()) {
      alert("Please enter a title for your video.");
      return false;
    }

    if (!video) {
      alert("Please select a video.");
      return false;
    }

    if (title.length > 500) {
      alert("Title must be less than 500 characters.");
      return false;
    }

    // Check video duration based on subscription plan
    if (video.duration) {
      const durationMinutes = video.duration / (1000 * 60);
      if (durationMinutes > uploadTimeLimit) {
        const message =
          plan === "free"
            ? `Free users can upload videos up to 1 minute. Your video is ${durationMinutes.toFixed(1)} minutes. Upgrade to Basic (5 min) or Premium (60 min) for longer videos.`
            : plan === "basic"
              ? `Basic users can upload videos up to 5 minutes. Your video is ${durationMinutes.toFixed(1)} minutes. Upgrade to Premium (60 min) for longer videos.`
              : "Video exceeds your plan's duration limit.";

        if (window.confirm(message + "\n\nWould you like to upgrade?")) {
          router.push("/subscription");
        }
        return false;
      }
    }

    return true;
  };

  const uploadVideo = async () => {
    if (!video) return null;

    try {
      const fileName = `${Date.now()}-upload.mp4`;

      // Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User must be authenticated to upload videos");
      }

      // Start progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 150);

      let videoUrl = null;

      if (explicit) {
        // Upload to private bucket
        const { data, error } = await supabase.storage
          .from("media-private")
          .upload(`premium/${fileName}`, video.file, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (error) {
          clearInterval(progressInterval);
          throw error;
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        videoUrl = await getSignedUrl(data.path);
      } else {
        // Upload to public bucket
        const filePath = `videos/${fileName}`;
        const { data, error } = await supabase.storage
          .from("media-public")
          .upload(filePath, video.file, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (error) {
          clearInterval(progressInterval);
          throw error;
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("media-public")
          .getPublicUrl(data.path);

        videoUrl = urlData.publicUrl;
      }

      return videoUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const saveVideoToDatabase = async (videoPost) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            post_type: "video",
            id: videoPost.id,
            title: videoPost.title,
            video_url: videoPost.videoUrl,
            thumbnail_url: videoPost.thumbnailUrl,
            duration: Math.round(videoPost.duration),
            user_id: videoPost.userId,
            username: videoPost.username,
            user_avatar: videoPost.userAvatar,
            created_at: videoPost.timestamp,
            like_count: videoPost.likes,
            comment_count: videoPost.comments,
            share_count: videoPost.shares,
            view_count: videoPost.views,
            width: videoPost.width || 1080,
            height: videoPost.height || 1920,
          },
        ])
        .select();

      if (error) {
        console.error("Database error:", error);
        throw new Error("Failed to save video to database");
      }

      return data;
    } catch (error) {
      console.error("Save to database error:", error);
      throw error;
    }
  };

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Authentication error:", authError);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name, email")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return {
          id: user.id,
          username: user.email?.split("@")[0] || "user",
          avatar_url: user.user_metadata?.avatar_url || undefined,
          full_name: user.user_metadata?.full_name || undefined,
          email: user.email || undefined,
        };
      }

      return profile;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  const handlePublish = async () => {
    if (!validateVideo()) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        alert("You must be logged in to post a video");
        setLoading(false);
        return;
      }

      // Upload video to Supabase storage
      const videoUrl = await uploadVideo();

      if (!videoUrl) {
        alert("Failed to upload video");
        return;
      }

      // Standard vertical dimensions
      const standardWidth = 1080;
      const standardHeight = 1920;

      const videoPost = {
        id: crypto.randomUUID(),
        title: title.trim(),
        videoUrl,
        duration: Math.round(video?.duration || 0),
        explicit,
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar_url || undefined,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        width: standardWidth,
        height: standardHeight,
      };

      // Save to database and moderate in background
      Promise.all([
        saveVideoToDatabase(videoPost),
        contentModerator.moderatePost(videoPost.id, currentUser.id, {
          title: title.trim(),
          description: title.trim(),
        }),
      ]).catch((error) => {
        console.error("Background operations error:", error);
      });

      // Notify followers
      await notifyFollowersOfNewPost(
        currentUser.id,
        "video",
        videoPost.id,
        title.trim()
      );

      // Detect @mentions
      try {
        const mentionMatches = title.match(/@([a-zA-Z0-9_]+)/g);
        if (mentionMatches) {
          const authorName = currentUser.full_name || "Someone";
          for (const mention of mentionMatches) {
            const username = mention.slice(1);
            const { data: mentionedUser } = await supabase
              .from("profiles")
              .select("id")
              .eq("username", username)
              .single();
            if (mentionedUser && mentionedUser.id !== currentUser.id) {
              // Notify mentioned user (implement your notification logic)
              console.log("Notify mentioned user:", mentionedUser.id);
            }
          }
        }
      } catch (_) {}

      alert("Success! Your video has been published and will appear in your feed, videos, and profile!");
      
      // Reset form
      setTitle("");
      setVideo(null);
      setVideoPreviewUrl(null);
      setExplicit(false);
      router.push("/home");
    } catch (error) {
      alert("Failed to publish video. Please try again.");
      console.error("Publish error:", error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const removeVideo = () => {
    if (window.confirm("Are you sure you want to remove this video?")) {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideo(null);
      setVideoPreviewUrl(null);
      setIsVideoPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const renderVideoPreview = () => {
    if (!video) {
      return (
        <div style={styles.emptyUpload}>
          <IoVideocamOutline size={30} color="#666" />
          <span style={styles.uploadText}>Tap to select video</span>
          <span style={styles.uploadSubText}>Max {uploadTimeLimit} minutes</span>
        </div>
      );
    }

    return (
      <div style={styles.videoContainer}>
        <video
          ref={videoRef}
          src={videoPreviewUrl}
          style={styles.videoPreview}
          onEnded={() => setIsVideoPlaying(false)}
        />
        <div style={styles.videoOverlay}>
          <button style={styles.playButton} onClick={togglePlayPause}>
            {isVideoPlaying ? (
              <IoPauseCircle size={50} color="#fff" />
            ) : (
              <IoPlayCircle size={50} color="#fff" />
            )}
          </button>
        </div>
        {video.duration ? (
          <div style={styles.durationBadge}>
            <span style={styles.durationBadgeText}>
              {formatDuration(video.duration)}
            </span>
          </div>
        ) : (
          <div style={styles.durationBadge}>
            <span style={styles.durationBadgeText}>Loading...</span>
          </div>
        )}
        <button style={styles.removeButton} onClick={removeVideo}>
          <IoClose size={20} color="#fff" />
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => router.back()}>
        <IoArrowBack size={24} color="#333" />
      </button>

      <div style={styles.scrollContainer}>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter Video Title/Description..."
          style={styles.input}
          maxLength={500}
          rows={3}
        />
        <p style={styles.characterCount}>{title.length}/500</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{ display: "none" }}
        />

        <div style={styles.uploadBox} onClick={!video ? pickVideo : undefined}>
          {renderVideoPreview()}
        </div>

        {/* Plan Upload Limit Info */}
        <div style={styles.planInfoContainer}>
          <div style={styles.planInfoHeader}>
            <span style={styles.planInfoText}>
              Upload Limit: {uploadTimeLimit} minutes per video
            </span>
            {plan === "free" && (
              <button
                style={styles.upgradeButton}
                onClick={() => router.push("/subscription")}
              >
                <span style={styles.upgradeButtonText}>Upgrade</span>
              </button>
            )}
          </div>
          {plan === "free" && (
            <p style={styles.planHintText}>
              Upgrade to Basic (5 min) or Premium (60 min) for longer videos
            </p>
          )}
        </div>

        {loading && (
          <div style={styles.progressContainer}>
            <p style={styles.progressText}>
              Uploading video... {uploadProgress}%
            </p>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        )}

        <div style={styles.checkboxRow}>
          <div>
            <p style={styles.checkboxLabel}>Explicit Content?</p>
            <p style={styles.checkboxSubLabel}>
              Does your video have sensitive contents?
            </p>
          </div>
          <input
            type="checkbox"
            checked={explicit}
            onChange={(e) => setExplicit(e.target.checked)}
            style={styles.customCheckbox}
          />
        </div>

        <div style={styles.uploadRow}>
          <div style={{ width: 60 }} />
          <button
            style={styles.circleButton}
            onClick={() => alert("Camera recording is not available on web")}
          >
            <IoVideocamOutline size={32} color="#00CFFF" />
          </button>
          <button onClick={pickVideo} style={styles.galleryButton}>
            <IoFolderOutline size={24} color="#00CFFF" />
            <span style={styles.galleryText}>Gallery</span>
          </button>
        </div>

        <button
          style={{
            ...styles.publishButton,
            ...(loading ? styles.publishButtonDisabled : {}),
          }}
          onClick={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <div style={styles.spinner}></div>
          ) : (
            <span style={styles.publishText}>Publish Video</span>
          )}
        </button>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: "24px",
    backgroundColor: "#fff",
    minHeight: "100vh",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  backButton: {
    marginTop: "42px",
    marginBottom: "32px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
  },
  scrollContainer: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  input: {
    borderWidth: "1.2px",
    borderStyle: "solid",
    borderColor: "#d6f0ff",
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "16px",
    fontSize: "24px",
    color: "#000",
    marginBottom: "8px",
    width: "100%",
    resize: "vertical",
    fontFamily: "'Instrument Sans', sans-serif",
    outline: "none",
  },
  characterCount: {
    textAlign: "right",
    color: "#666",
    fontSize: "12px",
    marginBottom: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  uploadBox: {
    backgroundColor: "#c6f2ff",
    borderRadius: "24px",
    height: "330px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "24px",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  emptyUpload: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  uploadText: {
    fontSize: "18px",
    color: "#666",
    marginTop: "3px",
    fontWeight: "400",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  uploadSubText: {
    fontSize: "14px",
    color: "#999",
    marginTop: "8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "24px",
  },
  videoOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: "12px",
    width: "30px",
    height: "30px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
    zIndex: 10,
  },
  durationBadge: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "8px 16px",
    borderRadius: "8px",
  },
  durationBadgeText: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  progressContainer: {
    marginBottom: "24px",
  },
  progressText: {
    textAlign: "center",
    color: "#666",
    marginBottom: "8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  progressBar: {
    height: "4px",
    backgroundColor: "#e0e0e0",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00CFFF",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  checkboxRow: {
    display: "flex",
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  checkboxLabel: {
    fontWeight: "400",
    fontSize: "18px",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  checkboxSubLabel: {
    color: "#666",
    fontSize: "14px",
    margin: 0,
    marginTop: "4px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  customCheckbox: {
    width: "24px",
      backgroundColor: "#fff",
    height: "24px",
    cursor: "pointer",
    accentColor: "#00CFFF",
  },
  uploadRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "24px",
    paddingLeft: "24px",
    paddingRight: "24px",
  },
  circleButton: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    border: "2px solid #00CFFF",
    background: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  galleryButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #00CFFF",
    background: "none",
    cursor: "pointer",
  },
  galleryText: {
    color: "#00CFFF",
    fontSize: "12px",
    marginTop: "8px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  publishButton: {
    backgroundColor: "#00CFFF",
    padding: "16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "32px",
    border: "none",
    cursor: "pointer",
    width: "100%",
  },
  publishButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  publishText: {
    color: "#fff",
    fontWeight: "400",
    fontSize: "24px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  planInfoContainer: {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "16px",
    borderLeft: "3px solid #00CFFF",
  },
  planInfoHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planInfoText: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  planHintText: {
    fontSize: "12px",
    color: "#888",
    marginTop: "8px",
    fontStyle: "italic",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  upgradeButton: {
    backgroundColor: "#00CFFF",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  spinner: {
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    animation: "spin 1s linear infinite",
  },
};

// Add CSS animation for spinner (if not already added)
if (typeof document !== "undefined" && !document.getElementById("spinner-animation-postvideo")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "spinner-animation-postvideo";
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
