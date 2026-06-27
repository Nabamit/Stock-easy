"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { toast } from "sonner";
import {
  Store,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  ListTodo,
  MessageSquare,
  Settings,
  Lock,
  Plus,
  Send,
  Award,
  Activity,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Pill,
  FileText,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  getAdminRoleAction,
  toggleMaintenanceModeAction,
  getPlatformSettingsAction,
  createRegularAdminAction,
  getAdminLeaderboardAction,
  getAdminTasksAction,
  createAdminTaskAction,
  toggleAdminTaskStatusAction,
  sendChatMessageAction,
  getChatMessagesAction,
  getAdminUsersAction,
  deleteAdminAction,
  editAdminAction,
} from "@/lib/admin/actions";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AdminDashboardClientProps {
  initialKpis: {
    totalShops: number;
    pendingCount: number;
    approvedCount: number;
    totalUsers: number;
    platformRevenue: number;
    shops: any[];
    totalMedicines?: number;
    totalBills?: number;
    planDistribution?: { name: string; count: number }[];
  };
  activeTab?: "overview" | "panel" | "settings";
}

export function AdminDashboardClient({ initialKpis, activeTab = "overview" }: AdminDashboardClientProps) {
  const [tab, setTab] = useState<"overview" | "panel" | "settings">(activeTab);
  const [subTab, setSubTab] = useState<"admins" | "tasks" | "chat">("admins");
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [shopOwners, setShopOwners] = useState<any[]>([]);
  const [emailRecipientType, setEmailRecipientType] = useState<"admin" | "owner" | "all" | "custom">("admin");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendEmailChecked, setSendEmailChecked] = useState(true);
  const [sendInAppChecked, setSendInAppChecked] = useState(true);

  const [adminRole, setAdminRole] = useState<{ isSuper: boolean; userId: string; name: string; email: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tasks state
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedAdminForTask, setSelectedAdminForTask] = useState("");

  // Chat state
  const [activeChatUser, setActiveChatUser] = useState<string>(""); // empty string means broadcast
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Settings form
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });

  // Sync tab with activeTab when route changes
  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Load shop owners for Settings tab email broadcast
  useEffect(() => {
    if (tab === "settings") {
      const getOwners = async () => {
        const { getShopOwnersAction } = await import("@/lib/admin/actions");
        const owners = await getShopOwnersAction();
        setShopOwners(owners);
      };
      getOwners();
    }
  }, [tab]);

  // Initial Load - Fetch admin role to render shell instantly
  useEffect(() => {
    startTransition(async () => {
      const role = await getAdminRoleAction();
      setAdminRole(role);
    });
  }, []);

  // Fetch Overview Tab Data (Leaderboard) dynamically
  useEffect(() => {
    if (tab !== "overview" || !adminRole) return;
    const loadOverview = async () => {
      const board = await getAdminLeaderboardAction();
      setLeaderboard(board);
    };
    loadOverview();
  }, [tab, adminRole]);

  // Fetch Panel Tab Data (Tasks & Admins list) dynamically
  useEffect(() => {
    if (tab !== "panel" || !adminRole) return;
    const loadPanel = async () => {
      const [initialTasks, adminUsers] = await Promise.all([
        getAdminTasksAction(),
        getAdminUsersAction(),
      ]);
      setTasks(initialTasks);
      setAdminsList(adminUsers);
    };
    loadPanel();
  }, [tab, adminRole]);

  // Fetch Settings Tab Data (Maintenance settings & Admins list for email dropdowns) dynamically
  useEffect(() => {
    if (tab !== "settings" || !adminRole) return;
    const loadSettings = async () => {
      const [settings, adminUsers] = await Promise.all([
        getPlatformSettingsAction(),
        getAdminUsersAction(),
      ]);
      setMaintenanceMode(settings?.maintenance_mode ?? false);
      setAdminsList(adminUsers);
    };
    loadSettings();
  }, [tab, adminRole]);

  // Poll Chat Messages every 5 seconds if Chat tab is active
  useEffect(() => {
    if (tab !== "panel" || subTab !== "chat") return;
    
    const fetchChat = async () => {
      try {
        const msgs = await getChatMessagesAction(activeChatUser || undefined);
        setChatMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };

    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [tab, subTab, activeChatUser]);

  // Scroll chat on load or when new messages arrive
  useEffect(() => {
    if (tab === "panel" && subTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, tab, subTab]);

  const handleCreateTask = () => {
    if (!taskDescription.trim() || !selectedAdminForTask) {
      toast.error("Please fill in both task description and select an admin.");
      return;
    }
    startTransition(async () => {
      const res = await createAdminTaskAction(selectedAdminForTask, taskDescription);
      if (res.success) {
        toast.success("Task created and assigned successfully.");
        setTaskDescription("");
        const updatedTasks = await getAdminTasksAction();
        setTasks(updatedTasks);
      } else {
        toast.error(res.error || "Failed to create task.");
      }
    });
  };

  const handleToggleTaskStatus = (taskId: string, currentStatus: "pending" | "completed") => {
    startTransition(async () => {
      const res = await toggleAdminTaskStatusAction(taskId, currentStatus);
      if (res.success) {
        toast.success("Task status updated");
        const updatedTasks = await getAdminTasksAction();
        setTasks(updatedTasks);
      } else {
        toast.error(res.error || "Failed to update task.");
      }
    });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    startTransition(async () => {
      const res = await sendChatMessageAction(chatInput, activeChatUser || undefined);
      if (res.success) {
        setChatInput("");
        const msgs = await getChatMessagesAction(activeChatUser || undefined);
        setChatMessages(msgs);
      } else {
        toast.error("Failed to send message.");
      }
    });
  };

  const handleCreateAdmin = () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      toast.error("Please fill in all admin onboarding fields.");
      return;
    }
    startTransition(async () => {
      const res = await createRegularAdminAction(newAdmin.name, newAdmin.email, newAdmin.password);
      if (res.success) {
        toast.success(`Regular Admin ${newAdmin.name} successfully onboarded.`);
        setNewAdmin({ name: "", email: "", password: "" });
        const updatedAdmins = await getAdminUsersAction();
        setAdminsList(updatedAdmins);
      } else {
        toast.error(res.error || "Failed to create admin account.");
      }
    });
  };

  const handleToggleMaintenance = (enabled: boolean) => {
    const confirm = window.confirm(
      enabled
        ? "Enable Maintenance Mode? Non-admin users will be immediately redirected to the maintenance notice page."
        : "Disable Maintenance Mode? All shop owners and staff will be granted normal dashboard access."
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await toggleMaintenanceModeAction(enabled);
      if (res.success) {
        setMaintenanceMode(enabled);
        toast.success(enabled ? "Server-wide Maintenance Enabled" : "Platform Maintenace Mode Disabled");
      } else {
        toast.error(res.error || "Failed to toggle maintenance mode.");
      }
    });
  };

  const handleDeleteAdmin = (adminId: string, name: string) => {
    const confirm = window.confirm(`Are you sure you want to delete administrator "${name}"?`);
    if (!confirm) return;
    startTransition(async () => {
      const res = await deleteAdminAction(adminId);
      if (res.success) {
        toast.success(`Admin "${name}" deleted successfully.`);
        const updatedAdmins = await getAdminUsersAction();
        setAdminsList(updatedAdmins);
      } else {
        toast.error(res.error || "Failed to delete admin.");
      }
    });
  };

  const handleEditAdmin = () => {
    if (!editingAdmin) return;
    startTransition(async () => {
      const res = await editAdminAction(editingAdmin.id, editForm.name, editForm.email);
      if (res.success) {
        toast.success(`Admin "${editForm.name}" updated successfully.`);
        setEditingAdmin(null);
        const updatedAdmins = await getAdminUsersAction();
        setAdminsList(updatedAdmins);
      } else {
        toast.error(res.error || "Failed to update admin.");
      }
    });
  };

  const handleSendEmail = () => {
    if (!sendEmailChecked && !sendInAppChecked) {
      toast.error("Please select at least one delivery method (Email or In-App).");
      return;
    }

    let toEmail = emailRecipient;
    if (emailRecipientType === "all") {
      toEmail = "all";
    } else if (emailRecipientType === "custom") {
      if (!emailRecipient.trim()) {
        toast.error("Please enter a recipient email address.");
        return;
      }
      toEmail = emailRecipient;
    } else {
      if (!emailRecipient) {
        toast.error("Please select a recipient.");
        return;
      }
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please fill in both subject and body message.");
      return;
    }

    startTransition(async () => {
      let emailSuccess = true;
      let inAppSuccess = true;
      let statusMsg = "";

      // 1. Handle In-App Notification (Database announcement)
      if (sendInAppChecked) {
        const { createPlatformNotificationAction } = await import("@/lib/actions/notifications");
        let recType: "all" | "admin" | "owner" | "custom" = "custom";
        let recEmail: string | null = toEmail;

        if (emailRecipientType === "all" || toEmail === "all") {
          recType = "all";
          recEmail = null;
        } else if (toEmail === "all-admins") {
          recType = "admin";
          recEmail = null;
        } else if (toEmail === "all-owners") {
          recType = "owner";
          recEmail = null;
        }

        const res = await createPlatformNotificationAction(recType, recEmail, emailSubject, emailBody);
        if (res.success) {
          statusMsg += "In-app notification published. ";
        } else {
          inAppSuccess = false;
          statusMsg += `In-app failed: ${res.error}. `;
        }
      }

      // 2. Handle Email Broadcast (SMTP)
      if (sendEmailChecked) {
        const { sendAdminEmailAction, broadcastPlatformEmailAction } = await import("@/lib/admin/actions");
        
        if (emailRecipientType === "all" || toEmail === "all") {
          const res = await broadcastPlatformEmailAction("all", emailSubject, emailBody);
          if (res.success) {
            statusMsg += "Email broadcast sent to all users. ";
          } else {
            emailSuccess = false;
            statusMsg += `Email broadcast failed: ${(res as any).error}. `;
          }
        } else if (toEmail === "all-admins") {
          const res = await broadcastPlatformEmailAction("admin", emailSubject, emailBody);
          if (res.success) {
            statusMsg += "Email broadcast sent to all admins. ";
          } else {
            emailSuccess = false;
            statusMsg += `Email broadcast failed: ${(res as any).error}. `;
          }
        } else if (toEmail === "all-owners") {
          const res = await broadcastPlatformEmailAction("owner", emailSubject, emailBody);
          if (res.success) {
            statusMsg += "Email broadcast sent to all shop owners. ";
          } else {
            emailSuccess = false;
            statusMsg += `Email broadcast failed: ${(res as any).error}. `;
          }
        } else {
          // Single email recipient
          const res = await sendAdminEmailAction(toEmail, emailSubject, emailBody);
          if (res.success) {
            statusMsg += "Direct email sent. ";
          } else {
            emailSuccess = false;
            statusMsg += `Direct email failed: ${(res as any).message || "SMTP error"}. `;
          }
        }
      }

      if (emailSuccess && inAppSuccess) {
        toast.success(statusMsg || "Notification sent successfully.");
        setEmailSubject("");
        setEmailBody("");
      } else {
        toast.error(statusMsg || "Some notifications failed to send.");
      }
    });
  };

  if (!adminRole) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-2 animate-pulse">
          <Activity className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Initializing central admin dashboard...</p>
        </div>
      </div>
    );
  }

  const isSuper = adminRole.isSuper;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tab === "overview" && "Central Platform Control"}
            {tab === "panel" && "Central Admin Panel"}
            {tab === "settings" && "Platform Settings & Controls"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Logged in as: <span className="font-semibold text-foreground">{adminRole.name}</span> ({isSuper ? "Super Admin" : "Regular Admin"})
          </p>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard
              title="Total Shops"
              value={initialKpis.totalShops}
              icon={Store}
              iconClassName="bg-blue-500/10 text-blue-500"
            />
            <KpiCard
              title="Verified / Approved"
              value={initialKpis.approvedCount}
              icon={CheckCircle}
              iconClassName="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard
              title="Pending Registration"
              value={initialKpis.pendingCount}
              icon={Clock}
              iconClassName="bg-amber-500/10 text-amber-500"
            />
            <KpiCard
              title="Total Users"
              value={initialKpis.totalUsers}
              icon={Users}
              iconClassName="bg-violet-500/10 text-violet-500"
            />
            <KpiCard
              title="Total Medicines"
              value={initialKpis.totalMedicines ?? 0}
              icon={Pill}
              iconClassName="bg-cyan-500/10 text-cyan-500"
            />
            <KpiCard
              title="Total Bills"
              value={initialKpis.totalBills ?? 0}
              icon={FileText}
              iconClassName="bg-indigo-500/10 text-indigo-500"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Platform Revenue & Leaderboards (Super Admin Only) */}
            <div className="lg:col-span-2 space-y-6">
              {isSuper ? (
                <>
                  <Card className="border">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        Platform Financial Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">Cumulative monthly revenue collected via payments:</p>
                        <h3 className="text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-500">
                          {formatCurrency(initialKpis.platformRevenue)}
                        </h3>
                        <p className="text-xs text-muted-foreground border-t pt-2 mt-4">
                          💡 Monthly subscription transactions and Razorpay trial triggers are consolidated automatically.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plan Distribution Chart */}
                  <Card className="border">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Pharmacy Subscription Plans Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={initialKpis.planDistribution ?? []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[6, 6, 0, 0]} name="Registered Shops" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-base font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      Platform Financial Overview (Locked)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    🔒 Financial stats and cumulative platform revenue figures require Super Admin credentials.
                  </CardContent>
                </Card>
              )}

              {/* Onboarding Leaderboard */}
              {isSuper ? (
                <Card className="border">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-500" />
                      Admin Verification Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rank</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                            <th className="px-3 py-2 text-center font-medium text-muted-foreground">Role</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Shops Onboarded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {leaderboard.map((admin, idx) => (
                            <tr key={admin.id} className={admin.id === adminRole.userId ? "bg-primary/5 font-medium" : ""}>
                              <td className="px-3 py-3 text-left">#{idx + 1}</td>
                              <td className="px-3 py-3 text-left truncate max-w-[12rem]">{admin.name}</td>
                              <td className="px-3 py-3 text-left text-muted-foreground">{admin.email}</td>
                              <td className="px-3 py-3 text-center">
                                <Badge variant={admin.isSuper ? "success" : "secondary"}>
                                  {admin.isSuper ? "Super" : "Regular"}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-primary">{admin.count} shops</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-base font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      Admin Onboarding Leaderboard (Locked)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    🔒 Verification counts and administrator comparisons are restricted to Super Admins.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Registrations Queue Snippet */}
            <div className="space-y-6">
              <Card className="border">
                <CardHeader className="bg-muted/30 flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-primary" />
                    Recent Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[28rem] overflow-y-auto">
                  <div className="space-y-3">
                    {initialKpis.shops.slice(0, 5).map((shop) => (
                      <div key={shop.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-xs truncate max-w-[12rem]">{shop.name}</p>
                          <Badge
                            className="text-[10px] px-1.5 py-0"
                            variant={
                              shop.verification_status === "approved"
                                ? "success"
                                : shop.verification_status === "pending"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {shop.verification_status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {shop.city} · registered {formatDate(shop.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL TAB */}
      {tab === "panel" && (
        <div className="space-y-6">
          {/* Sub-tabs Selector for Admin Panel */}
          <div className="flex border-b border-muted">
            {(["admins", "tasks", "chat"] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setSubTab(sub)}
                className={`py-2 px-4 font-semibold text-sm border-b-2 -mb-[2px] transition-colors capitalize ${
                  subTab === sub
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {sub === "admins" && "Admins Directory"}
                {sub === "tasks" && "Tasks & Progress"}
                {sub === "chat" && "Admin Chat Room"}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Admins List */}
          {subTab === "admins" && (
            <Card className="border">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Administrators ({adminsList.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Admin Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Role</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adminsList.map((admin) => (
                        <tr key={admin.id}>
                          <td className="px-3 py-3 text-left font-medium text-foreground">{admin.name}</td>
                          <td className="px-3 py-3 text-left text-muted-foreground">{admin.email}</td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant={admin.is_super ? "success" : "secondary"}>
                              {admin.is_super ? "Super Admin" : "Regular Admin"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isSuper && admin.id !== adminRole.userId && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAdmin(admin);
                                    setEditForm({ name: admin.name, email: admin.email });
                                  }}
                                  className="h-8 px-2 text-primary hover:bg-primary/10"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 2: Tasks & Progress */}
          {subTab === "tasks" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Tasks checklist */}
              <Card className="lg:col-span-2 border">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-base font-semibold">
                    {isSuper ? "All Platform Support Tasks" : "Your Assigned Tasks"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0 gap-4">
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === "completed"}
                            onChange={() => handleToggleTaskStatus(task.id, task.status)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            disabled={task.admin_id !== adminRole.userId && !isSuper}
                          />
                          <div>
                            <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                              {task.task_description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Assigned to: <strong className="text-foreground">{task.assigned_to?.name || "Unknown"}</strong> · Created {formatDate(task.created_at)} by {task.creator?.name || "Super"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={task.status === "completed" ? "success" : "warning"}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                    {!tasks.length && (
                      <p className="text-muted-foreground text-center py-6 text-sm">No tasks assigned or registered.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assign support task creator (Super Admin only) */}
              <div>
                {isSuper ? (
                  <Card className="border">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base font-semibold flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        Assign New Support Task
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-1.5">
                        <Label>Assignee Admin</Label>
                        <select
                          value={selectedAdminForTask}
                          onChange={(e) => setSelectedAdminForTask(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Select central admin...</option>
                          {adminsList.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.name} ({admin.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Task Description</Label>
                        <Input
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="e.g. Call Apex Pharmacy to verify their GST number"
                        />
                      </div>

                      <Button onClick={handleCreateTask} disabled={isPending} className="w-full">
                        Assign Task
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-4 w-4" />
                        Support Coordinator (Locked)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      🔒 Creating and delegating platform tasks is restricted to Super Admin accounts.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Chat Room */}
          {subTab === "chat" && (
            <Card className="border overflow-hidden h-[32rem] flex flex-col">
              <CardHeader className="bg-muted/30 border-b px-4 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-semibold">Admin Chat Rooms</CardTitle>
                    <p className="text-[11px] text-muted-foreground">Coordinates verifications & system issues</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Selector to switch chat rooms */}
                  <select
                    value={activeChatUser}
                    onChange={(e) => {
                      setActiveChatUser(e.target.value);
                      setChatMessages([]);
                    }}
                    className="text-xs bg-card border rounded-md px-2 py-1 focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Public Broadcast Room</option>
                    <optgroup label="Direct Message (1:1)">
                      {adminsList
                        .filter((u) => u.id !== adminRole.userId)
                        .map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            Chat with {admin.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={async () => {
                      const msgs = await getChatMessagesAction(activeChatUser || undefined);
                      setChatMessages(msgs);
                      toast.success("Chat updated");
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Chat message display area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {chatMessages.map((msg) => {
                  const isOwn = msg.sender_id === adminRole.userId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] text-muted-foreground mb-1 px-1.5">
                        {isOwn ? "You" : msg.sender?.name || "Admin"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div
                        className={`max-w-[70%] rounded-xl px-3 py-2 text-xs shadow-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-card text-foreground rounded-tl-none border"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                {!chatMessages.length && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs py-12">
                    No messages in this chat room yet. Send a note to start the conversation!
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat message input bar */}
              <div className="p-3 bg-card border-t flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={activeChatUser ? "Write a direct message..." : "Broadcast to all central admins..."}
                  className="text-xs rounded-xl"
                />
                <Button onClick={handleSendChat} size="sm" className="rounded-xl px-4 flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  Send
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Super Admin Profile Details */}
          <Card className="border">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-primary" />
                Super Admin Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Admin Name:</span>
                <span className="font-semibold text-foreground">{adminRole.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Login Email ID:</span>
                <span className="font-semibold text-foreground">{adminRole.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Platform Role:</span>
                <Badge variant={isSuper ? "success" : "secondary"}>
                  {isSuper ? "Super Administrator" : "Regular Administrator"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Server-wide Maintenance Mode Toggle */}
          <Card className="border">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                Server Maintenance Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Maintenance Redirection Mode</p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                      Redirects all non-admin users to a maintenance screen. Platform Admins retain dashboard access to resolve support items.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold">
                      {maintenanceMode ? (
                        <span className="text-rose-600">Active</span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </span>
                    <button
                      role="switch"
                      aria-checked={maintenanceMode}
                      disabled={!isSuper || isPending}
                      onClick={() => handleToggleMaintenance(!maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        maintenanceMode ? "bg-rose-600" : "bg-input"
                      } ${(!isSuper || isPending) ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                          maintenanceMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!isSuper && (
                  <p className="text-xs text-rose-500 mt-2 font-medium">
                    🔒 Super Admin permissions are required to modify maintenance mode status.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Send Email Utility */}
          <Card className="border md:col-span-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Send className="h-4 w-4 text-primary" />
                Send Notification / Mail Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Recipient Category</Label>
                  <select
                    value={emailRecipientType}
                    onChange={(e) => {
                      setEmailRecipientType(e.target.value as any);
                      setEmailRecipient("");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="admin">Platform Admins</option>
                    <option value="owner">Pharmacy Shop Owners</option>
                    <option value="all">All Platform Users</option>
                    <option value="custom">Individual Email Address</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Recipient Email</Label>
                  {emailRecipientType === "all" ? (
                    <Input
                      disabled
                      value="All platform admins and shop owners"
                      className="bg-muted text-muted-foreground"
                    />
                  ) : emailRecipientType === "custom" ? (
                    <Input
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="e.g. user@domain.com"
                    />
                  ) : emailRecipientType === "admin" ? (
                    <select
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select admin...</option>
                      <option value="all-admins">All Platform Admins (Broadcast)</option>
                      {adminsList.map((admin) => (
                        <option key={admin.id} value={admin.email}>
                          {admin.name} ({admin.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select shop owner...</option>
                      <option value="all-owners">All Pharmacy Shop Owners (Broadcast)</option>
                      {shopOwners.map((owner) => (
                        <option key={owner.id} value={owner.email}>
                          {owner.name} ({owner.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Delivery Methods Selection */}
              <div className="flex flex-col sm:flex-row gap-4 pt-1 border-b pb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendEmailCheckbox"
                    checked={sendEmailChecked}
                    onChange={(e) => setSendEmailChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="sendEmailCheckbox" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Send Email Broadcast (SMTP)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendInAppCheckbox"
                    checked={sendInAppChecked}
                    onChange={(e) => setSendInAppChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="sendInAppCheckbox" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Publish as In-App Notification (Bell Icon)
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Notification Subject..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Message Body</Label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your broadcast or support message here..."
                  rows={4}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <Button onClick={handleSendEmail} disabled={isPending} className="w-full sm:w-auto">
                Send Notification Broadcast
              </Button>
            </CardContent>
          </Card>

          {/* Regular Admin onboarding form */}
          <div className="md:col-span-2">
            {isSuper ? (
              <Card className="border">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Onboard Central Admin Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                        placeholder="e.g. Rajesh Kumar"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Email / Login ID</Label>
                      <Input
                        type="email"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                        placeholder="rajesh@stockeasy.in"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-lg border text-xs text-muted-foreground">
                    ℹ️ <strong>Auto-Assigned UUID</strong>: The system will automatically generate and attach a unique central identifier (Auto-ID) upon registration.
                  </div>

                  <Button onClick={handleCreateAdmin} disabled={isPending} className="w-full sm:w-auto">
                    Register Regular Admin
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-base font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    Admin Onboarding (Locked)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  🔒 Onboarding new platform administrator accounts requires Super Admin privileges.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-background border rounded-xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">Edit Administrator Profile</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setEditingAdmin(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleEditAdmin} disabled={isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
