// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoArrowBack, IoChevronBack } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';

const CommunityMembers = () => {
  const router = useRouter();
  const { communityId } = router.query as { communityId?: string };
  const { theme, colors } = useTheme();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    if (!communityId) return;
    getCurrentUser();
    fetchCommunity();
    fetchMembers();
  }, [communityId]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchCommunity = async () => {
    try {
      const { data, error } = await supabase
        .from("community")
        .select("*")
        .eq("id", communityId)
        .single();

      if (error) {
        console.error("Error fetching community:", error);
      } else {
        setCommunity(data);
      }
    } catch (error) {
      console.error("Error in fetchCommunity:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      console.log("Fetching members for community:", communityId);

      const { data: membersData, error: membersError } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", communityId)
        .order("joined_at", { ascending: false });

      if (membersError) {
        console.error("Error fetching members:", membersError);
        setMembers([]);
        return;
      }

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((member) => member.user_id);

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, is_verified")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          setMembers(membersData);
        } else {
          const membersWithProfiles = membersData.map((member) => ({
            ...member,
            profiles:
              profilesData?.find((profile) => profile.id === member.user_id) ||
              null,
          }));

          setMembers(membersWithProfiles);
        }
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error in fetchMembers:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMembers();
    } catch (error) {
      console.error("Error refreshing members:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from this community?`)) {
      try {
        const { error } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", communityId)
          .eq("user_id", memberId);

        if (error) {
          console.error("Error removing member:", error);
          window.alert("Failed to remove member");
          return;
        }

        window.alert("Member removed successfully");
        fetchMembers();
      } catch (error) {
        console.error("Error removing member:", error);
        window.alert("Failed to remove member");
      }
    }
  };

  const navigateToProfile = (userId: string) => {
    router.push("/user-profile");
  };

  if (loading) {
    return (
      <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
        <div
          style={{...(styles.header || {}), backgroundColor: theme.background,
              borderBottomColor: theme.border,}}
        >
          <button
            onClick={() => router.back()}
            style={styles.backButton}
          >
            <IoArrowBack />
          </button>
          <span style={{...(styles.headerTitle || {}), color: theme.text}}>
            Members
          </span>
          <div style={{ width: 24 }} />
        </div>
        <span
          style={{
            margin: spacing.xl2,
            color: theme.secondaryText,
            textAlign: "center",
          }}
        >
          Loading members...
        </span>
      </div>
    );
  }

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      <div
        style={{...(styles.header || {}), backgroundColor: theme.background,
            borderBottomColor: theme.border,}}
      >
        <button
          onClick={() => router.back()}
          style={styles.backButton}
        >
          <IoArrowBack />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>Members</span>
        <div style={{ width: 24 }} />
      </div>

      <div
        style={{...(styles.statsContainer || {}), backgroundColor: theme.cardBackground,
            borderBottomColor: theme.border,}}
      >
        <span style={{...(styles.communityName || {}), color: theme.text}}>
          {communityName}
        </span>
        <span style={{...(styles.memberCount || {}), color: theme.secondaryText}}>
          {members.length} {members.length === 1 ? "Member" : "Members"}
        </span>
      </div>

      <div style={{...(styles.scrollView), overflowY: "auto"}}
            tintColor={theme.accent || "#00BFFF"}
      >
        {members.length === 0 ? (
          <div style={styles.emptyContainer}>
            <MdCheck />
            <span style={{...(styles.emptyText || {}), color: theme.secondaryText}}>
              No members yet
            </span>
          </div>
        ) : (
          members.map((member) => (
            <button
              key={member.user_id}
              style={{...(styles.memberCard || {}), backgroundColor: theme.background,
                  borderBottomColor: theme.border,}}
              onClick={() => navigateToProfile(member.user_id)}
            >
              <div style={styles.memberInfo}>
                <img
                  src={
                    member.profiles?.avatar_url
                      ? { uri: member.profiles.avatar_url }
                      : "/assets/../assets/avatar.jpg"
                  }
                  style={styles.avatar}
                />
                <div style={styles.memberDetails}>
                  <div style={styles.nameContainer}>
                    <span style={{...(styles.memberName || {}), color: theme.text}}>
                      {member.profiles?.full_name ||
                        member.profiles?.username ||
                        "Unknown User"}
                    </span>
                    {member.profiles?.is_verified && (
                      <VerificationBadge size={16} style={{ marginLeft: spacing.xs }} />
                    )}
                    {member.user_id === community?.created_by && (
                      <div
                        style={{...(styles.ownerBadge || {}), backgroundColor: theme.accent || "#00BFFF"}}
                      >
                        <span style={styles.ownerText}>Owner</span>
                      </div>
                    )}
                  </div>
                  <span
                    style={{...(styles.username || {}), color: theme.secondaryText}}
                  >
                    @{member.profiles?.username || "unknown"}
                  </span>
                  <span
                    style={{...(styles.joinedDate || {}), color: theme.secondaryText}}
                  >
                    Joined{" "}
                    {new Date(member.joined_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Only show remove button if current user is owner and member is not owner */}
              {currentUser?.id === community?.created_by &&
                member.user_id !== community?.created_by && (
                  <button
                    style={styles.removeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(
                        member.user_id,
                        member.profiles?.full_name ||
                          member.profiles?.username ||
                          "this user",
                      );
                    }}
                  >
                    <MdCheck />
                  </button>
                    )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityMembers;

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.base,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: "#333",
  },
  statsContainer: {
    padding: spacing.base,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  communityName: {
    fontSize: fontSize.lg,
    fontWeight: "500",
    color: "#333",
    marginBottom: spacing.xs,
  },
  memberCount: {
    fontSize: fontSize.md,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl3,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: "#999",
    marginTop: spacing.base,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.base,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  memberDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  memberName: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: "#333",
  },
  username: {
    fontSize: fontSize.md,
    color: "#666",
    marginBottom: spacing.px,
  },
  joinedDate: {
    fontSize: fontSize.sm,
    color: "#999",
  },
  ownerBadge: {
    backgroundColor: "#00BFFF",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
    borderRadius: radius.xs,
    marginLeft: spacing.sm,
  },
  ownerText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  removeButton: {
    padding: spacing.sm,
  },
};
