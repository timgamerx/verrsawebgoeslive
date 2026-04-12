'use client';

// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { IoArrowBack, IoCloudUploadOutline } from "react-icons/io5";

const ArticleSettings = () => {
  const router = useRouter();
  const [visibility, setVisibility] = useState("everyone");
  const [allowComments, setAllowComments] = useState("allow");
  const [tags, setTags] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setImageFileName(file.name);
    };
    input.click();
  };

  const handlePublish = () => {
    window.alert("Article published successfully!");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.iconBtn}>
          <IoArrowBack size={22} color="#333" />
        </button>
        <button style={styles.publishBtn} onClick={handlePublish}>
          <AppText style={styles.publishText}>Publish</AppText>
        </button>
      </div>

      <AppText style={styles.sectionTitle}>This article is for?</AppText>
      <div style={styles.row}>
        <button style={styles.optionBtn} onClick={() => setVisibility("everyone")}>Everyone</button>
        <button style={styles.optionBtn} onClick={() => setVisibility("paid")}>Paid subscribers only</button>
      </div>

      <AppText style={styles.sectionTitle}>Allow comments</AppText>
      <div style={styles.row}>
        <button style={styles.optionBtn} onClick={() => setAllowComments("allow")}>Allow</button>
        <button style={styles.optionBtn} onClick={() => setAllowComments("disable")}>Disable</button>
      </div>

      <AppText style={styles.sectionTitle}>Add tags</AppText>
      <input
        style={styles.input}
        placeholder="Input tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <AppText style={styles.sectionTitle}>Image</AppText>
      <button style={styles.imageBtn} onClick={pickImage}>
        <IoCloudUploadOutline size={22} color="#00BFFF" />
        <span>{imageFileName || "Upload image"}</span>
      </button>

      <button style={styles.publishNowBtn} onClick={handlePublish}>
        <AppText style={styles.publishNowText}>Publish now</AppText>
      </button>

      <AppText style={styles.meta}>Visibility: {visibility} | Comments: {allowComments}</AppText>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 760,
    margin: "0 auto",
    padding: spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: spacing.base,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    border: "1px solid #ddd",
    borderRadius: radius.full,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  publishBtn: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    padding: "8px 14px",
  },
  publishText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  row: {
    display: "flex",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  optionBtn: {
    border: "1px solid #ddd",
    borderRadius: radius.md,
    padding: "10px 12px",
    background: "#fff",
  },
  input: {
    border: "1px solid #ddd",
    borderRadius: radius.md,
    padding: "11px 10px",
  },
  imageBtn: {
    border: "1px dashed #00BFFF",
    borderRadius: radius.md,
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    background: "#f7fcff",
  },
  publishNowBtn: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    padding: "12px 14px",
    marginTop: spacing.base,
  },
  publishNowText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  meta: {
    color: "#666",
    fontSize: fontSize.sm,
  },
};

export default ArticleSettings;
