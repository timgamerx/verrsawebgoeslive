// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import {
  IoArrowBack,
  IoImageOutline,
  IoMusicalNotesOutline,
  IoPause,
  IoPlay,
} from "react-icons/io5";
import { supabase } from "../components/supabase";
import { notifyFollowersOfNewPost } from "../lib/postHelpers";

// Podcast limits by plan
const PODCAST_DURATION_LIMITS = {
  free: 10,
  basic: 45,
  premium: 180, // 3 hours
};

const EPISODE_COUNT_LIMITS = {
  free: 1,
  basic: 5,
  premium: Infinity,
};

// Direct Supabase API functions
const createPodcast = async (podcastData) => {
  try {
    console.log("Attempting to create podcast with data:", podcastData);

    const { data, error } = await supabase
      .from("posts")
      .insert([podcastData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating podcast:", error);
      throw error;
    }

    console.log("Podcast created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating podcast:", error);
    return null;
  }
};

// notifyFollowersOfNewPost imported from ./lib/postHelpers

// Utility functions for Supabase Storage
const uploadFileToSupabase = async (file, type, isPrivate = false, userId) => {
  try {
    if (!userId) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${Date.now()}-${file.name || `file.${fileExt}`}`;
    const folderPath =
      type === "audio"
        ? isPrivate
          ? `premium/${userId}`
          : `podcast-audio/${userId}`
        : isPrivate
          ? `premium-covers/${userId}`
          : `covers/${userId}`;
    const filePath = `${folderPath}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(isPrivate ? "media-private" : "media-public")
      .upload(filePath, file, {
        contentType: type === "audio" ? `audio/${fileExt}` : `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    if (isPrivate) {
      return data.path;
    } else {
      const { data: urlData } = supabase.storage
        .from("media-public")
        .getPublicUrl(data.path);
      return urlData.publicUrl;
    }
  } catch (error) {
    console.error(`Error uploading ${type}:`, error);
    return null;
  }
};

const getSignedUrl = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from("media-private")
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
};

const deleteFile = async (bucket, filePath) => {
  try {
    const { data, error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    console.log("File deleted:", data);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

const getMediaUrl = async (bucket, filePath, isPrivate = false) => {
  if (!filePath) return null;

  try {
    if (isPrivate) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60); // 1 hour
      return error ? null : data.signedUrl;
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    }
  } catch (error) {
    console.error("Error getting media URL:", error);
    return null;
  }
};

const CreatePodcast = () => {
  const [title, setTitle] = useState("My First Podcast");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [plan, setPlan] = useState("free"); // Mock plan state

  const audioRefs = useRef([]);
  const coverImageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const router = useRouter();

  const categories = [
    "Technology",
    "Business",
    "Education",
    "Entertainment",
    "Health",
    "News",
    "Sports",
    "Comedy",
    "Music",
    "Science",
    "Other",
  ];

  useEffect(() => {
    // Fetch user's subscription plan
    const fetchPlan = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Fetch subscription from your database
          const { data } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", user.id)
            .single();
          if (data) setPlan(data.plan || "free");
        }
      } catch (error) {
        console.error("Error fetching plan:", error);
      }
    };
    fetchPlan();
  }, []);

  const pickCoverImage = () => {
    coverImageInputRef.current?.click();
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setCoverImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const pickAudio = () => {
    audioInputRef.current?.click();
  };

  const handleAudioChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Enforce per-plan episode picker limits
    const limit = plan === "premium" ? Infinity : plan === "basic" ? 5 : 1;
    
    if (audioFiles.length >= limit) {
      const message =
        plan === "free"
          ? "Free plan allows 1 episode per post. Upgrade to Basic (up to 5 per post) or Premium (unlimited per post)."
          : "Basic plan allows up to 5 episodes per post. Upgrade to Premium for unlimited episodes per post.";

      if (window.confirm(message + "\n\nWould you like to upgrade?")) {
        router.push("/subscription");
      }
      return;
    }

    // Check file types
    const validFiles = files.filter((file) => file.type.startsWith("audio/"));
    
    if (validFiles.length === 0) {
      alert("Please select valid audio files");
      return;
    }

    const remainingSlots = limit === Infinity ? Infinity : limit - audioFiles.length;
    const filesToAdd = limit === Infinity ? validFiles : validFiles.slice(0, remainingSlots);

    setAudioFiles((prev) => [...prev, ...filesToAdd]);
  };

  const playPauseAudio = (index) => {
    const audioElement = audioRefs.current[index];
    if (!audioElement) return;

    if (currentlyPlaying === index) {
      audioElement.pause();
      setCurrentlyPlaying(null);
    } else {
      // Pause all other audio
      audioRefs.current.forEach((audio, idx) => {
        if (audio && idx !== index) {
          audio.pause();
        }
      });

      audioElement.play();
      setCurrentlyPlaying(index);
    }
  };

  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      
      audio.addEventListener("loadedmetadata", () => {
        const duration = Math.floor(audio.duration);
        URL.revokeObjectURL(audio.src);
        resolve(duration);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(audio.src);
        resolve(0);
      });
    });
  };

  const validatePodcast = () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return false;
    }
    if (!description.trim()) {
      alert("Please add a description");
      return false;
    }
    if (!audioFiles || audioFiles.length === 0) {
      alert("Please select at least one audio file");
      return false;
    }
    return true;
  };

  const publishPodcast = async () => {
    if (!validatePodcast()) return;

    try {
      setPublishing(true);
      setUploading(true);

      // Get current user and verify authentication
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User authentication error:", userError);
        alert("You must be logged in to create a podcast");
        return;
      }

      // Upload cover image if selected
      let coverImageUrl = null;
      if (coverImage) {
        coverImageUrl = await uploadFileToSupabase(coverImage, "image", false, user.id);
      }

      const hardLimit = plan === "premium" ? Infinity : plan === "basic" ? 5 : 1;
      const filesToUpload = hardLimit === Infinity ? audioFiles : audioFiles.slice(0, hardLimit);

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Upload all audio files and collect their data
      const episodeData = [];
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const audioUrl = await uploadFileToSupabase(file, "audio", false, user.id);
        
        if (!audioUrl) {
          alert(`Failed to upload audio for episode ${i + 1}`);
          continue;
        }

        const duration = await getAudioDuration(file);
        const durationMinutes = Math.ceil((duration || 0) / 60);
        const durationLimit = PODCAST_DURATION_LIMITS[plan] ?? 10;
        
        if (durationMinutes > durationLimit) {
          const message =
            plan === "free"
              ? "Free users can upload podcasts up to 10 minutes. Upgrade to Basic (45 minutes) or Premium (2–3 hours) to publish longer episodes."
              : plan === "basic"
                ? "Basic users can upload podcasts up to 45 minutes. Upgrade to Premium (2–3 hours) to publish longer episodes."
                : "Your episode exceeds the maximum supported length.";
          
          if (window.confirm(message + "\n\nSkip this episode?")) {
            continue;
          } else {
            router.push("/subscription");
            return;
          }
        }

        episodeData.push({
          audio_url: audioUrl,
          duration: duration || 0,
          episode_number: i + 1,
        });
      }

      if (episodeData.length === 0) {
        alert("No episodes were successfully uploaded.");
        return;
      }

      // Create ONE podcast post with all episodes
      const podcastData = {
        title: title.trim() || "My First Podcast",
        description: description.trim(),
        audio_urls: episodeData.map((ep) => ep.audio_url),
        durations: episodeData.map((ep) => ep.duration),
        episode_count: episodeData.length,
        cover_image_url: coverImageUrl ?? undefined,
        category: category || "Other",
        tags: tagsArray,
        user_id: user.id,
        published: true,
        post_type: "podcast",
      };

      console.log("Creating podcast with data:", podcastData);
      const newPodcast = await createPodcast(podcastData);

      if (newPodcast) {
        await notifyFollowersOfNewPost(user.id, "podcast", newPodcast.id, title.trim());

        const message =
          episodeData.length > 1
            ? `Published podcast with ${episodeData.length} episodes successfully!`
            : "Your podcast has been published successfully.";
        
        alert(message);
        router.back();
      } else {
        alert("Failed to publish podcast. Please try again.");
      }
    } catch (error) {
      console.error("Error publishing podcast:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setPublishing(false);
      setUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <IoArrowBack size={24} color="#333" />
        </button>
        <h1 style={styles.headerTitle}>Create Podcast</h1>
        <div style={styles.placeholder} />
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Cover Image */}
        <input
          ref={coverImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverImageChange}
          style={{ display: "none" }}
        />
        
        <div onClick={pickCoverImage} style={styles.imageContainer}>
          {coverImagePreview ? (
            <img src={coverImagePreview} alt="Cover" style={styles.coverImage} />
          ) : (
            <div style={styles.imagePlaceholder}>
              <IoImageOutline size={40} color="#ccc" />
              <span style={styles.imagePlaceholderText}>Add Cover Image</span>
            </div>
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          style={styles.titleInput}
          placeholder="Podcast Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />

        {/* Description */}
        <textarea
          style={styles.descriptionInput}
          placeholder="Podcast Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={5}
        />

        {/* Audio Files */}
        <div style={styles.audioSection}>
          <label style={styles.label}>Audio Files (Episodes)</label>
          
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleAudioChange}
            style={{ display: "none" }}
          />
          
          <button onClick={pickAudio} style={styles.audioSelector}>
            <IoMusicalNotesOutline size={24} color="#666" />
            <span style={styles.audioText}>
              {audioFiles.length > 0 ? `${audioFiles.length} selected` : "Select Audio File"}
            </span>
          </button>

          {audioFiles.length > 0 && (
            <div style={styles.audioList}>
              {audioFiles.map((file, idx) => (
                <div key={idx} style={styles.audioControls}>
                  <button
                    onClick={() => playPauseAudio(idx)}
                    style={styles.playButton}
                  >
                    {currentlyPlaying === idx ? (
                      <IoPause size={20} color="#fff" />
                    ) : (
                      <IoPlay size={20} color="#fff" />
                    )}
                  </button>
                  <span style={styles.audioFileName}>
                    Episode {idx + 1}: {file.name}
                  </span>
                  <audio
                    ref={(el) => (audioRefs.current[idx] = el)}
                    src={URL.createObjectURL(file)}
                    onEnded={() => setCurrentlyPlaying(null)}
                    style={{ display: "none" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category */}
        <div style={styles.categoryContainer}>
          <label style={styles.label}>Category</label>
          <div style={styles.categoryScrollContainer}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  ...styles.categoryChip,
                  ...(category === cat ? styles.categoryChipSelected : {}),
                }}
              >
                <span
                  style={{
                    ...styles.categoryText,
                    ...(category === cat ? styles.categoryTextSelected : {}),
                  }}
                >
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <input
          type="text"
          style={styles.tagsInput}
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      {/* Publish Button */}
      <div style={styles.publishContainer}>
        <button
          style={{
            ...styles.publishButton,
            ...(!title.trim() || !description.trim() || audioFiles.length === 0 || publishing
              ? styles.publishButtonDisabled
              : {}),
          }}
          onClick={publishPodcast}
          disabled={!title.trim() || !description.trim() || audioFiles.length === 0 || publishing}
        >
          {publishing ? (
            <div style={styles.publishingContainer}>
              <div style={styles.spinner}></div>
              <span style={styles.publishingText}>
                {uploading ? "Uploading..." : "Publishing..."}
              </span>
            </div>
          ) : (
            <span style={styles.publishButtonText}>Publish Podcast</span>
          )}
        </button>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#fff",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    paddingTop: "50px",
    borderBottom: "1px solid #f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#333",
    margin: 0,
  },
  placeholder: {
    width: "24px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "0 24px",
    paddingBottom: "100px",
  },
  imageContainer: {
    marginTop: "24px",
    marginBottom: "24px",
    alignSelf: "center",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
  },
  coverImage: {
    width: "200px",
    height: "200px",
    borderRadius: "12px",
    objectFit: "cover",
  },
  imagePlaceholder: {
    width: "200px",
    height: "200px",
    backgroundColor: "#f8f8f8",
    borderRadius: "12px",
    border: "2px dashed #e0e0e0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: "16px",
    color: "#ccc",
    fontSize: "14px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  titleInput: {
    fontSize: "24px",
    fontWeight: "600",
    backgroundColor: "#fff",
    color: "#333",
    marginBottom: "16px",
    paddingTop: "12px",
    paddingBottom: "12px",
    border: "none",
    borderBottom: "1px solid #e0e0e0",
    outline: "none",
    width: "100%",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  descriptionInput: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "12px",
    border: "none",
    outline: "none",
    width: "100%",
    resize: "vertical",
    fontFamily: "'Instrument Sans', sans-serif",
    minHeight: "100px",
  },
  audioSection: {
    marginBottom: "24px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "12px",
    display: "block",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  audioSelector: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "12px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    width: "100%",
  },
  audioText: {
    marginLeft: "16px",
    fontSize: "14px",
    color: "#666",
    flex: 1,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  audioList: {
    marginTop: "16px",
  },
  audioControls: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: "12px",
    padding: "12px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
  },
  playButton: {
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    backgroundColor: "#00bfff",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "16px",
    cursor: "pointer",
  },
  audioFileName: {
    flex: 1,
    fontSize: "14px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  categoryContainer: {
    marginBottom: "24px",
  },
  categoryScrollContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "12px",
    overflowX: "auto",
    whiteSpace: "nowrap",
    paddingBottom: "8px",
  },
  categoryChip: {
    padding: "8px 16px",
    backgroundColor: "#f0f0f0",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  categoryChipSelected: {
    backgroundColor: "#00bfff",
  },
  categoryText: {
    fontSize: "14px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  categoryTextSelected: {
    color: "#fff",
  },
  tagsInput: {
    fontSize: "14px",
    backgroundColor: "#fff",
    color: "#333",
    padding: "16px",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    marginBottom: "24px",
    width: "100%",
    outline: "none",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  publishContainer: {
    padding: "24px",
    borderTop: "1px solid #f0f0f0",
    backgroundColor: "#fff",
  },
  publishButton: {
    backgroundColor: "#00bfff",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    width: "100%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  publishButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  publishButtonText: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  publishingContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  publishingText: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    marginLeft: "16px",
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
if (typeof document !== "undefined" && !document.getElementById("spinner-animation")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "spinner-animation";
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CreatePodcast;
