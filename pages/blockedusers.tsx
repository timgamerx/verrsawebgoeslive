// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoCheckmark, IoChevronBack } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'

interface BlockedUserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
  is_verified?: boolean;
}

export default function BlockedUsers() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedUserProfile[]>(
    [],
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadBlockedUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.alert("You must be logged in to view blocked users");
        return;
      }

      const { data: blockedRows, error: blockedError } = await supabase
        .from("blocked_users")
        .select("blocked_user_id")
        .eq("blocked_by", user.id);

      if (blockedError) throw blockedError;
      const blockedIds = (blockedRows || []).map((r: any) => r.blocked_user_id);

      if (blockedIds.length === 0) {
        setBlockedProfiles([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .in("id", blockedIds);

      if (profilesError) throw profilesError;
      setBlockedProfiles(profiles || []);
    } catch (error) {
      console.error("Error loading blocked users:", error);
      window.alert("Failed to load blocked users. Please try again.");
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblock = async (blockedUserId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocked_user_id", blockedUserId)
        .eq("blocked_by", user.id);
      if (error) throw error;

      setBlockedProfiles((prev) => prev.filter((p) => p.id !== blockedUserId));
      window.alert("User has been unblocked.");
    } catch (error) {
      console.error("Error unblocking user:", error);
      window.alert("Failed to unblock user. Please try again.");
    }
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>

      <span style={{...(styles.title || {}), color: theme.text}}>Blocked Users</span>

      <div style={{...(styles.list), overflowY: "auto"}}
      >
        {blockedProfiles.length === 0 ? (
          <div style={styles.emptyState}>
            <IoChevronBack />
            <span style={{ color: theme.secondaryText, marginTop: spacing.sm }}>
              You haven't blocked anyone.
            </span>
          </div>
        ) : (
          blockedProfiles.map((profile) => (
            <div
              key={profile.id}
              style={{...(styles.item || {}), borderColor: theme.border}}
            >
              <div style={styles.itemLeft}>
                <img
                  src={
                    profile.avatar_url
                      ? { uri: profile.avatar_url }
                      : "/assets/../assets/avatar.jpg"
                  }
                  style={styles.avatar}
                />
                <div>
                  <div style={{ flexDirection: "row", alignItems: "center" }}>
                    <span style={{...(styles.name || {}), color: theme.text}}>
                      {profile.full_name || profile.username || "Unknown"}
                    </span>
                    {profile.is_verified && (
                      <IoCheckmark />
                    )}
                  </div>
                  {profile.username && (
                    <span
                      style={{...(styles.username || {}), color: theme.secondaryText}}
                    >
                      @{profile.username}
                    </span>
                  )}
                </div>
              </div>
              <button
                style={styles.unblockButton}
                onClick={() => handleUnblock(profile.id)}
              >
                <span style={styles.unblockText}>Unblock</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    paddingTop: 70,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  backButton: {
    position: "absolute",
    top: 65,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  list: {
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    marginTop: spacing.xl3,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  username: {
    fontSize: fontSize.sm,
  },
  unblockButton: {
    backgroundColor: "#00BFFF",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl,
  },
  unblockText: {
    color: "#fff",
    fontWeight: "600",
  },
};
