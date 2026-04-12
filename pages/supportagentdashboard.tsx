// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import {
  supportService,
  SupportTicket,
  SupportMessageWithSender,
} from '../lib/supportService';
import { emailService, emailTemplates } from '../lib/emailService';
import { useTheme } from '../context/ThemeProvider';
import { supabase } from '../components/supabase';
import { TbChevronLeft } from 'react-icons/tb'
import { MdCheck } from 'react-icons/md'

const SupportAgentDashboard = () => {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [messages, setMessages] = useState<SupportMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [customerName, setCustomerName] = useState("Customer");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const { theme, colors } = useTheme();
  const isDark = theme.background === "#121212";
  const selectedTicketBackground = isDark ? "#0f2d3d" : "#e3f2fd";
  const userMessageBackground = isDark ? "#1d2d38" : "#e3f2fd";

  // Load all support tickets
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const ticketsResult = await supportService.getAllTickets();
      if (ticketsResult.tickets) {
        setTickets(ticketsResult.tickets);
      } else {
        window.alert(/* Alert: */ 
          "Error",
          ticketsResult.error || "Failed to load support tickets",
        );
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
      window.alert("Failed to load support tickets");
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for selected ticket
  const loadTicketMessages = async (ticketId: string) => {
    try {
      const messagesResult = await supportService.getTicketMessages(ticketId);
      if (messagesResult.messages) {
        setMessages(messagesResult.messages);

        // Subscribe to real-time updates
        if (messageSubscriptionRef.current) {
          supportService.unsubscribe(messageSubscriptionRef.current);
        }

        const subscription = supportService.subscribeToTicketMessages(
          ticketId,
          async (newMessage) => {
            setMessages((prev) => [
              ...prev,
              newMessage as SupportMessageWithSender,
            ]);
            // Send email to hello@verrsa.org when a new support message is received (from user)
            if (newMessage && newMessage.sender_type === "user") {
              try {
                const template = {
                  to: "hello@verrsa.org",
                  subject: `New Support Message Received`,
                  htmlContent: `<p>A new support message was received:</p><p><b>Message:</b> ${newMessage.message}</p><p><b>Ticket Subject:</b> ${selectedTicket?.subject || "General Support"}</p><p><b>Time:</b> ${new Date(newMessage.created_at).toLocaleString()}</p>`,
                  textContent: `A new support message was received.\nMessage: ${newMessage.message}\nTicket Subject: ${selectedTicket?.subject || "General Support"}\nTime: ${new Date(newMessage.created_at).toLocaleString()}`,
                };
                await emailService.sendEmail(template);
              } catch (e) {
                console.error("Failed to send support notification email:", e);
              }
            }
          },
        );

        messageSubscriptionRef.current = subscription;
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      window.alert("Failed to load messages");
    }
  };

  // Send agent response
  const sendAgentResponse = async () => {
    if (!selectedTicket || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const result = await supportService.sendAgentMessage(
        selectedTicket.id,
        newMessage.trim(),
      );

      if (result.success) {
        setNewMessage("");
        // Message will be added via real-time subscription
      } else {
        window.alert(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending response:", error);
      window.alert("Failed to send response");
    } finally {
      setIsSending(false);
    }
  };

  // Update ticket status
  const updateTicketStatus = async (
    status: "open" | "in_progress" | "resolved" | "closed",
  ) => {
    if (!selectedTicket) return;

    try {
      const result = await supportService.updateTicketStatus(
        selectedTicket.id,
        status,
      );
      if (result.success) {
        setSelectedTicket({ ...selectedTicket, status });
        loadTickets(); // Refresh tickets list
      } else {
        window.alert(result.error || "Failed to update ticket status");
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      window.alert("Failed to update ticket status");
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadTickets();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadTickets();

    return () => {
      if (messageSubscriptionRef.current) {
        supportService.unsubscribe(messageSubscriptionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketMessages(selectedTicket.id);

      const loadCustomerName = async () => {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", selectedTicket.user_id)
            .single();

          setCustomerName(
            profile?.full_name || profile?.username || "Customer",
          );
        } catch (error) {
          console.error("Error loading customer name:", error);
          setCustomerName("Customer");
        }
      };

      loadCustomerName();
    } else {
      setCustomerName("Customer");
    }
  }, [selectedTicket]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderTicketsList = () => (
    <div style={styles.ticketsContainer}>
      <span style={{...(styles.sectionTitle || {}), color: theme.text}}>Support Tickets</span>
      <div style={{...(styles.ticketsList), overflowY: "auto"}}
            tintColor={theme.accent}
      >
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            style={{...(styles.ticketItem || {}), backgroundColor: theme.cardBackground,
                borderColor: theme.border, ...(selectedTicket?.id === ticket.id ? styles.selectedTicket : {}), ...(selectedTicket?.id === ticket.id ? {
                backgroundColor: selectedTicketBackground,
                borderColor: theme.accent,
              } : {})}}
            onClick={() => setSelectedTicket(ticket)}
          >
            <div style={styles.ticketHeader}>
              <span style={{...(styles.ticketSubject || {}), color: theme.text}}>
                {ticket.subject || "General Support"}
              </span>
              <div
                style={{...(styles.statusBadge || {}), backgroundColor: getStatusColor(ticket.status)}}
              >
                <span style={styles.statusText}>
                  {ticket.status.toUpperCase()}
                </span>
              </div>
            </div>
            <span style={{...(styles.ticketTime || {}), color: theme.secondaryText}}>
              {new Date(ticket.updated_at).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderConversation = () => {
    if (!selectedTicket) {
      return (
        <div style={styles.noSelectionContainer}>
          <MdCheck />
          <span style={{...(styles.noSelectionText || {}), color: theme.secondaryText}}>
            Select a ticket to view conversation
          </span>
        </div>
      );
    }

    return (
      <div style={styles.conversationContainer}>
        <div
          style={{...(styles.conversationHeader || {}), backgroundColor: theme.cardBackground,
              borderBottomColor: theme.border,}}
        >
          <span style={{...(styles.conversationTitle || {}), color: theme.text}}>
            {selectedTicket.subject || "General Support"}
          </span>
          <div style={styles.ticketActions}>
            <button
              style={{...(styles.actionButton || {}), backgroundColor: "#ff9500"}}
              onClick={() => updateTicketStatus("in_progress")}
            >
              <span style={styles.actionButtonText}>In Progress</span>
            </button>
            <button
              style={{...(styles.actionButton || {}), backgroundColor: "#34c759"}}
              onClick={() => updateTicketStatus("resolved")}
            >
              <span style={styles.actionButtonText}>Resolve</span>
            </button>
          </div>
        </div>

        <div style={{overflowY: "auto", flex: 1}}>
          {messages.map((msg) => {
            const isFromUser = msg.sender_type === "user";
            const isFromAgent = msg.sender_type === "agent";

            return (
              <div
                key={msg.id}
                style={{...(styles.messageItem || {}), ...(isFromUser ? styles.userMessage : styles.agentMessage || {}), ...(isFromUser ? { backgroundColor: userMessageBackground } : {})}}
              >
                <span
                  style={{...(styles.senderLabel || {}), color: isFromUser ? theme.secondaryText : "#eaf9ff"}}
                >
                  {isFromUser ? customerName : "Support Agent"}
                </span>
                <span
                  style={{...(styles.messageText || {}), ...(isFromUser
                      ? styles.userMessageText
                      : styles.agentMessageText || {}), color: isFromUser ? (isDark ? "#fff" : "#333") : "#fff"}}
                >
                  {msg.message}
                </span>
                <span
                  style={{...(styles.messageTime || {}), color: isFromUser ? theme.secondaryText : "#d7f4ff"}}
                >
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{...(styles.inputContainer || {}), backgroundColor: theme.cardBackground,
              borderTopColor: theme.border,}}
        >
          <div
            style={{...(styles.inputWrapper || {}), backgroundColor: theme.searchBackground,
                borderColor: theme.border,}}
          >
            <input
              style={{...(styles.textInput || {}), color: theme.text}}
              placeholder="Type your response..."
              placeholderTextColor={theme.secondaryText}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              multiline
              maxLength={1000}
            />
          </div>
          <button
            style={{...(styles.sendButton || {}), backgroundColor:
                  newMessage.trim() && !isSending
                    ? theme.accent
                    : theme.searchBackground,}}
            onClick={sendAgentResponse}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
            ) : (
              <IoChevronBack />
            )}
          </button>
        </div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#ff3b30";
      case "in_progress":
        return "#ff9500";
      case "resolved":
        return "#34c759";
      case "closed":
        return "#8e8e93";
      default:
        return "#8e8e93";
    }
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      <div
        style={{...(styles.header || {}), backgroundColor: theme.background,
            borderBottomColor: theme.border,}}
      >
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <TbChevronLeft />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>Support Dashboard</span>
      </div>

      {isLoading ? (
        <div style={styles.loadingContainer}>
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          <span style={{...(styles.loadingText || {}), color: theme.text}}>Loading support tickets...</span>
        </div>
      ) : (
        <div style={styles.dashboardContent}>
          <div
            style={{...(styles.leftPanel || {}), borderRightColor: theme.border}}
          >
            {renderTicketsList()}
          </div>
          <div style={styles.rightPanel}>{renderConversation()}</div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    left: 15,
    top: 50,
  },
  dashboardContent: {
    flex: 1,
    flexDirection: "row",
  },
  leftPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  rightPanel: {
    flex: 2,
  },
  ticketsContainer: {
    flex: 1,
    padding: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.base,
    color: "#333",
  },
  ticketsList: {
    flex: 1,
  },
  ticketItem: {
    backgroundColor: "#f8f9fa",
    padding: spacing.base,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedTicket: {
    backgroundColor: "#e3f2fd",
    borderColor: "#00bfff",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  ticketSubject: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: "#fff",
  },
  ticketTime: {
    fontSize: fontSize.sm,
    color: "#666",
  },
  conversationContainer: {
    flex: 1,
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl3,
  },
  noSelectionText: {
    fontSize: fontSize.base,
    color: "#666",
    textAlign: "center",
    marginTop: spacing.base,
  },
  conversationHeader: {
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  conversationTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#333",
    marginBottom: spacing.md,
  },
  ticketActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.sm,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: "#fff",
  },
  messagesContainer: {
    flex: 1,
    padding: spacing.base,
  },
  messageItem: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    maxWidth: "80%",
  },
  userMessage: {
    backgroundColor: "#e3f2fd",
    alignSelf: "flex-start",
  },
  agentMessage: {
    backgroundColor: "#00bfff",
    alignSelf: "flex-end",
  },
  senderLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: "#666",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  userMessageText: {
    color: "#333",
  },
  agentMessageText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: "#999",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radius.xl2,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "#fff",
  },
  textInput: {
    fontSize: fontSize.md,
    color: "#333",
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl3,
  },
  loadingText: {
    marginTop: spacing.base,
    fontSize: fontSize.base,
    color: "#666",
    textAlign: "center",
  },
};

export default SupportAgentDashboard;
