'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/router';
import { IoArrowBack, IoImageOutline } from "react-icons/io5";
import { supabase } from "../components/supabase";
import { notifyFollowersOfNewPost, contentModerator } from "../lib/postHelpers";

// Utility functions for Supabase Storage
async function uploadPublicFile(file, userId) {
  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${Date.now()}-cover.${fileExt}`;
    const filePath = `covers/${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("media-public")
      .upload(filePath, file, {
        contentType: file.type,
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

async function uploadPrivateFile(file) {
  const { data, error } = await supabase.storage
    .from("media-private")
    .upload(`premium/${Date.now()}-${file.name}`, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error || !data) {
    console.error("Upload error:", error);
    return null;
  }

  return data.path;
}

async function getSignedUrl(filePath) {
  const { data, error } = await supabase.storage
    .from("media-private")
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function deleteFile(bucket, filePath) {
  const { data, error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    console.error("Delete error:", error);
    return false;
  }

  console.log("File deleted:", data);
  return true;
}

async function updateFile(bucket, oldPath, newFile) {
  await deleteFile(bucket, oldPath);

  const { data, error } = await supabase.storage.from(bucket).upload(oldPath, newFile, {
    contentType: newFile.type,
    upsert: true,
  });

  if (error) {
    console.error("Update error:", error);
    return null;
  }

  return data?.path ?? null;
}

async function getMediaUrl(bucket, filePath, isPrivate = false) {
  if (!filePath) return null;

  if (isPrivate) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 60);
    return error ? null : data?.signedUrl ?? null;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}

// Mock API functions (replace with actual implementations)
async function createArticle(articleData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.from("posts").insert([
      {
        ...articleData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        post_type: "article",
      },
    ]).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating article:", error);
    throw error;
  }
}

// notifyFollowersOfNewPost and contentModerator imported from ./lib/postHelpers

const WriteArticle = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  const contentInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const categories = [
    "Technology",
    "Business",
    "Health",
    "Lifestyle",
    "Education",
    "Entertainment",
    "Sports",
    "Politics",
    "Science",
    "Other",
  ];

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
      
      setCoverImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

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

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const validateArticle = () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return false;
    }
    if (!content.trim()) {
      alert("Please write your article content");
      return false;
    }
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 50) {
      alert("Article should be at least 50 words long");
      return false;
    }
    if (wordCount > 500) {
      const proceed = window.confirm(
        "Articles eligible for creator earnings must be 500 words or less (~2-3 minute read time). Your article has " +
          wordCount.toLocaleString() +
          " words.\n\nYou can still publish it, but engagement-based earnings will be capped at the 500-word threshold.\n\nDo you want to publish anyway?"
      );
      if (!proceed) return false;
    }
    return true;
  };

  const publishArticle = async () => {
    if (!validateArticle()) return;

    try {
      setPublishing(true);

      let coverImageUrl = undefined;
      if (coverImage) {
        coverImageUrl = (await uploadImage(coverImage)) || undefined;
      }

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.trim().substring(0, 150) + "...",
        cover_image_url: coverImageUrl,
        category: category || "Other",
        tags: tagsArray,
        reading_time: calculateReadingTime(content),
      };

      const newArticle = await createArticle(articleData);

      if (newArticle) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (user) {
          await contentModerator.moderatePost(newArticle.id, user.id, {
            title: title.trim(),
            description: content.substring(0, 500),
          });

          await notifyFollowersOfNewPost(user.id, "article", newArticle.id, title.trim());
        }

        alert("Success! Your article has been published successfully.");
        router.back();
      } else {
        alert("Failed to publish article. Please make sure you're logged in and try again.");
      }
    } catch (error) {
      console.error("Error publishing article:", error);

      let errorMessage = "Something went wrong. Please try again.";
      if (error?.message?.includes("foreign key")) {
        errorMessage =
          "There was an issue with your account profile. Please log out and log back in, then try again.";
      } else if (error?.message?.includes("authenticated")) {
        errorMessage =
          "You must be logged in to publish articles. Please log in and try again.";
      }

      alert(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  const saveDraft = async () => {
    alert("Draft Saved - Your article has been saved as a draft.");
  };

  const applyFormatting = (format) => {
    const selectedText = content.substring(selectionStart, selectionEnd);
    if (!selectedText) {
      alert("Please select some text to format");
      return;
    }

    let formattedText = "";
    if (format === "bold") {
      formattedText = `**${selectedText}**`;
    } else if (format === "italic") {
      formattedText = `*${selectedText}*`;
    }

    const newContent =
      content.substring(0, selectionStart) + formattedText + content.substring(selectionEnd);

    setContent(newContent);

    setTimeout(() => {
      const newPosition = selectionStart + formattedText.length;
      if (contentInputRef.current) {
        contentInputRef.current.setSelectionRange(newPosition, newPosition);
        contentInputRef.current.focus();
      }
    }, 0);
  };

  const handleContentSelection = (e) => {
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  };

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <IoArrowBack size={24} color="#333" />
        </button>
        <h1 style={styles.headerTitle}>Write Article</h1>

        <div style={styles.headerRight}>
          <button
            onClick={() => alert("Write with AI - Feature coming soon")}
            style={styles.aiButton}
          >
            <img
              src="/verrsa-ai.png"
              alt="AI"
              style={{ height: 18, width: 18 }}
            />
          </button>

          <button onClick={saveDraft} style={styles.draftButton}>
            <span style={styles.draftText}>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollViewRef} style={styles.content}>
        {/* Cover Image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />
        
        <div onClick={pickImage} style={styles.imageContainer}>
          {coverImagePreview ? (
            <img src={coverImagePreview} alt="Cover" style={styles.coverImage} />
          ) : (
            <div style={styles.imagePlaceholder}>
              <IoImageOutline size={40} color="#ccc" />
              <span style={styles.imagePlaceholderText}>Add Cover Image</span>
            </div>
          )}
          {uploading && (
            <div style={styles.uploadingOverlay}>
              <div style={styles.spinner}></div>
            </div>
          )}
        </div>

        {/* Title */}
        <textarea
          style={styles.titleInput}
          placeholder="Your Article Title Here"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          rows={2}
        />

        {/* Excerpt */}
        <textarea
          style={styles.excerptInput}
          placeholder="Brief excerpt (optional)"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={200}
          rows={3}
        />

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

        {/* Formatting Toolbar */}
        <div style={styles.formattingToolbar}>
          <button onClick={() => applyFormatting("bold")} style={styles.formatButton}>
            <span style={styles.formatButtonText}>
              <strong>B</strong>
            </span>
          </button>
          <button onClick={() => applyFormatting("italic")} style={styles.formatButton}>
            <span style={styles.formatButtonText}>
              <em>I</em>
            </span>
          </button>
          <span style={styles.formatHint}>Select text and tap to format</span>
        </div>

        {/* Content */}
        <textarea
          ref={contentInputRef}
          style={styles.contentInput}
          placeholder="Write your article here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={handleContentSelection}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({
                top: scrollViewRef.current.scrollHeight,
                behavior: "smooth",
              });
            }, 200);
          }}
          rows={15}
        />

        {/* Word Count */}
        <p style={styles.wordCount}>{wordCount} words</p>
      </div>

      {/* Publish Button */}
      <div style={styles.publishContainer}>
        <button
          style={{
            ...styles.publishButton,
            ...(!title.trim() || !content.trim() || publishing
              ? styles.publishButtonDisabled
              : {}),
          }}
          onClick={publishArticle}
          disabled={!title.trim() || !content.trim() || publishing}
        >
          {publishing ? (
            <div style={styles.spinner}></div>
          ) : (
            <span style={styles.publishButtonText}>Publish Article</span>
          )}
        </button>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
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
    fontWeight: "500",
    color: "#333",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  aiButton: {
    padding: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  draftButton: {
    padding: "8px 16px",
    borderRadius: "12px",
    backgroundColor: "#f0f0f0",
    border: "none",
    cursor: "pointer",
  },
  draftText: {
    fontSize: "14px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
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
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "12px",
  },
  imagePlaceholder: {
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
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  titleInput: {
    fontSize: "32px",
    fontWeight: "400",
    backgroundColor: "#fff",
    color: "#333",
    marginBottom: "16px",
    border: "none",
    outline: "none",
    width: "100%",
    resize: "none",
    fontFamily: "'Instrument Sans', sans-serif",
    padding: "8px 0",
  },
  excerptInput: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#f8f8f8",
    borderRadius: "12px",
    border: "none",
    outline: "none",
    width: "100%",
    resize: "none",
    fontFamily: "'Instrument Sans', sans-serif",
    minHeight: "60px",
  },
  categoryContainer: {
    marginBottom: "24px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "400",
    color: "#333",
    marginBottom: "12px",
    display: "block",
    fontFamily: "'Instrument Sans', sans-serif",
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
    backgroundColor: "#00BFFF",
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
  formattingToolbar: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    paddingTop: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e0e0e0",
  },
  formatButton: {
    width: "40px",
    height: "40px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "16px",
    cursor: "pointer",
  },
  formatButtonText: {
    fontSize: "18px",
    color: "#333",
    fontWeight: "600",
  },
  formatHint: {
    fontSize: "12px",
    color: "#999",
    marginLeft: "16px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  contentInput: {
    fontSize: "14px",
    backgroundColor: "#fff",
    color: "#333",
    minHeight: "300px",
    border: "none",
    outline: "none",
    width: "100%",
    resize: "vertical",
    fontFamily: "'Instrument Sans', sans-serif",
    lineHeight: "1.6",
    padding: "8px 0",
  },
  wordCount: {
    fontSize: "12px",
    color: "#999",
    textAlign: "right",
    marginBottom: "24px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  publishContainer: {
    padding: "24px",
    borderTop: "1px solid #f0f0f0",
    backgroundColor: "#fff",
  },
  publishButton: {
    backgroundColor: "#00BFFF",
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
  spinner: {
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    animation: "spin 1s linear infinite",
  },
};

// Add CSS animation for spinner
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default WriteArticle;
