import React from "react";
import {
  validatePassword,
  getStrengthLabel,
  getStrengthColor,
} from "../lib/passwordValidator";

export default function PasswordStrengthMeter({ password, onStrengthChange }) {
  const strength = validatePassword(password);

  React.useEffect(() => {
    if (onStrengthChange) {
      onStrengthChange(strength);
    }
  }, [password]);

  if (!password) {
    return null;
  }

  const strengthColor = getStrengthColor(strength.score);
  const strengthLabel = getStrengthLabel(strength.score);
  const progressWidth = (strength.score / 4) * 100;

  const styles = {
    container: {
      margin: "10px 0",
    },
    progressContainer: {
      height: "6px",
      backgroundColor: "#e0e0e0",
      borderRadius: "3px",
      overflow: "hidden",
      marginBottom: "8px",
    },
    progressBar: {
      height: "100%",
      borderRadius: "3px",
      transition: "width 0.2s ease, background-color 0.2s ease",
    },
    strengthLabel: {
      fontSize: "14px",
      fontWeight: 600,
      marginBottom: "12px",
      display: "inline-block",
    },
    requirementsContainer: {
      marginTop: "8px",
    },
    feedbackContainer: {
      marginTop: "12px",
      paddingTop: "12px",
      borderTop: "1px solid #e0e0e0",
    },
    feedbackText: {
      fontSize: "12px",
      marginBottom: "4px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.progressContainer}>
        <div
          style={{
            ...styles.progressBar,
            width: `${progressWidth}%`,
            backgroundColor: strengthColor,
          }}
        />
      </div>

      <span
        style={{
          ...styles.strengthLabel,
          color: strengthColor,
        }}
      >
        {strengthLabel}
      </span>

      <div style={styles.requirementsContainer}>
        <RequirementItem
          met={strength.requirements.minLength}
          text="At least 8 characters"
        />
        <RequirementItem
          met={strength.requirements.hasUppercase}
          text="One uppercase letter"
        />
        <RequirementItem
          met={strength.requirements.hasLowercase}
          text="One lowercase letter"
        />
        <RequirementItem
          met={strength.requirements.hasNumber}
          text="One number"
        />
        <RequirementItem
          met={strength.requirements.hasSpecialChar}
          text="One special character (!@#$...)"
        />
      </div>

      {strength.feedback.length > 0 && (
        <div style={styles.feedbackContainer}>
          {strength.feedback.map((item, index) => (
            <p
              key={index}
              style={{
                ...styles.feedbackText,
                color: strength.isValid ? "#00c853" : "#ff6b00",
                margin: 0,
              }}
            >
              {strength.isValid ? "✓" : "•"} {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }) {
  const itemStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "6px",
  };

  const checkmarkStyle = {
    fontSize: "16px",
    marginRight: "8px",
    fontWeight: 700,
    color: met ? "#00c853" : "#999",
    lineHeight: 1,
  };

  const textStyle = {
    fontSize: "13px",
    color: met ? "#333" : "#999",
  };

  return (
    <div style={itemStyle}>
      <span style={checkmarkStyle}>{met ? "✓" : "○"}</span>
      <span style={textStyle}>{text}</span>
    </div>
  );
}
