// @ts-nocheck
'use client';


import React, { useState, useRef } from "react";
import { useRouter } from 'next/router';
import { IoClose, IoImageOutline, IoCloseCircle } from "react-icons/io5";
import { supabase } from "../components/supabase";
import { notifyFollowersOfNewPost, contentModerator, updateLastActive, sendNewPostNotification } from "../lib/postHelpers";

// Upload image utility
async function uploadPublicFile(file, userId) {
  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${Date.now()}-verse-image.${fileExt}`;
    const filePath = `verse-images/${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("media-public")
      .upload(filePath, file, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error || !data) {
      console.error("Upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("media-public")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    return null;
  }
}

// contentModerator, updateLastActive, notifyFollowersOfNewPost, sendNewPostNotification
// imported from ./lib/postHelpers

const CreateVerse = () => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const MAX_CHARS = 280; // Character limit like Twitter

  const pickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      setImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);

      // Get current user for path organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Use the uploadPublicFile function
      const publicUrl = await uploadPublicFile(file, user.id);

      if (!publicUrl) {
        throw new Error("Failed to upload image");
      }

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateVerse = () => {
    if (!content.trim()) {
      alert("Please write something to verse");
      return false;
    }
    if (content.trim().length > MAX_CHARS) {
      alert(`Verse must be ${MAX_CHARS} characters or less`);
      return false;
    }
    return true;
  };

  const publishVerse = async () => {
    if (!validateVerse()) return;

    try {
      setPublishing(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in to post a verse");
        return;
      }

      // Upload image if exists
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      // Create verse in database
      const { data: newVerse, error } = await supabase
        .from("posts")
        .insert({
          post_type: "verse",
          user_id: user.id,
          content: content.trim(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating verse:", error);
        throw error;
      }

      if (newVerse) {
        // Auto-moderate content
        await contentModerator.moderatePost(newVerse.id, user.id, {
          title: content.substring(0, 50),
          description: content,
        });

        // Update user activity
        await updateLastActive();

        // Notify followers about the new verse
        await notifyFollowersOfNewPost(
          user.id,
          "verse",
          newVerse.id,
          content.substring(0, 50) || "New verse"
        );

        // Send push notification to followers
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", user.id)
          .single();

        const creatorName =
          profileData?.full_name || profileData?.username || "Someone";
        await sendNewPostNotification(
          creatorName,
          "verse",
          content.substring(0, 50) || "New verse",
          newVerse.id
        );

        alert("Success! Your verse has been posted successfully.");
        router.back();
      }
    } catch (error) {
      console.error("Error publishing verse:", error);

      let errorMessage = "Something went wrong. Please try again.";
      if (error?.message?.includes("authenticated")) {
        errorMessage =
          "You must be logged in to post verses. Please log in and try again.";
      }

      alert(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.headerButton}>
          <IoClose size={28} color="#333" />
        </button>
        <h1 style={styles.headerTitle}>Create Verse</h1>
        <button
          onClick={publishVerse}
          disabled={publishing || uploading || !content.trim() || isOverLimit}
          style={{
            ...styles.publishButton,
            ...(publishing || uploading || !content.trim() || isOverLimit
              ? styles.publishButtonDisabled
              : {}),
          }}
        >
          {publishing ? (
            <div style={styles.spinner}></div>
          ) : (
            <span style={styles.publishButtonText}>Post</span>
          )}
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.contentContainer}>
          {/* Verse Input */}
          <textarea
            style={styles.verseInput}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHARS + 50}
            autoFocus
            rows={6}
          />

          {/* Character Count */}
          <div style={styles.charCountContainer}>
            <span
              style={{
                ...styles.charCount,
                color: isOverLimit
                  ? "#FF3B30"
                  : charsRemaining < 20
                    ? "#FF9500"
                    : "#999",
              }}
            >
              {charsRemaining} characters remaining
            </span>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div style={styles.imageContainer}>
              <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
              <button style={styles.removeImageButton} onClick={removeImage}>
                <IoCloseCircle size={30} color="#FF3B30" />
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {/* Image Upload Button */}
          {!imagePreview && (
            <button
              style={styles.imageButton}
              onClick={pickImage}
              disabled={uploading}
            >
              <IoImageOutline size={24} color="#00BFFF" />
              <span style={styles.imageButtonText}>Add Image (Optional)</span>
            </button>
          )}

          {/* Tips */}
          <div style={styles.tipsContainer}>
            <p style={styles.tipsTitle}>💡 Tips for a great verse:</p>
            <p style={styles.tipText}>• Keep it concise and engaging</p>
            <p style={styles.tipText}>• Share your unique perspective</p>
            <p style={styles.tipText}>• Use hashtags to reach more people</p>
            <p style={styles.tipText}>
              • Images are optional but can boost engagement
            </p>
          </div>
        </div>
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
    padding: "16px",
    paddingTop: "50px",
    borderBottom: "1px solid #f0f0f0",
  },
  headerButton: {
    padding: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#333",
    margin: 0,
  },
  publishButton: {
    backgroundColor: "#00BFFF",
    paddingLeft: "24px",
    paddingRight: "24px",
    paddingTop: "8px",
    paddingBottom: "8px",
    borderRadius: "20px",
    minWidth: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
  },
  publishButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
    cursor: "not-allowed",
  },
  publishButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
  contentContainer: {
    padding: "16px",
  },
  verseInput: {
    fontSize: "14px",
    lineHeight: "24px",
    backgroundColor: "#fff",
    color: "#333",
    minHeight: "120px",
    padding: "16px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    marginBottom: "8px",
    width: "100%",
    resize: "vertical",
    fontFamily: "'Instrument Sans', sans-serif",
    outline: "none",
  },
  charCountContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginBottom: "16px",
  },
  charCount: {
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  imageContainer: {
    marginBottom: "16px",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "200px",
    borderRadius: "12px",
    objectFit: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageButton: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    borderRadius: "12px",
    border: "2px dashed #e0e0e0",
    backgroundColor: "#f8f8f8",
    marginBottom: "32px",
    cursor: "pointer",
  },
  imageButtonText: {
    marginLeft: "8px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  tipsContainer: {
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "rgba(0, 191, 255, 0.05)",
  },
  tipsTitle: {
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "8px",
    color: "#333",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  tipText: {
    fontSize: "13px",
    marginBottom: "8px",
    lineHeight: "20px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  spinner: {
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    width: "16px",
    height: "16px",
    animation: "spin 1s linear infinite",
  },
};

// Add CSS animation for spinner (if not already added)
if (typeof document !== "undefined" && !document.getElementById("spinner-animation-verse")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "spinner-animation-verse";
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CreateVerse;
