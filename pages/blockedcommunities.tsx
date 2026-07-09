// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'

interface Community {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export default function BlockedCommunities() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const [blockedCommunities, setBlockedCommunities] = useState<Community[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlockedCommunities = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.alert("You must be logged in to view blocked communities");
        return;
      }

      const { data: blockedRows, error: blockedError } = await supabase
        .from("blocked_communities")
        .select("community_id")
        .eq("blocked_by", user.id);

      if (blockedError) throw blockedError;
      const communityIds = (blockedRows || []).map((r: any) => r.community_id);

      if (communityIds.length === 0) {
        setBlockedCommunities([]);
        return;
      }

      const { data: communities, error: communitiesError } = await supabase
        .from("community")
        .select("id, name, avatar_url")
        .in("id", communityIds);

      if (communitiesError) throw communitiesError;
      setBlockedCommunities(communities || []);
    } catch (err: any) {
      // Handle missing table gracefully
      if (err?.code === "PGRST205") {
        window.alert("Blocked communities isn't set up yet.");
      } else {
        console.error("Error loading blocked communities:", err);
        window.alert("Failed to load blocked communities. Please try again.");
      }
    }
  };

  useEffect(() => {
    loadBlockedCommunities();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlockedCommunities();
    setRefreshing(false);
  };

  const handleUnblock = async (communityId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("blocked_communities")
        .delete()
        .eq("community_id", communityId)
        .eq("blocked_by", user.id);
      if (error) throw error;

      setBlockedCommunities((prev) => prev.filter((c) => c.id !== communityId));
      window.alert("Community has been unblocked.");
    } catch (err: any) {
      if (err?.code === "PGRST205") {
        window.alert("Blocked communities isn't set up yet.");
      } else {
        console.error("Error unblocking community:", err);
        window.alert("Failed to unblock. Please try again.");
      }
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

      <span style={{...(styles.title || {}), color: theme.text}}>
        Blocked Communities
      </span>

      <div style={{...(styles.list), overflowY: "auto"}}
      >
        {blockedCommunities.length === 0 ? (
          <div style={styles.emptyState}>
            <IoChevronBack />
            <span style={{ color: theme.secondaryText, marginTop: spacing.sm }}>
              You haven't blocked any communities.
            </span>
          </div>
        ) : (
          blockedCommunities.map((community) => (
            <div
              key={community.id}
              style={{...(styles.item || {}), borderColor: theme.border}}
            >
              <div style={styles.itemLeft}>
                <img
                  src={
                    community.avatar_url
                      ? { uri: community.avatar_url }
                      : "/assets/../assets/avatar.jpg"
                  }
                  style={styles.avatar}
                />
                <div>
                  <span style={{...(styles.name || {}), color: theme.text}}>
                    {community.name}
                  </span>
                </div>
              </div>
              <button
                style={styles.unblockButton}
                onClick={() => handleUnblock(community.id)}
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
