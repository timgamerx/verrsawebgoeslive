// @ts-nocheck

import { supabase } from "../components/supabase";
import {
  encryptMessage,
  decryptMessage,
  getConversationKey,
  storeConversationKey,
  generateSharedKey,
  getEncryptionKeys,
  initializeEncryption,
} from "./encryption";
import {
  V2_PREFIX,
  isV2Supported,
  isEcPublicKey,
  deriveConversationKey,
  encryptV2,
  decryptV2,
} from "./aesGcm";

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  is_read: boolean;
  message_type: string;
  is_encrypted?: boolean;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_participant: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  latest_message?: Message;
  unread_count: number;
}

export const resolveConversationKey = async (
  conversationId: string
): Promise<string | null> => {
  try {
    // Use a deterministic conversation key so both participants derive
    // the same encryption key consistently across devices/sessions.
    const sharedKey = await generateSharedKey(conversationId, conversationId);
    await storeConversationKey(conversationId, sharedKey);
    return sharedKey;
  } catch (error) {
    console.error("Error resolving conversation key:", error);
    return null;
  }
};

const otherPublicKeyCache = new Map<string, string | null>();

/**
 * AES-256-GCM key for a conversation (per-user ECDH keys). Returns null when
 * unsupported (web) or the other participant has no EC public key yet.
 */
export const resolveV2Key = async (
  conversationId: string
): Promise<Uint8Array | null> => {
  if (!isV2Supported()) return null;
  try {
    let otherKey = otherPublicKeyCache.get(conversationId);
    if (otherKey === undefined || otherKey === null) {
      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData.session?.user?.id;
      if (!me) return null;
      const { data: convo } = await supabase
        .from("conversations")
        .select("participant_1, participant_2")
        .eq("id", conversationId)
        .single();
      if (!convo) return null;
      const otherId =
        convo.participant_1 === me ? convo.participant_2 : convo.participant_1;
      const publicKey = await getUserPublicKey(otherId);
      otherKey = isEcPublicKey(publicKey) ? publicKey : null;
      if (!otherKey) return null; // don't cache misses: they may upgrade later
      otherPublicKeyCache.set(conversationId, otherKey);
    }
    return await deriveConversationKey(conversationId, otherKey);
  } catch (error) {
    console.error("Error resolving v2 key:", error);
    return null;
  }
};

/** Decrypts v2 payloads; returns null if the content is not v2. */
const tryDecryptV2 = async (
  content: string,
  conversationId: string
): Promise<string | null> => {
  if (!content.startsWith(V2_PREFIX)) return null;
  const key = await resolveV2Key(conversationId);
  if (!key) return "[Encrypted message - decryption failed]";
  try {
    return await decryptV2(content, key);
  } catch (error) {
    // Wrong key for this message (e.g. sent before this browser's key was
    // published): show the placeholder instead of raising an error.
    console.warn("Could not decrypt v2 message:", (error as any)?.name);
    return "[Encrypted message - decryption failed]";
  }
};

/**
 * Key bundle for voice notes in a 1:1 chat: AES-GCM key when available,
 * plus the legacy key so older voice notes still play.
 */
export const resolveChatKey = async (
  conversationId: string
): Promise<string | null> => {
  const legacy = await resolveConversationKey(conversationId);
  const v2 = await resolveV2Key(conversationId);
  return legacy;
};

const decryptIfNeeded = async (
  message: Message,
  conversationId: string
): Promise<Message> => {
  if (!message.is_encrypted || !message.content) return message;

  const v2 = await tryDecryptV2(message.content, conversationId);
  if (v2 !== null) return { ...message, content: v2 };

  // Some historical rows may be marked encrypted while still storing plain text.
  if (!message.content.includes(":")) return message;

  const sharedKey = await resolveConversationKey(conversationId);
  if (!sharedKey) return message;

  try {
    const decryptedContent = await decryptMessage(message.content, sharedKey);
    return { ...message, content: decryptedContent };
  } catch (error) {
    const msg = (error as any)?.message || "";
    if (String(msg).includes("Invalid encrypted message format")) {
      return message;
    }
    console.error("Error decrypting message:", error);
    return {
      ...message,
      content: "[Encrypted message - decryption failed]",
    };
  }
};

/**
 * Setup encryption for a conversation
 */
export const setupConversationEncryption = async (
  conversationId: string,
  otherUserPublicKey: string
): Promise<void> => {
  try {
    const { privateKey } = await getEncryptionKeys();
    if (!privateKey) {
      throw new Error("User encryption keys not found");
    }

    const sharedKey = await generateSharedKey(privateKey, otherUserPublicKey);
    await storeConversationKey(conversationId, sharedKey);
  } catch (error) {
    console.error("Error setting up conversation encryption:", error);
    throw error;
  }
};

/**
 * Get other user's public key from their profile
 */
export const getUserPublicKey = async (
  userId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("public_key")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user public key:", error);
      return null;
    }

    return data?.public_key || null;
  } catch (error) {
    console.error("Error in getUserPublicKey:", error);
    return null;
  }
};

/**
 * Store user's public key in their profile
 */
export const storeUserPublicKey = async (
  userId: string,
  publicKey: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ public_key: publicKey })
      .eq("id", userId);

    if (error) {
      console.error("Error storing user public key:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in storeUserPublicKey:", error);
    return false;
  }
};

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      user1_id: currentUserId,
      user2_id: otherUserId,
    });

    if (error) {
      console.error("Error getting/creating conversation:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    return null;
  }
};

/**
 * Send a message in a conversation (with encryption)
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  messageType: string = "text",
  encrypt: boolean = true
): Promise<boolean> => {
  try {
    let messageContent = content.trim();
    let isEncrypted = false;

    // Encrypt message if enabled
    if (encrypt && messageType === "text") {
      try {
        const v2Key = await resolveV2Key(conversationId);
        const sharedKey = v2Key
          ? null
          : await resolveConversationKey(conversationId);
        if (v2Key) {
          messageContent = await encryptV2(messageContent, v2Key);
          isEncrypted = true;
        } else if (sharedKey) {
          messageContent = await encryptMessage(messageContent, sharedKey);
          isEncrypted = true;
        } else {
          console.warn(
            "No encryption key found for conversation, sending unencrypted"
          );
        }
      } catch (encryptError) {
        console.error(
          "Error encrypting message, sending unencrypted:",
          encryptError
        );
      }
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: messageContent,
      message_type: messageType,
      is_encrypted: isEncrypted,
    });

    if (error) {
      console.error("Error sending message:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return false;
  }
};

/**
 * Get messages for a conversation (with decryption)
 */
export const getMessages = async (
  conversationId: string
): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const decryptedMessages = await Promise.all(
      data.map(async (message) => {
        return decryptIfNeeded(message as Message, conversationId);
      })
    );

    return decryptedMessages;
  } catch (error) {
    console.error("Error in getMessages:", error);
    return [];
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  currentUserId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return false;
  }
};

/**
 * Get all conversations for a user with details
 */
export const getUserConversations = async (
  userId: string
): Promise<ConversationWithDetails[]> => {
  try {
    // Get conversations where user is a participant
    const { data: conversationsData, error: conversationsError } =
      await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order("updated_at", { ascending: false });

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return [];
    }

    if (!conversationsData || conversationsData.length === 0) {
      return [];
    }

    // Process each conversation to get additional details
    const conversationsWithDetails = await Promise.all(
      conversationsData.map(
        async (conversation): Promise<ConversationWithDetails | null> => {
          try {
            if (!conversation || !conversation.id) {
              console.warn("Invalid conversation data:", conversation);
              return null;
            }
            const otherParticipantId =
              conversation.participant_1 === userId
                ? conversation.participant_2
                : conversation.participant_1;

            // Get other participant's profile
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, full_name, username, avatar_url")
              .eq("id", otherParticipantId)
              .single();

            // Get latest message
            const { data: latestMessageData } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            // Decrypt the latest message if it's encrypted
            let decryptedContent = latestMessageData?.content || "";
            if (latestMessageData?.is_encrypted && decryptedContent) {
              // If content is plain text, skip decryption to avoid false errors.
              if (!decryptedContent.includes(":")) {
                // Keep original content
              } else if (decryptedContent.startsWith(V2_PREFIX)) {
                decryptedContent =
                  (await tryDecryptV2(decryptedContent, conversation.id)) ??
                  decryptedContent;
              } else {
              try {
                const sharedKey = await resolveConversationKey(conversation.id);
                if (sharedKey) {
                  decryptedContent = await decryptMessage(
                    decryptedContent,
                    sharedKey
                  );
                }
              } catch (decryptError) {
                const msg = (decryptError as any)?.message || "";
                if (!String(msg).includes("Invalid encrypted message format")) {
                  console.error("Error decrypting latest message:", decryptError);
                  decryptedContent = "[Encrypted message - decryption failed]";
                }
              }
              }
            }

            // Get unread count
            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conversation.id)
              .neq("sender_id", userId)
              .eq("is_read", false);

            return {
              ...conversation,
              id: String(conversation.id || ""),
              participant_1: String(conversation.participant_1 || ""),
              participant_2: String(conversation.participant_2 || ""),
              created_at: String(conversation.created_at || ""),
              updated_at: String(conversation.updated_at || ""),
              other_participant: {
                id: String(otherParticipantId || ""),
                full_name: profileData?.full_name
                  ? String(profileData.full_name)
                  : "",
                username: profileData?.username
                  ? String(profileData.username)
                  : "",
                avatar_url: profileData?.avatar_url
                  ? String(profileData.avatar_url)
                  : "",
              },
              latest_message: latestMessageData
                ? {
                    ...latestMessageData,
                    id: String(latestMessageData.id || ""),
                    content: String(decryptedContent || ""),
                    sender_id: String(latestMessageData.sender_id || ""),
                    conversation_id: String(
                      latestMessageData.conversation_id || ""
                    ),
                    created_at: String(latestMessageData.created_at || ""),
                    message_type: String(
                      latestMessageData.message_type || "text"
                    ),
                    is_read: Boolean(latestMessageData.is_read),
                  }
                : undefined,
              unread_count: Number(unreadCount || 0),
            };
          } catch (error) {
            console.error(
              "Error processing conversation:",
              error,
              conversation
            );
            return null;
          }
        }
      )
    );

    // Filter out null values and return valid conversations
    return conversationsWithDetails.filter(
      (conv): conv is ConversationWithDetails => conv !== null
    );
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    return [];
  }
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (message: Message) => void
) => {
  const subscription = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const newMessage = payload.new as Message;
        const decryptedMessage = await decryptIfNeeded(newMessage, conversationId);
        onNewMessage(decryptedMessage);
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Subscribe to conversation updates (for real-time conversation list)
 */
export const subscribeToConversations = (
  userId: string,
  onConversationUpdate: () => void
) => {
  const subscription = supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_1.eq.${userId}`,
      },
      onConversationUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_2.eq.${userId}`,
      },
      onConversationUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
      },
      onConversationUpdate
    )
    .subscribe();

  return subscription;
};
