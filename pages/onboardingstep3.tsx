// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize, fontFamily } from "../lib/theme";
import AppText from "../components/AppText";
import { saveOnboardingData } from "../lib/onboardingManager";

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

const OnboardingStep3 = () => {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleContinue = async () => {
    // Save selected categories to AsyncStorage
    if (selectedCategories.length > 0) {
      await saveOnboardingData({
        contentCategories: selectedCategories,
      });
    }
    router.push('/select-region');
  };

  const handleSkip = async () => {
    // Clear any previously saved categories if user skips
    await saveOnboardingData({
      contentCategories: [],
    });
    router.push('/select-region');
  };

  return (
    <div
      
      
      
      
      keyboardShouldPersistTaps="handled"
      style={styles.scrollView}
    >
      {/* Logo */}
      <img src={require("../assets/verrsa.png")} style={styles.logo} />

      {/* Titles */}
      <AppText style={styles.title}>Select Your Most Interested Topics</AppText>
      <AppText style={styles.subtitle}>Choose five categories or more.</AppText>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Categories Grid */}
      <div style={styles.categoriesContainer}>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              style={[styles.category, isSelected && styles.categorySelected]}
              onClick={() => toggleCategory(category)}
            >
              <AppText
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {category}
              </AppText>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={handleContinue}>
        <AppText style={styles.continueText}>Continue</AppText>
      </button>

      {/* Skip Option */}
      <button onClick={handleSkip}>
        <AppText style={styles.skipText}>Skip</AppText>
      </button>
    </div>
  );
};

export default OnboardingStep3;

const styles: Record<string, React.CSSProperties> = {
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    padding: spacing.xs,
    backgroundColor: "#fff",
    alignItems: "center",
    minHeight: "100%",
    paddingBottom: spacing.xl2,
  },
  logo: {
    width: 100,
    height: 30,
    objectFit: "contain",
    marginBottom: spacing.lg,
    marginTop: spacing.xl5, // 👈 push logo down
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: spacing.xs,
    color: "#222",
    fontFamily: "InstrumentSans-Bold",
  },
  subtitle: {
    fontSize: fontSize.md2,
    color: "#666",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    width: "90%",
    backgroundColor: "#eee",
    marginBottom: spacing.lg,
  },
  categoriesContainer: {
    maxWidth: 400,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 35,
    gap: spacing.xs,
  },
  category: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    margin: spacing.xs,
    backgroundColor: "#f9f9f9",
  },
  categorySelected: {
    backgroundColor: "#23C9FF",
    borderColor: "#23C9FF",
  },
  categoryText: {
    fontSize: fontSize.md2,
    color: "#333",
    fontWeight: "400",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  continueButton: {
    backgroundColor: "#23C9FF",
    width: "95%",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: spacing.base,
  },
  continueText: {
    color: "#fff",
    fontSize: fontSize.xl,
    fontWeight: "600",
    fontFamily: fontFamily.regular,
  },
  skipText: {
    fontSize: fontSize.xl,
    color: "#000",
    fontFamily: fontFamily.regular,
  },
  };
