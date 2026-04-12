// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { MdAdd, MdArrowBack, MdArrowForward, MdBlock, MdCheck, MdClose, MdDelete, MdEdit, MdFavorite, MdHome, MdNotifications, MdPerson, MdRemove, MdReport, MdSearch, MdSettings, MdShare, MdStar, MdVerified } from 'react-icons/md';
import { TbChevronLeft } from 'react-icons/tb'

export default function BoostGoal() {
  const router = useRouter();
  

  const handleBoostGoalSelection = (goal: string) => {
  const router = useRouter();
    router.push("/call-to-action");
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <TbChevronLeft />
        </button>
        <span style={styles.headerTitle}>Select Boost Goal</span>
        <div style={{ width: 24 }} />
      </div>

      {/* Content */}
      <div style={styles.content}>
        <span style={styles.title}>Select Boost Goal</span>
        <span style={styles.subtitle}>
          Kindly select what you would love this post to bring to you
        </span>

        <button
          style={{...(styles.boostButtonGoal || {}), flexDirection: "row", gap: spacing.md}}
          onClick={() => handleBoostGoalSelection("more_views")}
        >
          <MdCheck />
          <span style={styles.boostButtonGoalText}>Get more views</span>
        </button>

        <button
          style={{...(styles.boostButtonGoal || {}), flexDirection: "row", gap: spacing.md}}
          onClick={() => handleBoostGoalSelection("more_likes")}
        >
          <img
            src={"/assets/../assets/like.png"}
            style={{ width: 20, height: 20 }}
          />
          <span style={styles.boostButtonGoalText}>Get more likes</span>
        </button>

        <button
          style={{...(styles.boostButtonGoal || {}), flexDirection: "row", gap: spacing.md}}
          onClick={() => handleBoostGoalSelection("more_listeners")}
        >
          <img
            src={"/assets/../assets/listening.png"}
            style={{ width: 20, height: 20 }}
          />
          <span style={styles.boostButtonGoalText}>Get more listeners</span>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: 70,
    paddingBottom: spacing.base,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    color: "#111",
  },
  content: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.base,
    color: "#666",
    marginBottom: spacing.xl2,
    textAlign: "center",
  },
  boostButtonGoal: {
    borderColor: "#adadadff",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.md,
    width: "100%",
    height: 60,
    alignSelf: "center",
    marginBottom: spacing.base,
  },
  boostButtonGoalText: {
    color: "#484848ff",
    fontSize: fontSize.md2,
    fontWeight: "400",
  },
};
