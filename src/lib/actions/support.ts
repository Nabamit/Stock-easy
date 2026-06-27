"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export type TicketCategory = 'billing' | 'ai' | 'stock_add' | 'analytics' | 'delay_response' | 'others';

export interface SupportTicket {
  id: string;
  shopId: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  shopName?: string;
  ownerName?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
  senderName: string;
  senderRole: string;
}

// 1. Create a support ticket
export async function createSupportTicketAction(
  category: TicketCategory,
  subject: string,
  initialMessage: string
) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const shopId = session.shopId;
  if (!shopId) {
    return { success: false, error: "Only shop owners and staff can open support tickets." };
  }

  const db = getDb();

  // Create ticket
  const { data: ticket, error: ticketError } = await db
    .from("support_tickets")
    .insert({
      shop_id: shopId,
      user_id: session.userId,
      category,
      subject,
      status: "open",
    })
    .select()
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: ticketError?.message || "Failed to create support ticket." };
  }

  // Create initial chat message
  const { error: msgError } = await db
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      sender_id: session.userId,
      message: initialMessage,
    });

  if (msgError) {
    // Attempt cleanup if initial message insert fails
    await db.from("support_tickets").delete().eq("id", ticket.id);
    return { success: false, error: msgError.message };
  }

  revalidatePath("/admin/support");
  return { success: true, ticketId: ticket.id };
}

// 2. Fetch support tickets (for client settings tab or admin dashboard panel)
export async function getSupportTicketsAction(): Promise<SupportTicket[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getDb();
  const isAdmin = session.role === "central_admin";

  let query = db.from("support_tickets").select("*, shops(name, owner_name)");

  if (!isAdmin) {
    if (!session.shopId) return [];
    query = query.eq("shop_id", session.shopId);
  }

  const { data: tickets, error } = await query.order("updated_at", { ascending: false });

  if (error || !tickets) {
    console.error("Error fetching support tickets:", error);
    return [];
  }

  return tickets.map((t) => ({
    id: t.id,
    shopId: t.shop_id,
    userId: t.user_id,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    shopName: (t.shops as any)?.name || "Unknown Shop",
    ownerName: (t.shops as any)?.owner_name || "Unknown Owner",
  }));
}

// 3. Fetch chat messages for a specific support ticket
export async function getSupportTicketMessagesAction(
  ticketId: string
): Promise<SupportMessage[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getDb();

  // Fetch messages and join sender profile details
  const { data: messages, error } = await db
    .from("support_ticket_messages")
    .select("*, sender:users(name, role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error || !messages) {
    console.error("Error fetching ticket messages:", error);
    return [];
  }

  return messages.map((m) => ({
    id: m.id,
    ticketId: m.ticket_id,
    senderId: m.sender_id,
    message: m.message,
    createdAt: m.created_at,
    senderName: (m.sender as any)?.name || "System User",
    senderRole: (m.sender as any)?.role || "user",
  }));
}

// 4. Send chat message
export async function sendSupportMessageAction(ticketId: string, message: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const db = getDb();

  // Verify ticket is still open
  const { data: ticket, error: ticketErr } = await db
    .from("support_tickets")
    .select("status")
    .eq("id", ticketId)
    .single();

  if (ticketErr || !ticket) {
    return { success: false, error: "Ticket not found." };
  }

  if (ticket.status === "closed") {
    return { success: false, error: "Cannot send message. This ticket is already closed." };
  }

  // Insert message
  const { error } = await db
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: session.userId,
      message,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update ticket timestamp
  await db
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  revalidatePath("/admin/support");
  return { success: true };
}

// 5. Close ticket (Admin only)
export async function closeSupportTicketAction(ticketId: string) {
  const session = await getSession();
  if (!session || session.role !== "central_admin") {
    return { success: false, error: "Unauthorized. Admin permission required." };
  }

  const db = getDb();

  const { error } = await db
    .from("support_tickets")
    .update({
      status: "closed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/support");
  return { success: true };
}
