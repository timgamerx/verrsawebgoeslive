// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';

import { supabase } from '../components/supabase';
import { fetchCurrentUserProfile } from '../lib/profileUtils';
import { sendNewCommunityNotification } from '../lib/pushNotifications';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'

const CreateCommunity = () => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [category, setCategory] = useState("Motivation");
  const [imageAsset, setImageAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  React.useEffect(() => {
    fetchCurrentUserProfile().then(setUserProfile);
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageAsset(result.assets[0]);
      }
    } catch (error) {
      window.alert("Failed to pick image");
    }
  };

  // Helper: upload image to Supabase Storage (public)
  async function uploadPublicFile(asset: ImagePicker.ImagePickerAsset) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const fileExt = asset.uri.split(".").pop()?.toLowerCase();
      const fileName = `${Date.now()}-${asset.fileName || `file.${fileExt}`}`;
      const folderPath = `covers/${user.id}`;
      const filePath = `${folderPath}/${fileName}`;
      // Read file as binary data
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { data, error } = await supabase.storage
        .from("media-public")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
      if (error) {
        console.error("Upload error:", error);
        return null;
      }
      const { data: urlData } = supabase.storage
        .from("media-public")
        .getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (e) {
      console.error("Image upload failed:", e);
      return null;
    }
  }

  const handlePublish = async () => {
    if (!name.trim() || !description.trim()) {
      window.alert("Please fill in all required fields.");
      return;
    }
    // Ensure we have the app profile (FK references public.profiles.id)
    let profile = userProfile;
    if (!profile || !profile.id) {
      // try to fetch current user profile from app helper
      profile = await fetchCurrentUserProfile();
    }
    if (!profile || !profile.id) {
      window.alert("Could not get your user profile. Please log in again.");
      return;
    }
    const userId = profile.id;
    setLoading(true);
    let coverImageUrl: string | null = null;
    if (imageAsset && imageAsset.uri) {
      coverImageUrl = await uploadPublicFile(imageAsset);
      if (!coverImageUrl) {
        setLoading(false);
        window.alert("Could not upload image. Try again.");
        return;
      }
    }
    // Prepare payload (log for debugging RLS / FK issues)
    const payload = {
      name: name.trim(),
      description: description.trim(),
      rules: rules.trim(),
      category: category,
      created_by: userId,
      cover_image_url: coverImageUrl,
      avatar_url: coverImageUrl,
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    };
    console.log("Creating community with payload:", payload);

    // debug before insert
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("supabase sessionData:", sessionData);
    console.log("session user id (auth):", sessionData?.session?.user?.id);
    console.log("payload created_by (profile id):", payload.created_by);

    // Insert into community table
    const { data, error } = await supabase
      .from("community")
      .insert([payload])
      .select();
    if (error || !data || !data[0]) {
      console.log("Supabase community insert error:", error);
      setLoading(false);
      window.alert("Failed to create community. Try again.");
      return;
    }
    // Add user as community member (role: 'owner')
    const communityId = data[0].id;
    // Ensure we use the auth user's id for the community_members.user_id FK (auth.users.id)
    const { data: authUserData, error: authUserError } =
      await supabase.auth.getUser();
    const authUserId = authUserData?.user?.id;

    if (!authUserId || authUserError) {
      console.log(
        "Could not get auth user id for membership insert:",
        authUserError,
      );
      setLoading(false);
      window.alert("Could not create community membership. Please try again.");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("community_members")
      .insert([
        {
          community_id: communityId,
          user_id: authUserId,
          role: "owner",
          joined_at: new Date().toISOString(),
        },
      ])
      .select();

    setLoading(false);

    if (memberError) {
      console.log("community_members insert error:", memberError);
      window.alert("But failed to add you as a member. Contact support.");
    } else {
      // Send notification to all users about the new community
      const creatorName =
        profile?.full_name || profile?.username || "A creator";

      // Send notification asynchronously (don't wait for it)
      sendNewCommunityNotification(
        creatorName,
        name.trim(),
        communityId,
        description.trim(),
      ).catch((err) =>
        console.error("Failed to send new community notification:", err),
      );

      window.alert("Your community has been published successfully! You are now the owner and first member."); router.back()
    }
  };

  return (
    <div>
      <div style={{overflowY: "auto", flex: 1}}>
        {/* Header */}
        <div style={{...(styles.header || {}), backgroundColor: theme.background}}>
          <button
            style={styles.backBtn}
            onClick={() => router.back()}
          >
            <TbChevronLeft />
          </button>
          <div style={{ flex: 1, alignItems: "center" }}>
            <span style={{...(styles.headerText || {}), color: theme.text}}>
              Create Community
            </span>
          </div>
          <div style={{ width: 24 }} />
        </div>

        {/* Inputs */}
        <span style={{...(styles.label || {}), color: theme.text}}>
          Community's name <span style={{ color: "red" }}>*</span>
        </span>
        <input
          style={{...(styles.input || {}), color: theme.text,
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
          placeholder="What should we call your community"
          placeholderTextColor={theme.secondaryText}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <span style={{...(styles.label || {}), color: theme.text}}>
          Community Description <span style={{ color: "red" }}>*</span>
        </span>
        <input
          style={{...(styles.input || {}), color: theme.text,
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
          placeholder="Enter a brief description about your community"
          placeholderTextColor={theme.secondaryText}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <span style={{...(styles.label || {}), color: theme.text}}>
          Select Category
        </span>
        <div
          style={{...(styles.dropdown || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ color: theme.text, backgroundColor: theme.cardBackground, border: 'none', width: '100%', padding: 8 }}
          >
            <option value="Motivation">Motivation</option>
            <option value="Education">Education</option>
            <option value="Business">Business</option>
            <option value="Lifestyle">Lifestyle</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Technology">Technology</option>
            <option value="Health">Health</option>
            <option value="Community">Community</option>
          </select>
        </div>

        <span style={{...(styles.label || {}), color: theme.text}}>
          Community Rules
        </span>
        <input
          style={{...(styles.input || {}), ...(styles.multilineInput || {}), color: theme.text,
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
          placeholder="Add community rules..."
          placeholderTextColor={theme.secondaryText}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          multiline
          
        />

        <span style={{...(styles.label || {}), color: theme.text}}>
          Set Photo{" "}
          <span style={{...(styles.optionalText || {}), color: theme.secondaryText}}>
            (Optional)
          </span>
        </span>
        <button
          style={{...(styles.imageBox || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
          onClick={pickImage}
        >
          {imageAsset ? (
            <img
              src={imageAsset.uri }
              style={{ width: "100%", height: "100%", borderRadius: radius.lg }}
            />
          ) : (
            <IoChevronBack />
          )}
        </button>

        {/* Privacy toggle */}
        <div
          style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.base }}
        >
          <span style={{ fontSize: fontSize.md2, marginRight: spacing.sm, color: theme.text }}>
            Private Community?
          </span>
          <button
            onClick={() => setIsPrivate((v) => !v)}
            style={{
              width: 40,
              height: 24,
              borderRadius: radius.lg,
              backgroundColor: isPrivate
                ? theme.accent || "#00BFFF"
                : theme.border,
              justifyContent: "center",
              padding: spacing.px,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: radius.md,
                backgroundColor: "#fff",
                marginLeft: isPrivate ? 16 : 2,
              }}
            />
          </button>
          <span
            style={{ marginLeft: spacing.sm, color: theme.secondaryText, fontSize: fontSize.sm2 }}
          >
            {isPrivate ? "Only invited users can join" : "Anyone can join"}
          </span>
        </div>

        <button
          style={{...(styles.publishBtn || {}), backgroundColor: theme.accent || "#00BFFF"}}
          onClick={handlePublish}
          disabled={loading}
        >
          <span style={styles.publishText}>
            {loading ? "Publishing..." : "Publish & View Community"}
          </span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  headerText: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    textAlign: "center",
  },
  label: {
    fontSize: fontSize.md2,
    fontWeight: "400",
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  optionalText: {
    fontSize: fontSize.sm2,
    fontWeight: "400",
    color: "#888",
  },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: fontSize.md2,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  multilineInput: {
    height: 120,
    textAlignVertical: "top",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: radius.lg,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  imageBox: {
    backgroundColor: "#f0f0f0",
    height: 220,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  publishBtn: {
    backgroundColor: "#00BFFF",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.lg,
    marginTop: spacing.xl2,
    marginBottom: spacing.xl3,
    alignItems: "center",
  },
  publishText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "500",
  },
};

export default CreateCommunity;
