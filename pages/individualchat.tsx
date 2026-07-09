// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoAttach, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoLockClosed, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSend, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import {
  getOrCreateConversation,
  sendMessage as sendMessageAPI,
  getMessages,
  markMessagesAsRead,
  subscribeToMessages,
  Message as MessageType,
  getUserPublicKey,
  setupConversationEncryption,
  storeUserPublicKey,
} from '../lib/messaging';
import { initializeEncryption } from '../lib/encryption';
import { sendNewMessageNotification } from '../lib/pushNotifications';

type IndividualChatRouteProp = RouteProp<RootStackParamList, "IndividualChat">;

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
}

const IndividualChat = () => {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : "";
  const userName =
    typeof router.query.userName === "string" ? router.query.userName : "";
  const userAvatar =
    typeof router.query.userAvatar === "string" ? router.query.userAvatar : "";
  

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [encryptionReady, setEncryptionReady] = useState(false);

  const flatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      const unsubscribe = setupMessageSubscription();
      return () => {
        unsubscribe?.();
      };
    }
  }, [conversationId]);

  // Online status: fetch once and subscribe to profile updates for target user
  useEffect(() => {
    if (!userId) return;

    const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes window

    const computeOnlineStatus = (devices: any[]) => {
      if (!Array.isArray(devices) || devices.length === 0) {
        setIsOnline(false);
        setLastSeen(null);
        return;
      }

      let latestTs: number | null = null;
      devices.forEach((d) => {
        const ts = d?.last_active ? new Date(d.last_active).getTime() : NaN;
        if (!isNaN(ts)) {
          if (latestTs === null || ts > latestTs) {
            latestTs = ts;
          }
        }
      });

      if (latestTs) {
        const online = Date.now() - latestTs < ACTIVE_THRESHOLD_MS;
        setIsOnline(online);
        setLastSeen(new Date(latestTs).toISOString());
      } else {
        setIsOnline(false);
        setLastSeen(null);
      }
    };

    const fetchStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("device_info")
          .eq("id", userId)
          .single();
        const devices = profile?.device_info || [];
        computeOnlineStatus(devices);
      } catch (err) {
        console.error("Error fetching online status:", err);
      }
    };

    // Initial fetch
    fetchStatus();

    // Subscribe to profile updates for realtime changes
    const channel = supabase
      .channel(`profiles:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          const devices = payload?.new?.device_info || [];
          computeOnlineStatus(devices);
        },
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [userId]);

  const initializeChat = async () => {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.alert("Unable to get current user");
        return;
      }

      setCurrentUserId(user.id);

      // Fetch current user's profile for notification sender info
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", user.id)
          .single();
        if (profileData) {
          setCurrentUserName(
            profileData.full_name || profileData.username || "User",
          );
          setCurrentUserAvatar(profileData.avatar_url || "");
        }
      } catch (profileErr) {
        console.error("Error fetching sender profile:", profileErr);
      }

      // Initialize encryption for current user
      try {
        const { publicKey } = await initializeEncryption();
        // Store public key in user's profile
        await storeUserPublicKey(user.id, publicKey);
      } catch (encryptError) {
        console.error("Error initializing encryption:", encryptError);
        window.alert("Encryption setup failed. Messages will be sent unencrypted.");
      }

      // Get or create conversation using helper function
      const convId = await getOrCreateConversation(user.id, userId);

      if (!convId) {
        window.alert("Unable to start conversation");
        return;
      }

      setConversationId(convId);

      // Setup encryption for this conversation
      try {
        const otherUserPublicKey = await getUserPublicKey(userId);
        if (otherUserPublicKey) {
          await setupConversationEncryption(convId, otherUserPublicKey);
          setEncryptionReady(true);
        } else {
          console.warn(
            "Other user has no public key, messages will be unencrypted",
          );
          setEncryptionReady(false);
        }
      } catch (encryptError) {
        console.error(
          "Error setting up conversation encryption:",
          encryptError,
        );
        setEncryptionReady(false);
      }

    } catch (error) {
      console.error("Error initializing chat:", error);
      window.alert("Unable to initialize chat");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const messagesData = await getMessages(conversationId);
      setMessages(messagesData);

      // Mark messages as read
      if (currentUserId) {
        await markMessagesAsRead(conversationId, currentUserId);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupMessageSubscription = () => {
    if (!conversationId) return;

    const subscription = subscribeToMessages(
      conversationId,
      (newMessage: MessageType) => {
        setMessages((prev) => {
          // Check if this message already exists (to avoid duplicates)
          const existingMessage = prev.find(
            (msg) =>
              msg.id === newMessage.id ||
              (msg.content === newMessage.content &&
                msg.sender_id === newMessage.sender_id &&
                Math.abs(
                  new Date(msg.created_at).getTime() -
                    new Date(newMessage.created_at).getTime(),
                ) < 5000),
          );

          if (existingMessage) {
            // Replace optimistic message with real message
            return prev.map((msg) =>
              msg.id.startsWith("temp_") &&
              msg.content === newMessage.content &&
              msg.sender_id === newMessage.sender_id
                ? newMessage
                : msg,
            );
          }

          // Add new message if it doesn't exist
          return [...prev, newMessage];
        });

        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Mark as read if not sent by current user
        if (
          newMessage.sender_id !== currentUserId &&
          conversationId &&
          currentUserId
        ) {
          markMessagesAsRead(conversationId, currentUserId);
        }
      },
    );

    return () => {
      subscription?.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUserId || sending) {
      return;
    }

    setSending(true);
    const messageContent = newMessage.trim();

    // Clear input immediately
    setNewMessage("");

    // Create optimistic message
    const optimisticMessage: MessageType = {
      id: `temp_${Date.now()}`, // Temporary ID
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: messageContent,
      message_type: "text",
      created_at: new Date().toISOString(),
      is_read: false,
    };

    // Add message optimistically to UI
    setMessages((prev) => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const success = await sendMessageAPI(
        conversationId,
        currentUserId,
        messageContent,
        "text",
      );

      if (!success) {
        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id),
        );
        window.alert("Failed to send message");
        setNewMessage(messageContent); // Restore message text
        return;
      }

      // The real message will come through the subscription and replace the optimistic one
      // Remove the optimistic message when the real one arrives (handled by subscription)

      // Send push notification to the recipient
      try {
        await sendNewMessageNotification(
          userId,
          currentUserName || "Someone",
          currentUserId,
          messageContent,
          currentUserAvatar,
        );
      } catch (notifErr) {
        // Non-critical — don't surface to user
        console.error("Error sending message notification:", notifErr);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );
      window.alert("Failed to send message");
      setNewMessage(messageContent); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    const isOptimistic = item.id.startsWith("temp_");

    return (
      <div
        style={{...(styles.messageContainer || {}), ...(isOwnMessage ? styles.ownMessage : styles.otherMessage || {})}}
      >
        <div
          style={{...(styles.messageBubble || {}), ...(isOwnMessage ? styles.ownBubble : styles.otherBubble || {}), ...(isOptimistic ? styles.optimisticMessage : {})}}
        >
          <span
            style={{...(styles.messageText || {}), ...(isOwnMessage ? styles.ownMessageText : styles.otherMessageText || {}), ...(isOptimistic ? styles.optimisticText : {})}}
          >
            {item.content || ""}
          </span>
          <span
            style={{...(styles.messageTime || {}), ...(isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime || {})}}
          >
            {item.created_at ? formatTime(item.created_at) : ""}
          </span>
        </div>
      </div>
    );
  };

  const renderEmptyList = () => (
    <div style={styles.emptyContainer}>
      <span style={styles.emptyText}>
        Start a conversation with {userName || "this user"}
      </span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <IoArrowBack />
        </button>

        <div style={styles.headerContent}>
          <img
            src={userAvatar || "/avatar.png"}
            style={styles.headerAvatar}
          />
          <div style={styles.headerInfo}>
            <div style={styles.headerNameRow}>
              <span style={styles.headerName}>
                {userName || "Unknown User"}
              </span>
              {encryptionReady && (
                <IoLockClosed size={14} color="#34c759" style={{ marginLeft: 4 }} />
              )}
            </div>
            <span
              style={{...(styles.headerStatus || {}), ...(isOnline ? styles.onlineStatus : styles.offlineStatus || {})}}
            >
              {isOnline ? "Online" : "Offline"}
              {encryptionReady && " • End-to-end encrypted"}
            </span>
          </div>
        </div>

        <button
          onClick={() => window.alert("Voice call feature coming soon!")}
          style={styles.headerAction}
        >
          <IoMic size={22} color="#333" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={flatListRef}
        style={{ flex: 1, overflowY: "auto", padding: `0 ${spacing.base}px` }}
      >
        {messages.length === 0 ? renderEmptyList() : messages.map((item) => (
          <div key={item.id}>{renderMessage({ item })}</div>
        ))}
      </div>

      {/* Input */}
      <div style={styles.inputContainer}>
        <button
          style={styles.attachButton}
          onClick={() => window.alert("Image and file attachments coming soon!")}
        >
          <IoAttach size={20} color="#666" />
        </button>

        <textarea
          style={styles.textInput as any}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
        />

        <button
          style={{ ...styles.sendButton, ...(sending || !newMessage.trim() ? styles.sendButtonDisabled : {}) } as any}
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
        >
          <IoSend size={18} color={sending || !newMessage.trim() ? "#999" : "#fff"} />
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.base,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lockIcon: {
    marginLeft: spacing.xs,
  },
  headerName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#111",
  },
  headerStatus: {
    fontSize: fontSize.sm,
    marginTop: spacing.px,
  },
  onlineStatus: {
    color: "#34c759", // iOS green
  },
  offlineStatus: {
    color: "#8e8e93", // iOS gray
  },
  headerAction: {
    padding: spacing.xs,
  },
  messagesContainer: {
    padding: spacing.base,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.base,
    color: "#999",
    textAlign: "center",
  },
  messageContainer: {
    marginTop: spacing.px,
    marginBottom: spacing.px,
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: spacing.md,
    borderRadius: radius.xl2,
  },
  ownBubble: {
    backgroundColor: "#00BFFF",
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#fff",
  },
  otherMessageText: {
    color: "#111",
  },
  messageTime: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  ownMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherMessageTime: {
    color: "#999",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: radius.xl2,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: "#f9f9f9",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    backgroundColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  optimisticText: {
    fontStyle: "italic",
  },
};

export default IndividualChat;
