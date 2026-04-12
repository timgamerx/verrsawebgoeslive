/**
 * FollowPromptModal
 *
 * Shown once when a user views a post from someone they don't already follow.
 * After the first show for a given author, it won't appear again for that same
 * author (stored in localStorage per author ID) unless 48 h have elapsed.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";
import { IoClose } from "react-icons/io5";

interface FollowPromptUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  description?: string;
}

interface FollowPromptModalProps {
  user: FollowPromptUser | null;
  visible: boolean;
  alreadyFollowing?: boolean;
  following?: boolean;
  onFollow: () => Promise<void>;
  onDismiss: () => void;
}

const RESOW_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 h
export const STORAGE_PREFIX = "follow_prompt_shown_";

export const shouldShowFollowPrompt = async (authorId: string): Promise<boolean> => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${authorId}`);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) > RESOW_INTERVAL_MS;
  } catch {
    return true;
  }
};

export const markFollowPromptShown = async (authorId: string): Promise<void> => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${authorId}`, String(Date.now()));
  } catch { /* ignore */ }
};

export const FollowPromptModal: React.FC<FollowPromptModalProps> = ({
  user,
  visible,
  alreadyFollowing = false,
  following = false,
  onFollow,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(80);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (visible) {
      // Next tick so transition fires after display:flex
      timerRef.current = setTimeout(() => {
        setOpacity(1);
        setTranslateY(0);
      }, 10);
    } else {
      setOpacity(0);
      setTranslateY(80);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  if (!visible || !user || alreadyFollowing) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 1000,
        opacity,
        transition: "opacity 280ms ease",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: theme.cardBackground,
          borderTopLeftRadius: `${radius.xl2}px`,
          borderTopRightRadius: `${radius.xl2}px`,
          paddingTop: `${spacing.xl}px`,
          paddingLeft: `${spacing.xl}px`,
          paddingRight: `${spacing.xl}px`,
          paddingBottom: `${spacing.xl}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          transform: `translateY(${translateY}px)`,
          transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fontFamily: "'Instrument Sans', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          style={{
            position: "absolute",
            top: `${spacing.base}px`,
            right: `${spacing.base}px`,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: `${spacing.xs}px`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <IoClose size={22} color={theme.secondaryText} />
        </button>

        {/* Avatar */}
        <div style={{ marginBottom: `${spacing.base}px` }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: theme.accent + "22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                color: theme.accent,
                fontWeight: "600",
              }}
            >
              {(user.name || "?")[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <h3 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: 18, fontWeight: "600", color: theme.text, textAlign: "center" }}>
          Follow {user.name}
        </h3>

        {user.username && (
          <p style={{ margin: `0 0 ${spacing.xs}px`, fontSize: 13, color: theme.accent, textAlign: "center" }}>
            @{user.username}
          </p>
        )}

        <p style={{ margin: `0 0 ${spacing.xl}px`, fontSize: 13, color: theme.secondaryText, textAlign: "center", padding: `0 ${spacing.sm}px` }}>
          {user.description || `Stay up to date with ${user.name}'s latest posts and updates.`}
        </p>

        {/* Follow button */}
        <button
          onClick={onFollow}
          disabled={following}
          style={{
            width: "100%",
            height: 50,
            borderRadius: `${radius.lg}px`,
            backgroundColor: theme.accent,
            border: "none",
            cursor: following ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: `${spacing.sm}px`,
            opacity: following ? 0.7 : 1,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          {following ? (
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <span style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Follow</span>
          )}
        </button>

        {/* Maybe later */}
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: `${spacing.sm}px`,
            color: theme.secondaryText,
            fontSize: 13,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default FollowPromptModal;
