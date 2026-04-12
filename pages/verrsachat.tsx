// @ts-nocheck
import { useRouter } from 'next/router';
import { FlatList } from '../lib/reactNativeShim';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { TbChevronLeft, TbChevronRight, TbDots, TbDotsVertical } from 'react-icons/tb';
import { supabase } from '../components/supabase';
import { getUserConversations } from '../lib/messaging';

type Chat = {
  id: string;
  name: string;
  message?: string;
  time?: string;
  avatar: string;
  unread?: number;
  typing?: boolean;
  userId?: string;
};

const VerrsaChat = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "contacts">("all");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [realConversations, setRealConversations] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Contacts (users you follow on Verrsa)
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchUserProfile();
    fetchConversations(true);
    fetchFollowingContacts();
  }, []);

  useEffect(() => {
    fetchConversations(false);
    fetchFollowingContacts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      setCurrentUserId(user.id);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      setCurrentUserName(
        profileData?.full_name || profileData?.username || "User",
      );
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchConversations = async (showLoader: boolean = true) => {
    try {
      if (showLoader) setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        if (showLoader) setLoading(false);
        return;
      }

      // Use the helper function to get conversations with details
      const conversationsWithDetails = await getUserConversations(user.id);

      if (!Array.isArray(conversationsWithDetails)) {
        console.warn(
          "getUserConversations did not return an array:",
          conversationsWithDetails,
        );
        setRealConversations([]);
        return;
      }

      // Transform to Chat format with extra safety checks
      const processedConversations: Chat[] = conversationsWithDetails
        .filter((conversation) => conversation && conversation.id) // Filter out invalid conversations
        .map((conversation) => ({
          id: String(conversation.id || ""),
          userId: String(conversation.other_participant?.id || ""),
          name: String(
            conversation.other_participant?.full_name ||
              conversation.other_participant?.username ||
              "Unknown User",
          ),
          message: String(
            conversation.latest_message?.content || "No messages yet",
          ),
          time: conversation.latest_message?.created_at
            ? String(
                new Date(
                  conversation.latest_message.created_at,
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              )
            : "",
          avatar: String(conversation.other_participant?.avatar_url || ""),
          unread: Number(conversation.unread_count || 0),
        }));

      setRealConversations(processedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fetchFollowingContacts = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      // Fetch users that the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select(
          `
          following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `,
        )
        .eq("follower_id", user.id);

      if (followingError) {
        console.error("Error fetching following contacts:", followingError);
        return;
      }

      // Transform to Chat format
      const contactsList: Chat[] = followingData
        .filter((item) => item.profiles) // Filter out null profiles
        .map((item) => {
          const profile = Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles;
          return {
            id: String(profile?.id || ""),
            userId: String(profile?.id || ""),
            name: String(profile?.full_name || profile?.username || "User"),
            message: String(profile?.bio || "Tap to start messaging"),
            avatar: String(profile?.avatar_url || ""),
          };
        });

      setContacts(contactsList);
    } catch (error) {
      console.error("Error fetching following contacts:", error);
    }
  };

  const getData = () => {
    try {
      const source =
        activeTab === "all"
          ? Array.isArray(realConversations)
            ? realConversations
            : []
          : Array.isArray(contacts)
            ? contacts
            : [];

      const q = searchQuery.trim().toLowerCase();
      if (!q) return source;

      return source.filter((item) => {
        const name = String(item.name || "").toLowerCase();
        const message = String(item.message || "").toLowerCase();
        return name.includes(q) || message.includes(q);
      });
    } catch (error) {
      console.error("Error in getData:", error);
      return [];
    }
  };

  const renderChat = ({ item }: { item: Chat }) => {
    // Safety check - ensure item exists and has required properties
    if (!item || typeof item !== "object") {
      console.warn("Invalid chat item:", item);
      return null;
    }

    // Ensure all text values are strings
    const safeName = String(item.name || "Unknown User");
    const safeMessage = item.message ? String(item.message).trim() : "";
    const safeTime = item.time ? String(item.time).trim() : "";
    const safeUnread =
      typeof item.unread === "number" && item.unread > 0 ? item.unread : 0;

    return (
      <button
        style={styles.chatRow}
        onClick={() => {
          if (item.userId) {
            router.push(`/individualchat?userId=${item.userId}`);
          }
        }}
      >
        <img
          src={
            item.avatar ? { uri: item.avatar } : "/assets/../assets/avatar.jpg"
          }
          style={styles.avatar}
        />
        <div style={{ flex: 1 }}>
          <span style={styles.name}>{safeName}</span>
          {safeMessage.length > 0 && (
            <span style={{...(styles.message || {}), ...(item.typing ? { color: "#00AEEF" } : {})}}>
              {safeMessage}
            </span>
          )}
        </div>
        <div style={styles.rightSide}>
          {safeTime.length > 0 && <span style={styles.time}>{safeTime}</span>}
          {safeUnread > 0 && (
            <div style={styles.unreadBadge}>
              <span style={styles.unreadText}>{safeUnread.toString()}</span>
            </div>
          )}
        </div>
      </button>
    );
  };
  return (
    <div style={styles.container}>
      {/* Header */}
      {/* Back Button */}
      <button
        style={styles.backButton}
        onClick={() => router.back()}
      >
        <TbChevronLeft />
      </button>
      <span style={styles.hello}>Hello</span>
      <span style={styles.username}>{currentUserName || "User"}</span>

      {/* Search */}
      <div style={styles.searchBox}>
        <input
          placeholder="Search conversations"
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["All chats", "Contacts"].map((tab) => {
          const key = tab.toLowerCase().split(" ")[0] as "all" | "contacts";
          return (
            <button key={key} onClick={() => setActiveTab(key)}>
              <span
                style={{...(styles.tabText || {}), ...(activeTab === key ? styles.activeTab : {})}}
              >
                {tab}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <span style={styles.loadingText}>Loading conversations...</span>
        </div>
      ) : (
        <FlatList
          data={getData().filter(
            (item) => item && typeof item === "object" && item.id,
          )}
          renderItem={renderChat}
          keyExtractor={(item) => String(item.id || Math.random())}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          ListEmptyComponent={() => (
            <div style={styles.emptyContainer}>
              <span style={styles.emptyText}>
                {activeTab === "all"
                  ? "No conversations yet. Start messaging someone!"
                  : "No contacts available."}
              </span>
            </div>
                )}
        />
      )}
    </div>
  );
};

export default VerrsaChat;

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.lg,
  },
  hello: { fontSize: fontSize.xl2, fontWeight: "500", marginTop: 50, marginLeft: 50 },
  username: {
    fontSize: fontSize.xl,
    fontWeight: "500",
    marginBottom: spacing.base,
    color: "#666",
    marginLeft: 50,
  },
  searchBox: {
    backgroundColor: "#f1f1f1",
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    marginBottom: spacing.base,
  },
  searchInput: { fontSize: fontSize.md2 },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  tabText: {
    fontSize: fontSize.md2,
    color: "gray",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: 25,
    paddingRight: 25,
  },
  activeTab: {
    backgroundColor: "#00AEEF",
    color: "#fff",
    borderRadius: radius.xl2,
    overflow: "hidden",
  },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: "#f2f2f2",
  },
  avatar: { width: 50, height: 50, borderRadius: radius.full, marginRight: spacing.md },
  name: { fontSize: fontSize.base, fontWeight: "400" },
  message: { fontSize: fontSize.md, color: "gray" },
  rightSide: { alignItems: "flex-end" },
  time: { fontSize: fontSize.sm, color: "gray", marginBottom: spacing.xs },
  unreadBadge: {
    backgroundColor: "#00AEEF",
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.px,
    paddingBottom: spacing.px,
  },
  unreadText: { color: "#fff", fontSize: fontSize.sm, fontWeight: "bold" },

  backButton: {
    position: "absolute",
    top: 82,
    left: 20,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: "#999",
    textAlign: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
};
