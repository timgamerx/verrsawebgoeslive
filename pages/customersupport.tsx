// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useRef, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import { TbChevronLeft } from 'react-icons/tb'
import {
  supportService,
  SupportMessageWithSender,
  SupportTicket,
} from '../lib/supportService';

const CustomerSupport = () => {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SupportMessageWithSender[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const messageSubscriptionRef = useRef<any>(null);

  const handleSendMessage = async () => {
    if (message.trim() && !isSending) {
      setIsSending(true);

      const messageContent = message.trim();
      const tempId = `temp_${Date.now()}`;

      // Add message optimistically so it appears immediately
      const optimisticMessage: SupportMessageWithSender = {
        id: tempId,
        ticket_id: currentTicket?.id || "",
        sender_id: "current_user",
        sender_type: "user",
        message: messageContent,
        message_type: "text",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setMessage("");

      try {
        const result = await supportService.sendMessage(messageContent);

        if (!result.success) {
          // Remove optimistic message and restore input on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setMessage(messageContent);
          window.alert(result.error || "Failed to send message");
        }
        // On success the real-time subscription will deliver the confirmed message;
        // replace the optimistic placeholder to avoid duplicates
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessage(messageContent);
        window.alert("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
  };

  // Initialize support ticket and load messages
  useEffect(() => {
    const initializeSupport = async () => {
      setIsLoading(true);

      try {
        // Get or create a support ticket
        const ticketResult =
          await supportService.getOrCreateTicket("General Support");

        if (ticketResult.ticket) {
          setCurrentTicket(ticketResult.ticket);

          // Load existing messages
          const messagesResult = await supportService.getTicketMessages(
            ticketResult.ticket.id,
          );
          if (messagesResult.messages) {
            setMessages(messagesResult.messages);
          }

          // Subscribe to real-time updates
          const subscription = supportService.subscribeToTicketMessages(
            ticketResult.ticket.id,
            (newMessage) => {
              setMessages((prev) => {
                const confirmed = newMessage as SupportMessageWithSender;
                // Replace any optimistic placeholder with matching content
                const hasOptimistic = prev.some(
                  (m) =>
                    m.id.startsWith("temp_") &&
                    m.message === confirmed.message &&
                    m.sender_type === "user",
                );
                if (hasOptimistic) {
                  return prev.map((m) =>
                    m.id.startsWith("temp_") &&
                    m.message === confirmed.message &&
                    m.sender_type === "user"
                      ? confirmed
                      : m,
                  );
                }
                // Otherwise it's a new incoming message (e.g. agent reply)
                return [...prev, confirmed];
              });
            },
          );

          messageSubscriptionRef.current = subscription;
        } else {
          window.alert(ticketResult.error || "Failed to initialize support");
        }
      } catch (error) {
        console.error("Error initializing support:", error);
        window.alert("Failed to initialize support");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSupport();

    // Cleanup subscription on unmount
    return () => {
      if (messageSubscriptionRef.current) {
        supportService.unsubscribe(messageSubscriptionRef.current);
      }
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <div>
      <div style={{ flex: 1, backgroundColor: "#fff" }}>
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => {
              console.log("Back button pressed");
              router.back();
            }}
          >
            <TbChevronLeft />
          </button>
          <span style={styles.headerTitle}>Customer Support</span>
        </div>
        <div style={{overflowY: "auto", flex: 1}}>
          <img
            src={"/assets/../assets/customer-service.png"}
            style={{
              width: 100,
              height: 100,
              borderRadius: radius.full,
              borderWidth: 7,
              borderColor: "#cdf2ffff",
              alignSelf: "center",
              padding: spacing.md,
              marginBottom: spacing.md,
              marginTop: spacing.xl3,
            }}
          />

          <span style={styles.sectionTitle}>
            Hello, please drop a message below:
          </span>

          {/* Quick Response Options */}
          <div
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: radius.md,
              padding: spacing.base,
              marginTop: spacing.lg,
              marginBottom: spacing.md,
              height: 200,
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ flexDirection: "row", justifyContent: "space-around" }}
            >
              <button
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: radius.full,
                  padding: spacing.md,
                  alignItems: "center",
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                  width: "45%",
                  height: 40,
                }}
                onClick={() => setMessage("How do I earn here?")}
              >
                <span style={{ color: "#999" }}>How do I earn here?</span>
              </button>
              <button
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: radius.full,
                  padding: spacing.md,
                  alignItems: "center",
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                  width: "35%",
                  height: 40,
                }}
                onClick={() => setMessage("Hello there!")}
              >
                <span style={{ color: "#999" }}>Hello there!</span>
              </button>
            </div>
            <div
              style={{ flexDirection: "row", justifyContent: "space-around" }}
            >
              <button
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: radius.full,
                  padding: spacing.md,
                  alignItems: "center",
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                  width: "45%",
                  height: 40,
                }}
                onClick={() => setMessage("I need help with my account")}
              >
                <span style={{ color: "#999" }}>Account help</span>
              </button>
              <button
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: radius.full,
                  padding: spacing.md,
                  alignItems: "center",
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                  width: "35%",
                  height: 40,
                }}
                onClick={() => setMessage("Thank you!")}
              >
                <span style={{ color: "#999" }}>Thank you!</span>
              </button>
            </div>
          </div>

          {/* Messages Display */}
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
              <span style={styles.loadingText}>
                Loading your conversation...
              </span>
            </div>
          ) : messages.length > 0 ? (
            <div style={styles.messagesContainer}>
              <span style={styles.messagesTitle}>Your Messages:</span>
              {messages.map((msg) => {
                const isFromUser = msg.sender_type === "user";
                const isFromAgent = msg.sender_type === "agent";

                return (
                  <div
                    key={msg.id}
                    style={{...(styles.messageItem || {}), ...(isFromUser ? styles.userMessage : styles.agentMessage || {})}}
                  >
                    {isFromAgent && (
                      <span style={styles.senderLabel}>Support Agent</span>
                  )}
                    <span
                      style={{...(styles.messageText || {}), ...(isFromUser
                          ? styles.userMessageText
                          : styles.agentMessageText || {})}}
                    >
                      {msg.message}
                    </span>
                    <span
                      style={{...(styles.messageTime || {}), ...(isFromUser
                          ? styles.userMessageTime
                          : styles.agentMessageTime || {})}}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Fixed Input Box at Bottom */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <input
              style={styles.textInput}
              placeholder="Send a custom message..."
              placeholderTextColor="#a8a8a8ff"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
            />
          </div>
          <button
            style={{...(styles.sendButton || {}), backgroundColor:
                  message.trim() && !isSending ? "#00bfff" : "#f2f2f2ff",}}
            onClick={
              message.trim() && !isSending ? handleSendMessage : undefined
            }
            disabled={isSending}
          >
            {isSending ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : message.trim() ? (
              <IoChevronBack />
            ) : (
              <IoChevronBack />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.md, // Reduced bottom padding since input is now fixed
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: spacing.md,
    minHeight: 100,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginTop: 50,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    color: "#00bfff",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 10,
  },
  messagesContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  messagesTitle: {
    fontSize: fontSize.base,
    fontWeight: "400",
    color: "#333",
    marginBottom: spacing.md,
  },
  messageItem: {
    backgroundColor: "#00bfff",
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
    alignSelf: "flex-end",
    maxWidth: "80%",
  },
  messageText: {
    color: "#fff",
    fontSize: fontSize.base,
  },
  messageTime: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    marginBottom: spacing.lg,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: radius.full,
    minHeight: 50,
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: "#333",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: radius.full,
    padding: spacing.sm,
    marginLeft: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    width: 50,
  },
  loadingContainer: {
    padding: spacing.xl3,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: "#666",
    textAlign: "center",
  },
  userMessage: {
    backgroundColor: "#00bfff",
    alignSelf: "flex-end",
  },
  agentMessage: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-start",
  },
  senderLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: "#666",
    marginBottom: spacing.xs,
  },
  userMessageText: {
    color: "#fff",
  },
  agentMessageText: {
    color: "#333",
  },
  userMessageTime: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  agentMessageTime: {
    color: "#999",
  },
};

export default CustomerSupport;
