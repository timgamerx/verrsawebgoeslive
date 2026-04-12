// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from 'next/router';
import {
  IoHeart,
  IoShareSocial,
  IoCash,
  IoPeople,
  IoAt,
  IoPodium,
  IoPersonAdd,
  IoChatbubble,
  IoNotifications,
  IoNotificationsOutline,
  IoChevronBack,
} from "react-icons/io5";
import { MdComment } from "react-icons/md";
import { supabase } from "../components/supabase";

const NotificationItem = ({ item, onPress }) => {
  let icon;
  switch (item.type) {
    case "like":
      icon = <IoHeart size={22} color="crimson" />;
      break;
    case "share":
      icon = <IoShareSocial size={22} color="purple" />;
      break;
    case "comment":
      icon = <MdComment size={22} color="orange" />;
      break;
    case "payment":
      icon = <IoCash size={22} color="green" />;
      break;
    case "community":
      icon = <IoPeople size={22} color="#ff4500" />;
      break;
    case "engagement":
    case "mention":
      icon = <IoAt size={22} color="#1e90ff" />;
      break;
    case "monetization":
      icon = <IoPodium size={22} color="#ff69b4" />;
      break;
    case "follow":
      icon = <IoPersonAdd size={22} color="#8a2be2" />;
      break;
    case "chat":
      icon = <IoChatbubble size={22} color="#32cd32" />;
      break;
    default:
      icon = <IoNotifications size={22} color="gray" />;
  }

  return (
    <div
      style={{
        ...styles.card,
        ...(item.isRead ? {} : styles.unreadCard),
      }}
      onClick={() => onPress(item)}
    >
      <div style={styles.left}>
        <div style={styles.iconBox}>{icon}</div>
        <div style={{ flex: 1 }}>
          <p style={styles.message}>
            {item.user ? <span style={styles.bold}>{item.user} </span> : null}
            {item.message}
          </p>
          <p style={styles.time}>{item.date}, {item.time}</p>
        </div>
      </div>
      <div
        style={{
          ...styles.dot,
          backgroundColor: item.isRead ? "#ddd" : item.dotColor,
        }}
      />
    </div>
  );
};

export default function Notifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUserId = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      currentUserId.current = user.id;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((n) => {
        const meta =
          typeof n.meta === "string" ? JSON.parse(n.meta) : n.meta || {};
        return {
          id: n.id,
          type: n.type || "engagement",
          message: n.message || n.body || "",
          user: n.title || meta.actor_name || "",
          date: n.created_at
            ? new Date(n.created_at).toLocaleDateString()
            : "",
          time: n.created_at
            ? new Date(n.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          isRead: n.is_read || false,
          dotColor: n.is_read ? "#ddd" : "#007AFF",
          post_id: n.post_id || meta.content_id,
          community_id: n.community_id,
          actor_id: n.actor_id || meta.actor_id,
          meta,
        };
      });

      setNotifications(formatted);
      setUnreadCount(formatted.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markNotificationAsRead = useCallback(async (id) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUserId.current) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId.current)
      .eq("is_read", false);
  }, []);

  const handleNotificationPress = useCallback(
    async (notification) => {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      try {
        const meta = notification.meta || {};

        const navigateToPost = async (contentId) => {
          const { data } = await supabase
            .from("posts")
            .select(
              "*, profiles:user_id (full_name, username, avatar_url, is_verified)",
            )
            .eq("id", contentId)
            .single();
          if (data) {
            router.push(`/post/${contentId}`, { state: { post: data } });
          }
        };

        switch (notification.type) {
          case "comment":
          case "like":
          case "share":
          case "engagement":
            if (meta?.content_type === "community_post" && meta?.content_id) {
              router.push(
                `/community/${meta.community_id || notification.community_id}/post/${meta.content_id}`,
              );
            } else if (meta?.content_id) {
              await navigateToPost(meta.content_id);
            } else if (notification.post_id) {
              await navigateToPost(notification.post_id);
            }
            break;

          case "follow":
            if (notification.actor_id)
              router.push(`/profile/${notification.actor_id}`);
            break;

          case "community":
            if (notification.community_id)
              router.push(`/community/${notification.community_id}`);
            else if (meta?.community_id)
              router.push(`/community/${meta.community_id}`);
            break;

          case "payment":
          case "monetization":
            router.push("/payment");
            break;

          case "chat":
          case "mention":
            if (meta?.chat_id) router.push(`/chat/${meta.chat_id}`);
            else if (meta?.content_id) await navigateToPost(meta.content_id);
            break;

          default:
            if (notification.post_id)
              await navigateToPost(notification.post_id);
            else if (notification.community_id)
              router.push(`/community/${notification.community_id}`);
            else if (notification.actor_id)
              router.push(`/profile/${notification.actor_id}`);
            else if (meta?.content_id) await navigateToPost(meta.content_id);
        }
      } catch (err) {
        console.error("Navigation error:", err);
      }
    },
    [markNotificationAsRead, router],
  );

  useEffect(() => {
    fetchNotifications();

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const subscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async () => { await fetchNotifications(); },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async () => { await fetchNotifications(); },
        )
        .subscribe();

      return subscription;
    };

    let subscriptionPromise = setupSubscription();

    return () => {
      subscriptionPromise.then((sub) => {
        if (sub) sub.unsubscribe();
      });
    };
  }, [fetchNotifications]);

  const filteredData = useMemo(() => {
    if (activeTab === "All") return notifications;
    return notifications.filter((n) =>
      activeTab === "Engagements"
        ? [
            "like",
            "share",
            "community",
            "comment",
            "engagement",
            "mention",
            "follow",
            "chat",
          ].includes(n.type)
        : ["payment", "monetization"].includes(n.type),
    );
  }, [notifications, activeTab]);

  if (loading) {
    return (
      <div style={{ ...styles.container, ...styles.centered }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <IoChevronBack
          size={26}
          color="#333"
          style={{ cursor: "pointer" }}
          onClick={() => router.back()}
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={styles.headerTitle}>Notifications</span>
          {unreadCount > 0 && (
            <div style={styles.unreadBadge}>
              <span style={styles.unreadBadgeText}>{unreadCount}</span>
            </div>
          )}
        </div>
        <span
          style={styles.markAllRead}
          onClick={async () => {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true })),
            );
            setUnreadCount(0);
          }}
        >
          Mark all read
        </span>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["All", "Engagements", "Monetization"].map((tab) => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            <span
              style={{
                ...styles.tabText,
                ...(activeTab === tab ? styles.activeTabText : {}),
              }}
            >
              {tab}
            </span>
          </div>
        ))}
      </div>

      {/* Notification List */}
      <div style={styles.list}>
        {filteredData.length === 0 ? (
          <div style={styles.emptyContainer}>
            <IoNotificationsOutline size={48} color="#999" />
            <p style={styles.emptyText}>No notifications yet</p>
            <p style={styles.emptySubText}>
              When you get notifications, they'll appear here
            </p>
          </div>
        ) : (
          filteredData.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onPress={handleNotificationPress}
            />
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    minHeight: "100vh",
    fontFamily: "'Instrument Sans', sans-serif",
    paddingTop: "60px",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "16px",
    paddingRight: "16px",
    marginBottom: "12px",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "400",
    color: "#222",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  markAllRead: {
    fontSize: "14px",
    color: "#00bfff",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  tabs: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #eee",
  },
  tab: {
    paddingTop: "10px",
    paddingBottom: "10px",
    paddingLeft: "16px",
    paddingRight: "16px",
    borderRadius: "20px",
    cursor: "pointer",
    marginBottom: "4px",
  },
  activeTab: {
    backgroundColor: "#f2f2f2",
  },
  tabText: {
    fontSize: "16px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "400",
  },
  list: {
    paddingBottom: "120px",
    overflowY: "auto",
  },
  card: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: "12px",
    marginLeft: "16px",
    marginRight: "16px",
    marginTop: "8px",
    marginBottom: "8px",
    borderRadius: "12px",
    cursor: "pointer",
  },
  unreadCard: {
    backgroundColor: "#f0f8ff",
    borderLeft: "3px solid #007AFF",
  },
  left: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: "12px",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  message: {
    fontSize: "16px",
    color: "#333",
    margin: 0,
    marginBottom: "2px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  bold: {
    fontWeight: "500",
  },
  time: {
    fontSize: "12px",
    color: "#666",
    margin: 0,
    fontFamily: "'Instrument Sans', sans-serif",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
    marginLeft: "8px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "3px solid #e0e0e0",
    borderTop: "3px solid #333",
    animation: "spin 0.9s linear infinite",
  },
  loadingText: {
    marginTop: "12px",
    fontSize: "16px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptyContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: "60px",
    paddingBottom: "60px",
  },
  emptyText: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#333",
    marginTop: "16px",
    marginBottom: "4px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  emptySubText: {
    fontSize: "14px",
    color: "#666",
    textAlign: "center",
    marginTop: "8px",
    marginLeft: "32px",
    marginRight: "32px",
    fontFamily: "'Instrument Sans', sans-serif",
  },
  unreadBadge: {
    backgroundColor: "#ff3b30",
    marginLeft: "8px",
    minWidth: "22px",
    height: "22px",
    borderRadius: "11px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: "6px",
    paddingRight: "6px",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};
