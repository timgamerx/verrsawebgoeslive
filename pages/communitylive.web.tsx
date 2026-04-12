// @ts-nocheck
import { useRouter } from 'next/router';
import React from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';

// Web version of CommunityLive - Agora SDK not supported on web
export default function CommunityLive() {
  const router = useRouter();
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <IoArrowBack />
        </button>
      </div>

      <div style={styles.centerContent}>
        <IoChevronBack />
        <span style={styles.title}>Live Streaming Not Available on Web</span>
        <span style={styles.description}>
          Live streaming is only supported on iOS and Android apps.
        </span>
        <span style={styles.description}>
          Please use the mobile app to watch or start live streams.
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.xl3,
    paddingRight: spacing.xl3,
  },
  title: {
    fontSize: fontSize.xl3,
    fontWeight: "bold",
    color: "#fff",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  description: {
    fontSize: fontSize.base,
    color: "#999",
    textAlign: "center",
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
};
