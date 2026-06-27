"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  getUserNotificationsAction, 
  markNotificationAsReadAction, 
  markAllNotificationsAsReadAction 
} from "@/lib/actions/notifications";
import { formatDate } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await getUserNotificationsAction();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await markNotificationAsReadAction(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-accent rounded-full transition-all"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card text-card-foreground shadow-2xl p-4 z-50 max-h-[450px] flex flex-col transition-all overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="font-semibold text-sm flex items-center gap-1.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount} new
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
              {notifications.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                    }}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all hover:bg-accent/40 relative group ${
                      !n.isRead ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-background border-muted"
                    }`}
                  >
                    {!n.isRead && (
                      <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-primary" />
                    )}
                    <div className="pr-4">
                      <p className="font-semibold text-xs text-foreground line-clamp-1">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground font-medium">
                        <Calendar className="h-3 w-3" />
                        {formatDate(n.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
