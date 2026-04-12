import { supabase } from "../components/supabase";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "agent" | "system";
  message: string;
  message_type: "text" | "image" | "file" | "system";
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SupportMessageWithSender extends SupportMessage {
  sender?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

class SupportService {
  /**
   * Send a support message from the current user
   */
  async sendMessage(
    message: string,
    subject: string = "General Support"
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Use the database function to send message
      const { data, error } = await supabase.rpc("send_support_message", {
        user_uuid: user.id,
        message_text: message,
        ticket_subject: subject,
      });

      if (error) {
        console.error("Error sending support message:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data };
    } catch (error) {
      console.error("Error in sendMessage:", error);
      return { success: false, error: "Failed to send message" };
    }
  }

  /**
   * Get all support tickets for the current user
   */
  async getUserTickets(): Promise<{
    tickets: SupportTicket[];
    error?: string;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { tickets: [], error: "User not authenticated" };
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching user tickets:", error);
        return { tickets: [], error: error.message };
      }

      return { tickets: data || [] };
    } catch (error) {
      console.error("Error in getUserTickets:", error);
      return { tickets: [], error: "Failed to fetch tickets" };
    }
  }

  /**
   * Get messages for a specific ticket
   */
  async getTicketMessages(
    ticketId: string
  ): Promise<{ messages: SupportMessageWithSender[]; error?: string }> {
    try {
      // First, get the messages without trying to join with auth.users
      const { data: messages, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching ticket messages:", error);
        return { messages: [], error: error.message };
      }

      // For now, we'll just return the messages without sender details
      // The sender information can be determined from sender_type and sender_id
      const messagesWithSender: SupportMessageWithSender[] = (
        messages || []
      ).map((msg) => ({
        ...msg,
        sender: {
          id: msg.sender_id,
          email:
            msg.sender_type === "agent"
              ? "verrsaapp@gmail.com"
              : "customer@example.com",
        },
      }));

      return { messages: messagesWithSender };
    } catch (error) {
      console.error("Error in getTicketMessages:", error);
      return { messages: [], error: "Failed to fetch messages" };
    }
  }

  /**
   * Get or create a support ticket for the current user
   */
  async getOrCreateTicket(
    subject: string = "General Support"
  ): Promise<{ ticket: SupportTicket | null; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { ticket: null, error: "User not authenticated" };
      }

      // Use the database function to get or create ticket
      const { data: ticketId, error: functionError } = await supabase.rpc(
        "get_or_create_support_ticket",
        {
          user_uuid: user.id,
          ticket_subject: subject,
        }
      );

      if (functionError) {
        console.error("Error getting/creating ticket:", functionError);
        return { ticket: null, error: functionError.message };
      }

      // Fetch the ticket details
      const { data: ticket, error: fetchError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (fetchError) {
        console.error("Error fetching ticket details:", fetchError);
        return { ticket: null, error: fetchError.message };
      }

      return { ticket };
    } catch (error) {
      console.error("Error in getOrCreateTicket:", error);
      return { ticket: null, error: "Failed to get/create ticket" };
    }
  }

  /**
   * Subscribe to real-time messages for a specific ticket
   */
  subscribeToTicketMessages(
    ticketId: string,
    callback: (message: SupportMessage) => void
  ) {
    const subscription = supabase
      .channel(`ticket_messages_${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          callback(payload.new as SupportMessage);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Subscribe to real-time ticket updates for the current user
   */
  async subscribeToUserTickets(callback: (ticket: SupportTicket) => void) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated for ticket subscription");
      return null;
    }

    const subscription = supabase
      .channel(`user_tickets_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new as SupportTicket);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Unsubscribe from a realtime subscription
   */
  unsubscribe(subscription: any) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  /**
   * Mark messages as read (for future implementation)
   */
  async markMessagesAsRead(
    ticketId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // This would update the metadata to mark messages as read
      const { error } = await supabase
        .from("support_messages")
        .update({
          metadata: { read_at: new Date().toISOString() },
        })
        .eq("ticket_id", ticketId)
        .neq("sender_id", user.id); // Only mark other people's messages as read

      if (error) {
        console.error("Error marking messages as read:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in markMessagesAsRead:", error);
      return { success: false, error: "Failed to mark messages as read" };
    }
  }

  // AGENT-SPECIFIC FUNCTIONS (require agent authentication)

  /**
   * Get all support tickets (for agents)
   */
  async getAllTickets(): Promise<{ tickets: SupportTicket[]; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { tickets: [], error: "User not authenticated" };
      }

      // Check if user is verrsaapp@gmail.com or is in support_agents table
      if (user.email !== "verrsaapp@gmail.com") {
        const { data: agentCheck } = await supabase
          .from("support_agents")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (!agentCheck) {
          return {
            tickets: [],
            error: "Access denied. Agent privileges required.",
          };
        }
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching all tickets:", error);
        return { tickets: [], error: error.message };
      }

      return { tickets: data || [] };
    } catch (error) {
      console.error("Error in getAllTickets:", error);
      return { tickets: [], error: "Failed to fetch tickets" };
    }
  }

  /**
   * Send a message as a support agent
   */
  async sendAgentMessage(
    ticketId: string,
    message: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if user is verrsaapp@gmail.com or is in support_agents table
      if (user.email !== "verrsaapp@gmail.com") {
        const { data: agentCheck } = await supabase
          .from("support_agents")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (!agentCheck) {
          return {
            success: false,
            error: "Access denied. Agent privileges required.",
          };
        }
      }

      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: "agent",
          message: message,
          message_type: "text",
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending agent message:", error);
        return { success: false, error: error.message };
      }

      // Update ticket timestamp
      await supabase
        .from("support_tickets")
        .update({
          updated_at: new Date().toISOString(),
          status: "in_progress", // Automatically set to in_progress when agent responds
        })
        .eq("id", ticketId);

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error("Error in sendAgentMessage:", error);
      return { success: false, error: "Failed to send agent message" };
    }
  }

  /**
   * Update ticket status (for agents)
   * NOTE: This requires implementing agent authentication in your backend
   */
  async updateTicketStatus(
    ticketId: string,
    status: "open" | "in_progress" | "resolved" | "closed"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if user is verrsaapp@gmail.com or is in support_agents table
      if (user.email !== "verrsaapp@gmail.com") {
        const { data: agentCheck } = await supabase
          .from("support_agents")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (!agentCheck) {
          return {
            success: false,
            error: "Access denied. Agent privileges required.",
          };
        }
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) {
        console.error("Error updating ticket status:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in updateTicketStatus:", error);
      return { success: false, error: "Failed to update ticket status" };
    }
  }

  /**
   * Assign ticket to an agent
   * NOTE: This requires implementing agent authentication in your backend
   */
  async assignTicket(
    ticketId: string,
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if user is an agent (you'll need to implement this check)
      return {
        success: false,
        error:
          "Agent authentication not implemented. Please add agent role verification.",
      };

      /* 
      // Example implementation after agent authentication is set up:
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: agentId,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error assigning ticket:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
      */
    } catch (error) {
      console.error("Error in assignTicket:", error);
      return { success: false, error: "Failed to assign ticket" };
    }
  }
}

export const supportService = new SupportService();
