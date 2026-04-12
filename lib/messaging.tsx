// @ts-nocheck
// Web stub for messaging
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  encryptionStatus?: string;
}

export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ id: string; participant_1: string; participant_2: string }> {
  return {
    id: `conv_${userId1}_${userId2}`,
    participant_1: userId1,
    participant_2: userId2,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  return {
    id: `msg_${Date.now()}`,
    conversationId,
    senderId,
    text,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
}

export const sendMessageAPI = sendMessage;

export async function getMessages(conversationId: string): Promise<Message[]> {
  return [];
}

export async function getUserConversations(userId: string): Promise<any[]> {
  return [];
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  return () => {};
}

export async function getUserPublicKey(userId: string): Promise<string> {
  return "";
}

export async function setupConversationEncryption(
  conversationId: string
): Promise<void> {}

export async function storeUserPublicKey(userId: string, publicKey: string): Promise<void> {}
