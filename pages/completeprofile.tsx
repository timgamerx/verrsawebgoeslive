// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from '../lib/theme';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';
import { sendUserWelcomeEmail } from '../lib/emailService';

const categories = [
  "Programming",
  "UI/UX Design",
  "Health",
  "Life",
  "Motivation",
  "Cryptocurrency",
  "Relationships",
  "Business",
  "Startup",
  "Psychology",
  "Education",
  "Money",
  "Architecture",
  "History",
  "Arts/Design",
  "Development",
  "Entertainment",
  "Culture",
  "Sports",
  "Artificial Intelligence",
  "Productivity",
  "Personal Growth",
  "Marketing",
  "Philosophy",
];

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Benin",
  "Bolivia",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Congo - Brazzaville",
  "Congo - Kinshasa",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Haiti",
  "Honduras",
  "Hungary",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "North Korea",
  "South Korea",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Mali",
  "Mauritania",
  "Mexico",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const CompleteProfile = () => {
    const { theme, colors } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Profile information fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    phone?: string;
    bio?: string;
  }>({});

  // Load existing user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");

        // Try to load existing profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, username, phone, bio")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name || "");
          setLastName(profile.last_name || "");
          setUsername(profile.username || "");
          setPhone(profile.phone || "");
          setBio(profile.bio || "");
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (bio.length > 300) {
      newErrors.bio = "Bio must be 300 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUsernameAvailability = async (
    usernameToCheck: string
  ): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameToCheck)
        .neq("id", userId)
        .single();

      return !data; // Username is available if no data found
    } catch (error) {
      console.error("Error checking username:", error);
      return true; // Assume available on error
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleSave = async () => {
    // Validate all fields
    if (!validateForm()) {
      window.alert(/* Alert: */ 
        "Incomplete Information",
        "Please fill in all required fields correctly.",
      );
      return;
    }

    if (selectedCategories.length === 0 || !selectedCountry) {
      window.alert(/* Alert: */ 
        "Incomplete",
        "Please select at least one category and a country.",
      );
      return;
    }

    // Check username availability
    const isUsernameAvailable = await checkUsernameAvailability(username);
    if (!isUsernameAvailable) {
      setErrors((prev) => ({ ...prev, username: "Username is already taken" }));
      window.alert("Please choose a different username.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.alert("User not authenticated");
        return;
      }

      // Update user profile with all data
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          content_category: selectedCategories.join(", "),
          country_name: selectedCountry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        window.alert("Failed to update profile. Please try again.");
        return;
      }

      // Send welcome email (non-blocking)
      sendUserWelcomeEmail(
        email.trim().toLowerCase(),
        `${firstName.trim()} ${lastName.trim()}`,
        username.trim().toLowerCase(),
      ).catch((err) => {
        console.error("Failed to send welcome email:", err);
        // Don't block user flow if email fails
      });

      window.alert(/* Alert: */ "Success", "Profile completed successfully!", [
        {
          text: "OK",
          onPress: () => {
            navigate('/home');
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving profile:", error);
      window.alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{overflowY: "auto", flex: 1}}>
        <span style={{...(styles.title || {}), color: theme.text}}>
          Complete Your Profile
        </span>
        <span style={{...(styles.subtitle || {}), color: theme.secondaryText}}>
          Help us personalize your experience by providing your information,
          interests and location.
        </span>

        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

        {/* Personal Information Section */}
        <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
          Personal Information
        </span>

        <div style={styles.fieldContainer}>
          <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
            First Name *
          </span>
          <input
            style={{...(styles.input || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.firstName ? styles.inputError : {})}}
            placeholder="Enter first name"
            placeholderTextColor={theme.secondaryText}
            value={firstName}
            onChange={(e) => { const text = e.target.value;
              setFirstName(text);
              if (errors.firstName) {
                setErrors((prev) => ({ ...prev, firstName: undefined}));
              }
            }}
            
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
            style={{...(styles.input || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.lastName ? styles.inputError : {})}}
            placeholder="Enter last name"
            placeholderTextColor={theme.secondaryText}
            value={lastName}
            onChange={(e) => { const text = e.target.value;
              setLastName(text);
              if (errors.lastName) {
                setErrors((prev) => ({ ...prev, lastName: undefined}));
              }
            }}
            
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
            style={{...(styles.input || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.username ? styles.inputError : {})}}
            placeholder="Enter username"
            placeholderTextColor={theme.secondaryText}
            value={username}
            onChange={(e) => { const text = e.target.value;
              setUsername(text.toLowerCase());
              if (errors.username) {
                setErrors((prev) => ({ ...prev, username: undefined}));
              }
            }}
            
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
            style={{...(styles.input || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.email ? styles.inputError : {})}}
            placeholder="Enter email address"
            placeholderTextColor={theme.secondaryText}
            value={email}
            onChange={(e) => { const text = e.target.value;
              setEmail(text);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined}));
              }
            }}
            type="email"
            
            
          />
          {errors.email && (
            <span style={styles.errorText}>{errors.email}</span>
          )}
        </div>

        <div style={styles.fieldContainer}>
          <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
            Phone Number (Optional)
          </span>
          <input
            style={{...(styles.input || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.phone ? styles.inputError : {})}}
            placeholder="Enter phone number"
            placeholderTextColor={theme.secondaryText}
            value={phone}
            onChange={(e) => { const text = e.target.value;
              setPhone(text);
              if (errors.phone) {
                setErrors((prev) => ({ ...prev, phone: undefined}));
              }
            }}
            type="tel"
            
          />
          {errors.phone && (
            <span style={styles.errorText}>{errors.phone}</span>
          )}
        </div>

        <div style={styles.fieldContainer}>
          <span style={{...(styles.fieldLabel || {}), color: theme.secondaryText}}>
            Bio (Optional)
          </span>
          <input
            style={{...(styles.bioInput || {}), color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(errors.bio ? styles.inputError : {})}}
            placeholder="Write something about yourself..."
            placeholderTextColor={theme.secondaryText}
            value={bio}
            onChange={(e) => { const text = e.target.value;
              setBio(text);
              if (errors.bio) {
                setErrors((prev) => ({ ...prev, bio: undefined}));
              }
            }}
            multiline
            
            maxLength={300}
            textAlignVertical="top"
          />
          <span
            style={{...(styles.characterCount || {}), color: theme.secondaryText}}
          >
            {bio.length}/300
          </span>
          {errors.bio && <span style={styles.errorText}>{errors.bio}</span>}
        </div>

        <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

      <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
        Select Your Interests
      </span>
      <span style={{...(styles.sectionSubtitle || {}), color: theme.secondaryText}}>
        Choose at least one category
      </span>

      <div style={styles.categoriesContainer}>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              style={{...(styles.category || {}), backgroundColor: theme.cardBackground,
                  borderColor: theme.border, ...(isSelected ? styles.categorySelected : {})}}
              onClick={() => toggleCategory(category)}
            >
              <span
                style={{...(styles.categoryText || {}), color: theme.text, ...(isSelected ? styles.categoryTextSelected : {})}}
              >
                {category}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{...(styles.divider || {}), backgroundColor: theme.border}} />

      <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
        Select Your Country
      </span>

      <div style={{...(styles.countriesScrollView), overflowY: "auto"}}
        
        
      >
        <div style={styles.countriesContainer}>
          {countries.map((country) => {
            const isSelected = selectedCountry === country;
            return (
              <button
                key={country}
                style={{...(styles.countryItem || {}), backgroundColor: theme.cardBackground,
                    borderColor: theme.border, ...(isSelected ? styles.countrySelected : {})}}
                onClick={() => setSelectedCountry(country)}
              >
                <span
                  style={{...(styles.countryText || {}), color: theme.text, ...(isSelected ? styles.countryTextSelected : {})}}
                >
                  {country}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        style={{...(styles.saveButton || {}), ...(loading ? styles.buttonDisabled : {})}}
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? (
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        ) : (
          <span style={styles.saveButtonText}>Complete Profile</span>
        )}
      </button>

      <span style={{...(styles.requiredText || {}), color: theme.secondaryText}}>
        * Required fields
      </span>
    </div>
    </div>
  );
};

export default CompleteProfile;

const styles: Record<string, React.CSSProperties> = {
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl3,
  },
  title: {
    fontSize: fontSize.xl3,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.xl3,
    marginBottom: spacing.md,
    color: "#222",
  },
  subtitle: {
    fontSize: fontSize.md2,
    color: "#666",
    textAlign: "center",
    marginBottom: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#eee",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.base,
    color: "#222",
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.base,
    fontWeight: "400",
    color: "#666",
    marginBottom: spacing.xs,
  },
  input: {
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
  },
  inputError: {
    borderColor: "#ff4757",
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
  sectionSubtitle: {
    fontSize: fontSize.md,
    color: "#666",
    marginBottom: spacing.base,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  category: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: "#f9f9f9",
  },
  categorySelected: {
    backgroundColor: "#23C9FF",
    borderColor: "#23C9FF",
  },
  categoryText: {
    fontSize: fontSize.md,
    color: "#333",
    fontWeight: "400",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  countriesScrollView: {
    maxHeight: 250,
    marginBottom: spacing.lg,
  },
  countriesContainer: {
    marginBottom: spacing.md,
  },
  countryItem: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.lg,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: "#f9f9f9",
  },
  countrySelected: {
    backgroundColor: "#E6F9FF",
    borderColor: "#23C9FF",
  },
  countryText: {
    fontSize: fontSize.md2,
    color: "#333",
  },
  countryTextSelected: {
    color: "#23C9FF",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#23C9FF",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  requiredText: {
    textAlign: "center",
    color: "#999",
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
};
