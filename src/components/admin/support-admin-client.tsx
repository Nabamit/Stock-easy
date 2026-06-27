"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  LifeBuoy,
  MessageSquare,
  Send,
  Calendar,
  Lock,
  Search,
  CheckCircle,
  MessageCircle,
  Loader2,
  Store,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SessionPayload } from "@/types";
import {
  getSupportTicketsAction,
  getSupportTicketMessagesAction,
  sendSupportMessageAction,
  closeSupportTicketAction,
  SupportTicket,
  SupportMessage,
} from "@/lib/actions/support";

interface SupportAdminClientProps {
  adminSession: SessionPayload;
}

export function SupportAdminClient({ adminSession }: SupportAdminClientProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load all tickets
  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await getSupportTicketsAction();
      setTickets(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  // Load messages for chosen ticket
  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const data = await getSupportTicketMessagesAction(ticketId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTickets();
  }, []);

  // Poll for new messages every 5 seconds if ticket is open and active
  useEffect(() => {
    if (!selectedTicketId) return;
    const activeTicket = tickets.find((t) => t.id === selectedTicketId);
    if (!activeTicket || activeTicket.status === "closed") return;

    const interval = setInterval(() => {
      loadMessages(selectedTicketId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTicketId, tickets]);

  // Load messages when selection changes
  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId);
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    const text = replyText;
    setReplyText(""); // Optimistically clear input

    const res = await sendSupportMessageAction(selectedTicketId, text);
    if (res.success) {
      await loadMessages(selectedTicketId);
      // Update ticket updated_at in UI list
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId ? { ...t, updatedAt: new Date().toISOString() } : t
        )
      );
    } else {
      toast.error(res.error || "Failed to send message");
      setReplyText(text); // Restore text
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;

    startTransition(async () => {
      const res = await closeSupportTicketAction(selectedTicketId);
      if (res.success) {
        toast.success("Support ticket marked as closed.");
        // Refresh tickets
        await loadTickets();
      } else {
        toast.error(res.error || "Failed to close support ticket");
      }
    });
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    // 1. Filter by Status
    if (statusFilter === "open" && t.status !== "open") return false;
    if (statusFilter === "closed" && t.status !== "closed") return false;

    // 2. Filter by search query (Subject, Shop name, Owner name, Category)
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.subject.toLowerCase().includes(term) ||
      t.shopName?.toLowerCase().includes(term) ||
      t.ownerName?.toLowerCase().includes(term) ||
      t.category.toLowerCase().includes(term)
    );
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customer Support Portal</h2>
        <p className="text-muted-foreground text-sm">
          Manage, respond, and resolve customer support queries from registered shops.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5 border rounded-xl overflow-hidden bg-card min-h-[600px] max-h-[650px] shadow-sm">
        {/* Left Side - Support Tickets Sidebar */}
        <div className="md:col-span-2 border-r flex flex-col h-full bg-muted/10">
          {/* Sidebar Header Filters */}
          <div className="p-4 border-b bg-card space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket, shop, owner..."
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {(["open", "closed", "all"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className="flex-1 capitalize text-[10px] font-semibold py-1"
                >
                  {status} Issues
                </Button>
              ))}
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto divide-y bg-card">
            {loadingTickets && tickets.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No tickets matching criteria.
              </p>
            ) : (
              filteredTickets.map((t) => {
                const isActive = selectedTicketId === t.id;
                const isClosed = t.status === "closed";
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 text-left cursor-pointer transition-all hover:bg-muted/40 relative ${
                      isActive ? "bg-primary/5 border-l-4 border-l-primary" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize font-medium py-0 px-2 bg-muted/50">
                        {t.category.replace("_", " ")}
                      </Badge>
                      <Badge variant={isClosed ? "secondary" : "success"} className="text-[10px] font-semibold py-0 px-2">
                        {t.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <h5 className="font-bold text-sm text-foreground mt-2 truncate">{t.subject}</h5>
                    
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        <span>{t.shopName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>Owner: {t.ownerName}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground font-medium border-t pt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                      <span>Ref: #{t.id.slice(0, 8)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side - Chat Feed */}
        <div className="md:col-span-3 flex flex-col h-full bg-card">
          {selectedTicket ? (
            <div className="flex flex-col h-full relative">
              {/* Chat Header */}
              <div className="p-4 border-b bg-card flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{selectedTicket.subject}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-[11px] text-muted-foreground mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" /> {selectedTicket.shopName} ({selectedTicket.ownerName})
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="capitalize">Category: {selectedTicket.category.replace("_", " ")}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedTicket.status === "open" && (
                    <Button
                      onClick={handleCloseTicket}
                      disabled={isPending}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Close Issue
                    </Button>
                  )}
                  <Badge variant={selectedTicket.status === "closed" ? "secondary" : "success"} className="font-semibold py-0.5 px-2.5">
                    {selectedTicket.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-[380px] max-h-[420px]">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.senderRole === "central_admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isAdmin
                            ? "ml-auto bg-primary text-primary-foreground rounded-tr-none"
                            : "mr-auto bg-muted/60 text-foreground rounded-tl-none border"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-bold text-[10px] tracking-wide uppercase opacity-90">
                            {isAdmin ? `Admin: ${m.senderName} (You)` : m.senderName}
                          </span>
                        </div>
                        <p className="mt-1 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        <span className="text-[9px] text-right mt-1.5 block opacity-60 font-medium select-none">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t bg-card">
                {selectedTicket.status === "closed" ? (
                  <div className="flex items-center justify-center p-3 bg-muted rounded-lg border text-xs font-semibold text-muted-foreground select-none gap-2">
                    <Lock className="h-4 w-4" /> This support ticket is closed. Access is locked.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a response to assist the pharmacy..."
                      disabled={isPending}
                      className="flex-1 text-sm border-input"
                    />
                    <Button type="submit" size="sm" disabled={isPending || !replyText.trim()} className="gap-1.5 shadow-sm">
                      <Send className="h-3.5 w-3.5" /> Send Reply
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h5 className="font-bold text-sm text-foreground">Assistance Queue</h5>
              <p className="text-xs max-w-xs mt-1">
                Select a pharmacy issue ticket from the left sidebar to read details and chat with the owner.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
