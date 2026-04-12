// @ts-nocheck
import React, { useState } from "react";
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import { IoChevronBack } from "react-icons/io5";

export default function ShowAudience() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState("All");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("7 days");

  return (
    <div style={styles.container}>
      <button onClick={() => router.back()} style={styles.backButton}>
        <IoChevronBack size={22} />
      </button>

      <AppText style={styles.title}>Audience Details</AppText>
      <AppText style={styles.subtitle}>Choose who should see your ad.</AppText>

      <AppText style={styles.label}>Audience Gender</AppText>
      <div style={styles.row}>
        {["Male", "Female", "All"].map((gender) => (
          <button
            key={gender}
            onClick={() => setSelectedGender(gender)}
            style={{
              ...(styles.chip || {}),
              borderColor: selectedGender === gender ? "#00BFFF" : "#adadad",
              color: selectedGender === gender ? "#00BFFF" : "#333",
            }}
          >
            {gender}
          </button>
        ))}
      </div>

      <AppText style={styles.label}>Audience Age Range</AppText>
      <div style={styles.row}>
        <input
          type="number"
          placeholder="Min Age"
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Max Age"
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
          style={styles.input}
        />
      </div>

      <AppText style={styles.label}>Location</AppText>
      <input
        placeholder="City or Country"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={styles.inputFull}
      />

      <AppText style={styles.label}>Campaign Duration</AppText>
      <select value={duration} onChange={(e) => setDuration(e.target.value)} style={styles.inputFull}>
        <option>3 days</option>
        <option>7 days</option>
        <option>14 days</option>
        <option>30 days</option>
      </select>

      <button style={styles.continueButton} onClick={() => router.push("/ads-and-boosts3") }>
        <AppText style={styles.continueButtonText}>Continue</AppText>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 680,
    margin: "0 auto",
    padding: spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: spacing.base,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    border: "1px solid #ddd",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
  },
  subtitle: {
    color: "#666",
    marginBottom: spacing.sm,
  },
  label: {
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: radius.md,
    padding: "10px 14px",
    background: "#fff",
  },
  input: {
    width: 180,
    padding: "12px 10px",
    border: "1px solid #ddd",
    borderRadius: radius.md,
  },
  inputFull: {
    width: "100%",
    padding: "12px 10px",
    border: "1px solid #ddd",
    borderRadius: radius.md,
  },
  continueButton: {
    marginTop: spacing.lg,
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
};
