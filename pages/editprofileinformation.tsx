// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import {
  fetchCurrentUserProfile,
  updateUserProfile,
} from '../lib/profileUtils';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'
import { MdCheck } from 'react-icons/md'

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  bio: string;
  avatar?: string;
}

const EditProfileInformation = () => {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    bio: "",
    });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<UserProfile>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Get current authenticated user (consistent with ProfileSetting)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      setUserId(user.id);

      // Use the utility function to fetch profile
      const profileData = await fetchCurrentUserProfile();

      console.log(
        "EditProfileInformation - Authenticated user:",
        user.id
      );
      console.log("EditProfileInformation - Profile data:", profileData);

      if (profileData) {
        const profileFormData = {
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          email: profileData.email || user.email || "",
          phone: profileData.phone || "",
          username: profileData.username || "",
          bio: profileData.bio || "",
          avatar: profileData.avatar_url || profileData.avatar || "",
        };

        console.log(
          "EditProfileInformation - Setting profile:",
          profileFormData
        );
        setProfile(profileFormData);
      } else {
        // Fallback if utility function fails - use authenticated user's data
        const fallbackProfile = {
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
          phone: "",
          username: user.email?.split("@")[0] || "",
          bio: "",
          avatar: user.user_metadata?.avatar_url || "",
        };

        console.log(
          "EditProfileInformation - Using fallback profile:",
          fallbackProfile
        );
        setProfile(fallbackProfile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      window.alert("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserProfile> = {};

    if (!profile.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!profile.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!profile.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(profile.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!profile.username.trim()) {
      newErrors.username = "Username is required";
    } else if (profile.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(profile.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (profile.phone && !/^\+?[\d\s\-\(\)]+$/.test(profile.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // File upload function for avatar (similar to PodcastDetails)
  const uploadAvatarToSupabase = async (
    imageAsset: ImagePicker.ImagePickerAsset
  ) => {
    try {
      setUploading(true);

      // Get current user for path organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = imageAsset.uri.split(".").pop()?.toLowerCase();
      const fileName = `${Date.now()}-avatar.${fileExt}`;
      const folderPath = `avatars/${user.id}`;
      const filePath = `${folderPath}/${fileName}`;

      // Read file as binary data
      const response = await fetch(imageAsset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { data, error } = await supabase.storage
        .from("media-public")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error("Avatar upload error:", error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media-public")
        .getPublicUrl(data.path);

      console.log("Avatar uploaded successfully:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      window.alert("Failed to upload avatar. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const checkUsernameAvailability = async (
    username: string
  ): Promise<boolean> => {
    if (!userId) return true; // Skip check if no user session

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .single();

      return !data; // Username is available if no data found
    } catch (error) {
      console.error("Error checking username:", error);
      return true; // Assume available on error
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Check username availability
    const isUsernameAvailable = await checkUsernameAvailability(
      profile.username
    );
    if (!isUsernameAvailable) {
      setErrors((prev) => ({ ...prev, username: "Username is already taken" }));
      return;
    }

    try {
      setSaving(true);

      // Use the utility function to update profile
      const success = await updateUserProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatar,
        avatar_url: profile.avatar,
        full_name:
          profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : undefined,
      });

      if (success) {
        // Mark profile as updated so Profile knows to refresh
        localStorage.setItem("profileLastUpdated", String(Date.now()));

        window.alert("Profile updated successfully!");
      } else {
        // Still mark as updated even if server sync failed, as local data changed
        localStorage.setItem("profileLastUpdated", String(Date.now()));

        window.alert("Profile saved locally but may not have synced with server. Changes will be synced when connection is restored."
        );
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      window.alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = () => {
    window.alert("Choose an option");
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      window.alert("Camera permission is required to take photos"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload image to Supabase
      const uploadedUrl = await uploadAvatarToSupabase(result.assets[0]);
      if (uploadedUrl) {
        setProfile((prev) => ({ ...prev, avatar: uploadedUrl }));
      }
    }
  };

  const openImageLibrary = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      window.alert("Photo library permission is required to select images"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload image to Supabase
      const uploadedUrl = await uploadAvatarToSupabase(result.assets[0]);
      if (uploadedUrl) {
        setProfile((prev) => ({ ...prev, avatar: uploadedUrl }));
      }
    }
  };

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <div
        style={{...(styles.container || {}), justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.background,}}
      >
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={{ marginTop: spacing.md, color: theme.secondaryText }}>
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{overflowY: "auto", flex: 1}}>
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => router.back()}
          >
            <TbChevronLeft />
          </button>
          <span style={{...(styles.headerTitle || {}), color: theme.text}}>
            Edit Information
          </span>
        </div>

        <button
          onClick={handleImagePicker}
          style={styles.avatarContainer}
          disabled={uploading}
        >
          {uploading ? (
            <div style={{...(styles.avatar || {}), ...(styles.avatarUploading || {})}}>
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            </div>
          ) : (
            <img
              src={
                profile.avatar
                  ? { uri: profile.avatar }
                  : "/assets/../assets/avatar.jpg"
              }
              style={{...(styles.avatar || {}), borderColor: theme.text}}
            />
          )}
          <div style={styles.editIconContainer}>
            <MdCheck />
          </div>
        </button>

        <div style={styles.formContainer}>
          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              First Name *
            </span>
            <input
              style={{...(styles.underlineInput || {}), color: theme.text, borderBottomColor: theme.border, ...(errors.firstName ? styles.inputError : {})}}
              placeholder="Enter first name"
              placeholderTextColor={theme.secondaryText}
              value={profile.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              
            />
            {errors.firstName && (
              <span style={styles.errorText}>{errors.firstName}</span>
            )}
          </div>

          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              Last Name *
            </span>
            <input
              style={{...(styles.underlineInput || {}), color: theme.text, borderBottomColor: theme.border, ...(errors.lastName ? styles.inputError : {})}}
              placeholder="Enter last name"
              placeholderTextColor={theme.secondaryText}
              value={profile.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              
            />
            {errors.lastName && (
              <span style={styles.errorText}>{errors.lastName}</span>
            )}
          </div>

          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              Username *
            </span>
            <input
              style={{...(styles.underlineInput || {}), color: theme.text, borderBottomColor: theme.border, ...(errors.username ? styles.inputError : {})}}
              placeholder="Enter username"
              placeholderTextColor={theme.secondaryText}
              value={profile.username}
              onChange={(e) => updateField("username", e.target.value.toLowerCase())}
              
              maxLength={20}
            />
            {errors.username && (
              <span style={styles.errorText}>{errors.username}</span>
            )}
          </div>

          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              Email *
            </span>
            <input
              style={{...(styles.underlineInput || {}), color: theme.text, borderBottomColor: theme.border, ...(errors.email ? styles.inputError : {})}}
              placeholder="Enter email address"
              placeholderTextColor={theme.secondaryText}
              value={profile.email}
              onChange={(e) => updateField("email", e.target.value)}
              type="email"
              
              
            />
            {errors.email && (
              <span style={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              Phone Number
            </span>
            <input
              style={{...(styles.underlineInput || {}), color: theme.text, borderBottomColor: theme.border, ...(errors.phone ? styles.inputError : {})}}
              placeholder="Enter phone number"
              placeholderTextColor={theme.secondaryText}
              value={profile.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              type="tel"
              
            />
            {errors.phone && (
              <span style={styles.errorText}>{errors.phone}</span>
            )}
          </div>

          <div style={styles.fieldContainer}>
            <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
              Bio
            </span>
            <input
              style={{...(styles.bioInput || {}), color: theme.text,
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border, ...(errors.bio ? styles.inputError : {})}}
              placeholder="Write something about yourself..."
              placeholderTextColor={theme.secondaryText}
              value={profile.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              multiline
              
              maxLength={300}
              textAlignVertical="top"
            />
            <span
              style={{...(styles.characterCount || {}), color: theme.secondaryText}}
            >
              {profile.bio.length}/300
            </span>
            {errors.bio && <span style={styles.errorText}>{errors.bio}</span>}
          </div>
        </div>

        <button
          style={{...(styles.saveButton || {}), backgroundColor: theme.accent, ...(saving ? styles.saveButtonDisabled : {})}}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          ) : (
            <span style={styles.saveButtonText}>Save Changes</span>
          )}
        </button>

        <span style={{...(styles.requiredText || {}), color: theme.secondaryText}}>
          * Required fields
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: spacing.lg,
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: spacing.md,
    minHeight: 100,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginTop: 50,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: -5,
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    position: "relative",
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: "#000",
  },
  avatarUploading: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bfff",
    borderRadius: radius.lg,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  fieldContainer: {
    marginBottom: 25,
  },
  fieldLabel: {
    fontSize: fontSize.base,
    fontWeight: "400",
    color: "#666",
    marginBottom: spacing.xs,
  },
  underlineInput: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    color: "#000",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "transparent",
  },
  inputError: {
    borderBottomColor: "#ff4757",
  },
  bioInput: {
    fontSize: fontSize.base,
    color: "#000",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: radius.md,
    backgroundColor: "#fff",
    minHeight: 100,
    maxHeight: 120,
  },
  characterCount: {
    fontSize: fontSize.sm,
    color: "#999",
    textAlign: "right",
    marginTop: spacing.xs,
  },
  errorText: {
    color: "#ff4757",
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: "#00bfff",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.xl2,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "500",
  },
  requiredText: {
    textAlign: "center",
    color: "#999",
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
};

export default EditProfileInformation;
