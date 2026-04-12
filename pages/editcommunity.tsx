// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { useTheme } from '../context/ThemeProvider';
import { TbDots } from 'react-icons/tb'
import { MdCheck } from 'react-icons/md'

type Props = StackScreenProps<any, any>;

const EditCommunity = ({ navigation, route }: Props) => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const initialCommunity = (route as any)?.params?.community || {};

  const [community, setCommunity] = useState(initialCommunity || {});
  const [name, setName] = useState(initialCommunity?.name || "");
  const [description, setDescription] = useState(
    initialCommunity?.description || "",
  );
  const [isPrivate, setIsPrivate] = useState(
    initialCommunity?.is_private || false,
  );
  const [coverImage, setCoverImage] = useState(
    initialCommunity?.cover_image_url || null,
  );
  const [avatarImage, setAvatarImage] = useState(
    initialCommunity?.avatar_url || null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserPermissions();
    if (!initialCommunity && communityId) {
      fetchCommunity();
    }
  }, []);

  const checkUserPermissions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Check if user is the creator or admin of the community
        const { data: memberData } = await supabase
          .from("community_members")
          .select("role")
          .eq("community_id", communityId)
          .eq("user_id", user.id)
          .single();

        const isCreator = initialCommunity?.created_by === user.id;
        const isAdmin =
          memberData?.role === "admin" || memberData?.role === "moderator";

        if (!isCreator && !isAdmin) {
          window.alert(/* Alert: */ 
            "Access Denied",
            "You don't have permission to edit this community.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        }
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const fetchCommunity = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community")
        .select("*")
        .eq("id", communityId)
        .single();

      if (error) throw error;

      setCommunity(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setIsPrivate(data.is_private || false);
      setCoverImage(data.cover_image_url || null);
      setAvatarImage(data.avatar_url || null);
    } catch (error) {
      console.error("Error fetching community:", error);
      window.alert("Failed to load community information");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: "cover" | "avatar") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "cover" ? [16, 9] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (type === "cover") {
          setCoverImage(imageUri);
        } else {
          setAvatarImage(imageUri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      window.alert("Failed to pick image");
    }
  };

  const uploadImage = async (uri: string, folder: string) => {
    try {
      console.log("Starting upload for:", uri);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const folderPath = `${folder}/${user.id}`;
      const filePath = `${folderPath}/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { data, error: uploadError } = await supabase.storage
        .from("media-public")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful, getting public URL");

      const { data: urlData } = supabase.storage
        .from("media-public")
        .getPublicUrl(filePath);

      console.log("Public URL:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const saveCommunity = async () => {
    if (!name.trim()) {
      window.alert("Community name is required");
      return;
    }

    setSaving(true);
    console.log("Starting save process...");
    console.log("Initial coverImage:", coverImage);
    console.log("Initial avatarImage:", avatarImage);

    try {
      let coverImageUrl = coverImage || null;
      let avatarImageUrl = avatarImage || null;

      // Upload new images if they're local URIs (not HTTP/HTTPS URLs)
      if (coverImage && !coverImage.startsWith("http")) {
        console.log("Uploading cover image:", coverImage);
        try {
          coverImageUrl = await uploadImage(coverImage, "covers");
          console.log("Cover image uploaded successfully:", coverImageUrl);

          if (!coverImageUrl) {
            throw new Error("Upload returned null URL");
          }
        } catch (uploadError) {
          console.error("Error uploading cover image:", uploadError);
          window.alert(/* Alert: */ 
            "Upload Error",
            `Failed to upload cover image: ${uploadError}`,
          );
          setSaving(false);
          return;
        }
      } else if (coverImage) {
        console.log("Using existing cover image URL:", coverImage);
      } else {
        console.log("No cover image provided");
      }

      if (avatarImage && !avatarImage.startsWith("http")) {
        console.log("Uploading avatar image:", avatarImage);
        try {
          avatarImageUrl = await uploadImage(avatarImage, "avatars");
          console.log("Avatar image uploaded successfully:", avatarImageUrl);

          if (!avatarImageUrl) {
            throw new Error("Upload returned null URL");
          }
        } catch (uploadError) {
          console.error("Error uploading avatar image:", uploadError);
          window.alert(/* Alert: */ 
            "Upload Error",
            `Failed to upload avatar image: ${uploadError}`,
          );
          setSaving(false);
          return;
        }
      } else if (avatarImage) {
        console.log("Using existing avatar image URL:", avatarImage);
      } else {
        console.log("No avatar image provided");
      }

      const updateData = {
        name: name.trim(),
        description: description.trim(),
        is_private: isPrivate,
        cover_image_url: coverImageUrl,
        avatar_url: avatarImageUrl,
        updated_at: new Date().toISOString(),
      };

      console.log(
        "Final update data being sent to database:",
        JSON.stringify(updateData, null, 2),
      );
      console.log("Community ID:", communityId);

      const { data, error } = await supabase
        .from("community")
        .update(updateData)
        .eq("id", communityId)
        .select();

      if (error) {
        console.error("Database update error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log(
        "Update successful. Returned data:",
        JSON.stringify(data, null, 2),
      );

      // Verify the update by fetching the community again
      const { data: verifyData, error: verifyError } = await supabase
        .from("community")
        .select("cover_image_url, avatar_url")
        .eq("id", communityId)
        .single();

      if (verifyError) {
        console.error("Verification fetch error:", verifyError);
      } else {
        console.log(
          "Verified community data from database:",
          JSON.stringify(verifyData, null, 2),
        );
      }

      window.alert("Community information updated successfully");
    } catch (error) {
      console.error("Error saving community:", error);
      window.alert(`Failed to update community information: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{...(styles.container || {}), ...(styles.centered || {}), backgroundColor: theme.background}}
      >
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={{...(styles.loadingText || {}), color: theme.secondaryText}}>
          Loading community information...
        </span>
      </div>
    );
  }

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
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
          Edit Community
        </span>
        <button
          style={{...(styles.saveButton || {}), backgroundColor: theme.accent || "#00BFFF", ...(saving ? styles.saveButtonDisabled : {})}}
          onClick={saveCommunity}
          disabled={saving}
        >
          {saving ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : (
            <span style={styles.saveButtonText}>Save</span>
          )}
        </button>
      </div>

      <div style={{...(styles.content || {}), backgroundColor: theme.background, overflowY: "auto"}}
        
      >
        {/* Cover Image */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Cover Image
          </span>
          <button
            style={{...(styles.imageContainer || {}), borderColor: theme.border,
                backgroundColor: theme.cardBackground,}}
            onClick={() => pickImage("cover")}
          >
            {coverImage ? (
              <img src={coverImage } style={styles.coverImage} />
            ) : (
              <div
                style={{...(styles.imagePlaceholder || {}), backgroundColor: theme.cardBackground}}
              >
                <MdCheck />
                <span
                  style={{...(styles.placeholderText || {}), color: theme.secondaryText}}
                >
                  Add Cover Image
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Avatar Image */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Community Avatar
          </span>
          <button
            style={styles.avatarContainer}
            onClick={() => pickImage("avatar")}
          >
            {avatarImage ? (
              <img src={avatarImage } style={styles.avatarImage} />
            ) : (
              <div
                style={{...(styles.avatarPlaceholder || {}), backgroundColor: theme.cardBackground,
                    borderColor: theme.border,}}
              >
                <MdCheck />
              </div>
                )}
          </button>
        </div>

        {/* Community Name */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Community Name
          </span>
          <input
            style={{...(styles.textInput || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter community name"
            placeholderTextColor={theme.secondaryText}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Description
          </span>
          <input
            style={{...(styles.textInput || {}), ...(styles.textArea || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,}}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your community"
            placeholderTextColor={theme.secondaryText}
            multiline
            
            maxLength={500}
          />
          <span style={{...(styles.characterCount || {}), color: theme.secondaryText}}>
            {description.length}/500 characters
          </span>
        </div>

        {/* Privacy Setting */}
        <div style={styles.section}>
          <div style={styles.privacyRow}>
            <div style={styles.privacyInfo}>
              <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
                Private Community
              </span>
              <span
                style={{...(styles.privacyDescription || {}), color: theme.secondaryText}}
              >
                {isPrivate
                  ? "Only invited members can join and see posts"
                  : "Anyone can join and see posts"}
              </span>
            </div>
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{cursor:"pointer"}} />
          </div>
        </div>

        {/* Additional Settings */}
        <div style={styles.section}>
          <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
            Community Guidelines
          </span>
          <div style={styles.guidelineItem}>
            <MdCheck />
            <span
              style={{...(styles.guidelineText || {}), color: theme.secondaryText}}
            >
              Only members can post
            </span>
          </div>
          <div style={styles.guidelineItem}>
            <MdCheck />
            <span
              style={{...(styles.guidelineText || {}), color: theme.secondaryText}}
            >
              {isPrivate ? "Invitation required to join" : "Anyone can join"}
            </span>
          </div>
          <div style={styles.guidelineItem}>
            <MdCheck />
            <span
              style={{...(styles.guidelineText || {}), color: theme.secondaryText}}
            >
              Posts require approval
            </span>
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
    marginRight: 80, // To center the title properly
  },
  saveButton: {
    backgroundColor: "#00BFFF",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl2,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    marginBottom: spacing.md,
    color: "#333",
  },
  imageContainer: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  coverImage: {
    width: "100%",
    height: 160,
    objectFit: "cover",
  },
  imagePlaceholder: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  placeholderText: {
    marginTop: spacing.sm,
    color: "#999",
    fontSize: fontSize.md,
  },
  avatarContainer: {
    alignSelf: "flex-start",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  textInput: {
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  characterCount: {
    textAlign: "right",
    color: "#999",
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  privacyInfo: {
    flex: 1,
    marginRight: spacing.base,
  },
  privacyDescription: {
    fontSize: fontSize.md,
    color: "#666",
    marginTop: spacing.xs,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  guidelineText: {
    fontSize: fontSize.md,
    color: "#555",
    marginLeft: spacing.base,
  },
  loadingText: {
    marginTop: spacing.md,
    color: "#666",
    fontSize: fontSize.base,
  },
};

export default EditCommunity;
