// @ts-nocheck

export type PasswordStrength = {
  isValid: boolean;
  score: number;
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
};

export const validatePassword = (password: string): PasswordStrength => {
  const value = password || "";
  const requirements = {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
  };

  let score = 0;
  if (requirements.minLength) score += 1;
  if (requirements.hasUppercase && requirements.hasLowercase) score += 1;
  if (requirements.hasNumber) score += 1;
  if (requirements.hasSpecialChar) score += 1;

  const feedback: string[] = [];
  if (!requirements.minLength) feedback.push("Password must be at least 8 characters");
  if (!(requirements.hasUppercase && requirements.hasLowercase)) {
    feedback.push("Include both uppercase and lowercase letters");
  }
  if (!requirements.hasNumber) feedback.push("Include at least one number");
  if (!requirements.hasSpecialChar) feedback.push("Include at least one special character");

  return {
    isValid: score >= 3,
    score,
    feedback,
    requirements,
  };
};

export const getStrengthLabel = (score: number): string => {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
};

export const getStrengthColor = (score: number): string => {
  if (score <= 1) return "#ff4d4f";
  if (score === 2) return "#faad14";
  if (score === 3) return "#52c41a";
  return "#13c2c2";
};
