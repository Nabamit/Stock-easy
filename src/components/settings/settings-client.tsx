"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, ShieldAlert, X, ChevronDown, ChevronUp, Check, Lock, Trash2, MessageSquare, Send, Calendar, MessageCircle, AlertCircle, LifeBuoy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getShopProfileAction,
  updateShopProfileAction,
  getStaffAction,
  addStaffAction,
  changePasswordAction,
  getSubscriptionPlansAction,
  selectPlanAction,
  deactivateShopAccountAction,
  toggleAutoRenewAction,
  deleteStaffAction,
} from "@/lib/actions/settings";
import { formatCurrency } from "@/lib/utils";
export function SettingsClient({ 
  isVerified = true,
  subscriptionStatus = "active",
  isSuspended = false
}: { 
  isVerified?: boolean;
  subscriptionStatus?: "trial" | "active" | "expired" | "cancelled" | null;
  isSuspended?: boolean;
}) {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getShopProfileAction>>>(null);
  const [staff, setStaff] = useState<Awaited<ReturnType<typeof getStaffAction>>>([]);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getSubscriptionPlansAction>>>([]);
  const [tab, setTab] = useState<"shop" | "staff" | "password" | "subscription" | "support">("shop");
  const [isPending, startTransition] = useTransition();
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "" });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("Starter");

  // Support states
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [newCategory, setNewCategory] = useState<any>("billing");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Shop Profile Custom Upload and Save States
  const [logoUrl, setLogoUrl] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  useEffect(() => {
    if (profile) {
      setLogoUrl(profile.shop_photo_url || "");
      setAltPhone(profile.alternate_phone || "");
    }
  }, [profile]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { getSupportTicketsAction } = await import("@/lib/actions/support");
      const data = await getSupportTicketsAction();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const { getSupportTicketMessagesAction } = await import("@/lib/actions/support");
      const data = await getSupportTicketMessagesAction(ticketId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (tab === "support") {
      loadTickets();
    }
  }, [tab]);

  // Poll support messages every 5 seconds if ticket is open and active
  useEffect(() => {
    if (!selectedTicketId) return;
    const activeTicket = tickets.find(t => t.id === selectedTicketId);
    if (!activeTicket || activeTicket.status === "closed") return;

    const interval = setInterval(() => {
      loadMessages(selectedTicketId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTicketId, tickets]);

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId);
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const { createSupportTicketAction } = await import("@/lib/actions/support");
      const res = await createSupportTicketAction(newCategory, newSubject, newMessage);
      if (res.success) {
        toast.success("Support ticket created!");
        setNewSubject("");
        setNewMessage("");
        setShowNewTicketModal(false);
        await loadTickets();
        if (res.ticketId) {
          setSelectedTicketId(res.ticketId);
        }
      } else {
        toast.error(res.error || "Failed to open support ticket");
      }
    });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    const text = replyText;
    setReplyText("");

    const { sendSupportMessageAction } = await import("@/lib/actions/support");
    const res = await sendSupportMessageAction(selectedTicketId, text);
    if (res.success) {
      await loadMessages(selectedTicketId);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId ? { ...t, updatedAt: new Date().toISOString() } : t
        )
      );
    } else {
      toast.error(res.error || "Failed to send message.");
      setReplyText(text);
    }
  };

  function load() {
    startTransition(async () => {
      const [p, s, pl] = await Promise.all([
        getShopProfileAction(),
        getStaffAction(),
        getSubscriptionPlansAction(),
      ]);
      setProfile(p);
      setStaff(s);
      setPlans(pl);
    });
  }

  useEffect(() => {
    load();
    if (isSuspended) {
      setTab("support");
    } else if (!isVerified) {
      setTab("support");
    } else if (subscriptionStatus === "trial") {
      setTab("subscription");
    }
  }, [isVerified, subscriptionStatus, isSuspended]);

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const plan = profile.subscription_plans as { name: string; price: number } | null;
  const isApproved = profile.verification_status === "approved";

  return (
    <div className="space-y-6">
      {isSuspended && (
        <Card className="border-red-650 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 dark:border-red-900/50 shadow-inner px-1 py-1">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-red-850 dark:text-red-300 text-lg uppercase tracking-wider">
                Account Suspended by Admin
              </h3>
              <p className="text-sm font-medium text-red-750 dark:text-red-400 mt-1">
                Your account has been suspended for violating our terms and conditions. All other sections of the system are locked. Only Customer Support remains available for communication and revocation requests.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(["shop", "staff", "password", "subscription", "support"] as const).map((t) => {
          let isTabLocked = false;
          let lockReason = "";
          
          if (isSuspended) {
            isTabLocked = t !== "support";
            lockReason = "locked because your account is suspended.";
          } else if (!isVerified) {
            isTabLocked = t !== "support";
            lockReason = "locked in Trial Mode. Wait for Admin approval to activate.";
          } else if (subscriptionStatus === "trial") {
            isTabLocked = t !== "subscription" && t !== "support";
            lockReason = "locked on the Trial Plan. Please renew or upgrade your subscription to unlock.";
          }

          return (
            <Button 
              key={t} 
              variant={tab === t ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                if (isTabLocked) {
                  toast.error(`${t.charAt(0).toUpperCase() + t.slice(1)} settings are ${lockReason}`);
                  return;
                }
                setTab(t);
              }}
              className="gap-1.5"
            >
              {isTabLocked && <Lock className="mr-1 h-3.5 w-3.5" />}
              {t === "support" ? "Customer Service" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          );
        })}
      </div>

      {tab === "shop" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Shop Profile</CardTitle>
              <Badge variant={isApproved ? "success" : profile.verification_status === "rejected" ? "destructive" : "warning"}>
                {profile.verification_status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {isApproved && (
                <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
                  ⚠️ Your shop details are verified. Key registration fields (Name, Address, Phone, Pincode) are now locked. You can still modify the Shop Logo and alternate contact details below.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Shop Photo</Label>
                  <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/10">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-primary/5 border flex items-center justify-center text-xs text-muted-foreground uppercase">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Shop Logo" className="h-full w-full object-cover" />
                      ) : (
                        "No Logo"
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        id="shop-logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setIsUploadingLogo(true);
                          try {
                            const { uploadDocument } = await import("@/lib/supabase/storage");
                            const publicUrl = await uploadDocument("shopPhoto", file);
                            
                            const r = await updateShopProfileAction({ shop_photo_url: publicUrl });
                            if (r.success) {
                              setLogoUrl(publicUrl);
                              toast.success("Shop logo updated successfully!");
                              setProfile((prev: any) => prev ? { ...prev, shop_photo_url: publicUrl } : null);
                            } else {
                              toast.error(r.error || "Failed to update profile logo");
                            }
                          } catch (err: any) {
                            console.error(err);
                            toast.error(err.message || "Failed to upload logo image");
                          } finally {
                            setIsUploadingLogo(false);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingLogo}
                        onClick={() => document.getElementById("shop-logo-upload")?.click()}
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload Image"
                        )}
                      </Button>
                      <p className="text-[10px] text-muted-foreground">Supports JPEG, PNG, or GIF (max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alternate Contact Phone</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="+91..."
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                    />
                    <Button
                      type="button"
                      disabled={isUpdatingPhone}
                      onClick={() => {
                        setIsUpdatingPhone(true);
                        startTransition(async () => {
                          const r = await updateShopProfileAction({ alternate_phone: altPhone });
                          if (r.success) {
                            toast.success("Alternate phone number updated!");
                            setProfile((prev: any) => prev ? { ...prev, alternate_phone: altPhone } : null);
                          } else {
                            toast.error(r.error || "Update failed");
                          }
                          setIsUpdatingPhone(false);
                        });
                      }}
                    >
                      {isUpdatingPhone ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Shop Name</Label>
                  <Input
                    defaultValue={profile.name}
                    disabled={isApproved}
                    onBlur={(e) => {
                      if (isApproved) return;
                      startTransition(async () => {
                        const r = await updateShopProfileAction({ name: e.target.value });
                        if (r.success) toast.success("Shop name updated");
                        else toast.error(r.error || "Update failed");
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Owner Name</Label>
                  <Input
                    defaultValue={profile.owner_name}
                    disabled={isApproved}
                    onBlur={(e) => {
                      if (isApproved) return;
                      startTransition(async () => {
                        const r = await updateShopProfileAction({ owner_name: e.target.value });
                        if (r.success) toast.success("Owner name updated");
                        else toast.error(r.error || "Update failed");
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    defaultValue={profile.address}
                    disabled={isApproved}
                    onBlur={(e) => {
                      if (isApproved) return;
                      startTransition(async () => {
                        const r = await updateShopProfileAction({ address: e.target.value });
                        if (r.success) toast.success("Address updated");
                        else toast.error(r.error || "Update failed");
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input
                    defaultValue={profile.pincode}
                    disabled={isApproved}
                    onBlur={(e) => {
                      if (isApproved) return;
                      startTransition(async () => {
                        const r = await updateShopProfileAction({ pincode: e.target.value });
                        if (r.success) toast.success("Pincode updated");
                        else toast.error(r.error || "Update failed");
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Drug License Number</Label>
                  <Input defaultValue={profile.drug_license_no} disabled={true} className="bg-muted text-muted-foreground" />
                </div>
                <div>
                  <Label>GST Number</Label>
                  <Input defaultValue={profile.gst_no ?? "Not Provided"} disabled={true} className="bg-muted text-muted-foreground" />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input defaultValue={profile.pan_no ?? "Not Provided"} disabled={true} className="bg-muted text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200/60 bg-red-50/10 dark:bg-red-950/5">
            <CardHeader>
              <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Deactivate Shop Account</p>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Deactivating your shop account hides your dashboard, prevents pharmacy operations, and logs you out immediately. To reactivate, contact a Platform Administrator.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-fit"
                  onClick={async () => {
                    const confirm = window.confirm(
                      "CRITICAL ACTION: Are you sure you want to deactivate your pharmacy account? You will be logged out immediately."
                    );
                    if (!confirm) return;

                    startTransition(async () => {
                      const r = await deactivateShopAccountAction();
                      if (r.success) {
                        toast.success("Account deactivated. Redirecting to login...");
                        window.location.href = "/login";
                      } else {
                        toast.error(r.error || "Deactivation failed.");
                      }
                    });
                  }}
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Deactivate Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "staff" && (
        <Card className="relative overflow-hidden">
          {!isApproved && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-background/50 backdrop-blur-sm">
              <div className="text-center p-4">
                <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-2 animate-bounce" />
                <p className="font-bold text-sm text-foreground">Verification Pending</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Staff management is locked until your shop is verified and approved.
                </p>
              </div>
            </div>
          )}
          <CardHeader><CardTitle className="text-base">Staff Members</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {staff.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-medium text-foreground">{u.name}</span>
                  <span className="text-xs text-muted-foreground">({u.email})</span>
                  <Badge variant="secondary" className="w-fit">{u.role === "shop_owner" ? "Owner" : "Staff"}</Badge>
                </div>
                {u.role === "shop_staff" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors animate-in fade-in"
                    onClick={async () => {
                      const confirm = window.confirm(`Are you sure you want to delete staff account "${u.name}"?`);
                      if (!confirm) return;
                      startTransition(async () => {
                        const r = await deleteStaffAction(u.id);
                        if (r.success) {
                          toast.success(`Staff "${u.name}" deleted successfully.`);
                          load();
                        } else {
                          toast.error(r.error || "Failed to delete staff");
                        }
                      });
                    }}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
              <div><Label>Name</Label><Input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} /></div>
              <Button onClick={() => startTransition(async () => {
                const r = await addStaffAction(staffForm);
                if (r.success) { toast.success("Staff added"); load(); setStaffForm({ name: "", email: "", password: "" }); }
                else toast.error(r.error);
              })} disabled={isPending}>
                <UserPlus className="mr-1 h-4 w-4" /> Add Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "password" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
          <CardContent className="max-w-md space-y-4">
            <div><Label>Current Password</Label><Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></div>
            <div><Label>New Password</Label><Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} /></div>
            <Button onClick={() => startTransition(async () => {
              const r = await changePasswordAction(pwForm.current, pwForm.newPw);
              if (r.success) { toast.success("Password updated"); setPwForm({ current: "", newPw: "" }); }
              else toast.error(r.error);
            })} disabled={isPending}>
              {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update Password
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "subscription" && (
        <div className="relative">
          {!isApproved && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-background/50 backdrop-blur-sm rounded-xl">
              <div className="text-center p-4">
                <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-2 animate-bounce" />
                <p className="font-bold text-sm text-foreground">Verification Pending</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Subscription management is locked until your shop is verified and approved.
                </p>
              </div>
            </div>
          )}
          <div className={!isApproved ? "blur-xs pointer-events-none select-none grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-3"}>
            {plan && (
              <Card className="border-primary sm:col-span-3">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      Current plan: <strong>{plan.name}</strong> — {formatCurrency(Number(plan.price))}/mo
                      <Badge className="font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" variant="outline">{profile.subscription_status.toUpperCase()}</Badge>
                    </div>
                    {/* Auto-renew/Schedule Slider Switch */}
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-muted-foreground">Auto-Renew (Schedule Subscription):</span>
                      <button
                        role="switch"
                        aria-checked={profile.auto_renew}
                        disabled={isPending}
                        onClick={() => {
                          const nextVal = !profile.auto_renew;
                          startTransition(async () => {
                            const r = await toggleAutoRenewAction(nextVal);
                            if (r.success) {
                              toast.success(nextVal ? "Auto-renewal scheduled successfully" : "Auto-renewal cancelled");
                              load();
                            } else {
                              toast.error("Failed to update auto-renewal settings");
                            }
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          profile.auto_renew ? "bg-primary" : "bg-input"
                        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                            profile.auto_renew ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-semibold ${profile.auto_renew ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {profile.auto_renew ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setActiveAccordion(plan.name);
                      setIsDetailsOpen(true);
                    }}
                  >
                    View Plan Features
                  </Button>
                </CardContent>
              </Card>
            )}
            {plans.map((p) => {
              const isCurrent = !!(plan && plan.name === p.name);
              return (
                <Card key={p.id} className={`flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative ${isCurrent ? 'border-primary/55 ring-1 ring-primary/20' : ''}`}>
                  {p.name === "Professional" && (
                    <div className="absolute top-0 right-0 transform translate-x-[-10px] translate-y-[10px]">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base font-bold">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(Number(p.price))}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      <p className="mt-2 text-xs text-muted-foreground min-h-[32px]">{p.description}</p>
                      
                      {/* Brief overview of core limits */}
                      <ul className="mt-4 space-y-2 text-xs text-muted-foreground border-t pt-4">
                        {p.name === "Starter" && (
                          <>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 30 bills / day</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Up to 100 medicine SKUs</li>
                            <li className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-muted-foreground/60" /> AI Assistant (Locked)</li>
                          </>
                        )}
                        {p.name === "Professional" && (
                          <>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 100 bills / day</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Up to 1,000 medicine SKUs</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> AI Assistant (10 searches/day)</li>
                          </>
                        )}
                        {p.name === "Enterprise" && (
                          <>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Unlimited bills / day</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Unlimited medicine SKUs</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> AI Assistant (Unlimited)</li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="mt-6 space-y-2">
                      <Button className="w-full" size="sm" onClick={() => startTransition(async () => {
                        const r = await selectPlanAction(p.id);
                        if (r.success) { toast.success(r.message); load(); }
                        else toast.error(r.error);
                      })} disabled={isPending || isCurrent}>
                        {isCurrent ? "Current Plan" : "Select Plan"}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs text-primary hover:text-primary/80 hover:bg-primary/5" 
                        size="sm" 
                        onClick={() => {
                          setActiveAccordion(p.name);
                          setIsDetailsOpen(true);
                        }}
                      >
                        View Features & Limits
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Subscription Details Modal */}
          {isDetailsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDetailsOpen(false)}>
              <div 
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border rounded-xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200 animate-out fade-out"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Modal Close Button */}
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Modal Header */}
                <div className="mb-6 pr-8">
                  <h3 className="text-xl font-bold text-foreground">Plan Categories & Features</h3>
                  <p className="text-sm text-muted-foreground">Select a plan category to expand and view detailed limits in table format.</p>
                </div>

                {/* Toggleable Accordions */}
                <div className="space-y-4">
                  {/* Starter Accordion */}
                  <div className="border rounded-lg overflow-hidden bg-card transition-all duration-200 shadow-sm">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "Starter" ? null : "Starter")}
                      className={`w-full flex items-center justify-between p-4 font-semibold text-left transition-colors ${activeAccordion === "Starter" ? "bg-accent/40 text-foreground" : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">Starter Plan</span>
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground font-semibold">₹999 / mo</Badge>
                      </div>
                      {activeAccordion === "Starter" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    
                    {activeAccordion === "Starter" && (
                      <div className="p-4 border-t bg-muted/10 overflow-x-auto animate-in slide-in-from-top-1 duration-200">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="border-b border-muted-foreground/20 text-muted-foreground">
                              <th className="py-2.5 font-semibold text-xs uppercase tracking-wider">Feature / Limit</th>
                              <th className="py-2.5 text-right font-semibold text-xs uppercase tracking-wider">Starter Plan Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-muted-foreground/10">
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Price</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">₹999 / mo</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Daily Billing Limit</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">30 bills / day</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Medicine SKUs Limit</td>
                              <td className="py-2.5 text-right text-foreground font-medium">Up to 100 types</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Monthly Stock Entries</td>
                              <td className="py-2.5 text-right text-foreground font-medium">100 entries / mo</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Supplier/Dealer Management</td>
                              <td className="py-2.5 text-right text-foreground font-medium">Up to 3 dealers</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Staff Accounts</td>
                              <td className="py-2.5 text-right text-foreground font-medium">1 staff user</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Dashboard & Analytics</td>
                              <td className="py-2.5 text-right text-amber-600 dark:text-amber-500 font-medium">
                                Basic KPIs only (Graphs are locked)
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">AI Assistant</td>
                              <td className="py-2.5 text-right text-destructive font-medium flex items-center justify-end gap-1.5">
                                <Lock className="h-3.5 w-3.5" /> Locked
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Billing History Storage</td>
                              <td className="py-2.5 text-right text-foreground font-medium">
                                1,000 records (FIFO auto-overwrite)
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Professional Accordion */}
                  <div className="border rounded-lg overflow-hidden bg-card transition-all duration-200 shadow-sm">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "Professional" ? null : "Professional")}
                      className={`w-full flex items-center justify-between p-4 font-semibold text-left transition-colors ${activeAccordion === "Professional" ? "bg-accent/40 text-foreground" : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">Professional Plan</span>
                        <Badge className="bg-primary text-primary-foreground font-semibold">₹1,999 / mo</Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-semibold text-[10px]">Most Popular</Badge>
                      </div>
                      {activeAccordion === "Professional" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    
                    {activeAccordion === "Professional" && (
                      <div className="p-4 border-t bg-muted/10 overflow-x-auto animate-in slide-in-from-top-1 duration-200">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="border-b border-muted-foreground/20 text-muted-foreground">
                              <th className="py-2.5 font-semibold text-xs uppercase tracking-wider">Feature / Limit</th>
                              <th className="py-2.5 text-right font-semibold text-xs uppercase tracking-wider">Professional Plan Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-muted-foreground/10">
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Price</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">₹1,999 / mo</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Daily Billing Limit</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">100 bills / day</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Medicine SKUs Limit</td>
                              <td className="py-2.5 text-right text-foreground font-medium">Up to 1,000 types</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Monthly Stock Entries</td>
                              <td className="py-2.5 text-right text-foreground font-medium">1,500 entries / mo</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Supplier/Dealer Management</td>
                              <td className="py-2.5 text-right text-foreground font-medium">5–7 dealers</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Staff Accounts</td>
                              <td className="py-2.5 text-right text-foreground font-medium">Up to 5 staff users</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Dashboard & Analytics</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Full Access & Advanced Analytics
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">AI Assistant</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Active (10 searches / day limit)
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Billing History Storage</td>
                              <td className="py-2.5 text-right text-foreground font-medium">
                                3,000 records (FIFO auto-overwrite)
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Enterprise Accordion */}
                  <div className="border rounded-lg overflow-hidden bg-card transition-all duration-200 shadow-sm">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "Enterprise" ? null : "Enterprise")}
                      className={`w-full flex items-center justify-between p-4 font-semibold text-left transition-colors ${activeAccordion === "Enterprise" ? "bg-accent/40 text-foreground" : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">Enterprise Plan</span>
                        <Badge variant="outline" className="border-primary/30 text-primary font-semibold">₹4,999 / mo</Badge>
                      </div>
                      {activeAccordion === "Enterprise" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    
                    {activeAccordion === "Enterprise" && (
                      <div className="p-4 border-t bg-muted/10 overflow-x-auto animate-in slide-in-from-top-1 duration-200">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="border-b border-muted-foreground/20 text-muted-foreground">
                              <th className="py-2.5 font-semibold text-xs uppercase tracking-wider">Feature / Limit</th>
                              <th className="py-2.5 text-right font-semibold text-xs uppercase tracking-wider">Enterprise Plan Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-muted-foreground/10">
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Price</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">₹4,999 / mo</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Daily Billing Limit</td>
                              <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Medicine SKUs Limit</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Monthly Stock Entries</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Supplier/Dealer Management</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Staff Accounts</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Dashboard & Analytics</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Full Access & Advanced Analytics
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">AI Assistant</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Fully Unlocked (Unlimited searches)
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 text-muted-foreground font-medium">Billing History Storage</td>
                              <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                Unlimited / Lifetime Storage
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setIsDetailsOpen(false)} size="sm">
                    Close
                  </Button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
      {tab === "support" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Customer Support</h3>
              <p className="text-xs text-muted-foreground">Submit support queries and chat directly with platform admins.</p>
            </div>
            <Button onClick={() => setShowNewTicketModal(true)} size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" /> Open Support Ticket
            </Button>
          </div>

          {loadingTickets && tickets.length === 0 ? (
            <Card className="flex h-64 items-center justify-center border">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Card>
          ) : tickets.length === 0 ? (
            <Card className="border p-8 text-center bg-card">
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <h4 className="font-semibold text-sm">No support tickets found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">If you are facing issues with billing, stock, analytics, or server speed, open a ticket to chat with an admin.</p>
              <Button onClick={() => setShowNewTicketModal(true)} size="sm" variant="outline" className="mt-4">
                Create First Ticket
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-5 border rounded-xl overflow-hidden bg-card min-h-[550px] max-h-[600px] shadow-sm">
              {/* Left Pane - Tickets List */}
              <div className="md:col-span-2 border-r flex flex-col h-full bg-muted/10">
                <div className="p-4 border-b bg-card">
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Your Support Tickets</h4>
                </div>
                <div className="flex-1 overflow-y-auto divide-y">
                  {tickets.map((t) => {
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
                        <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                          <span>Ref: #{t.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane - Chat Box */}
              <div className="md:col-span-3 flex flex-col h-full bg-card">
                {selectedTicketId ? (
                  (() => {
                    const ticket = tickets.find((t) => t.id === selectedTicketId);
                    if (!ticket) return null;
                    const isClosed = ticket.status === "closed";

                    return (
                      <div className="flex flex-col h-full relative">
                        {/* Chat Header */}
                        <div className="p-4 border-b bg-card flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{ticket.subject}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                              Ref: #{ticket.id.slice(0, 8)} · Category: <span className="capitalize">{ticket.category.replace("_", " ")}</span>
                            </p>
                          </div>
                          <Badge variant={isClosed ? "secondary" : "success"} className="font-semibold py-0.5 px-2.5">
                            {ticket.status.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Chat Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-[350px] max-h-[400px]">
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
                                      ? "mr-auto bg-muted/60 text-foreground rounded-tl-none border"
                                      : "ml-auto bg-primary text-primary-foreground rounded-tr-none"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <span className="font-bold text-[10px] tracking-wide uppercase opacity-90">
                                      {isAdmin ? `Admin: ${m.senderName}` : m.senderName}
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
                          {isClosed ? (
                            <div className="flex items-center justify-center p-3 bg-muted rounded-lg border text-xs font-semibold text-muted-foreground select-none gap-2">
                              <Lock className="h-4 w-4" /> This support ticket is closed. If you still face issues, please open a new ticket.
                            </div>
                          ) : (
                            <form onSubmit={handleSendReply} className="flex gap-2">
                              <Input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Explain details or write a reply message..."
                                disabled={isPending}
                                className="flex-1 text-sm border-input"
                              />
                              <Button type="submit" size="sm" disabled={isPending || !replyText.trim()} className="gap-1.5 shadow-sm">
                                <Send className="h-3.5 w-3.5" /> Send
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h5 className="font-bold text-sm text-foreground">Select a Support Ticket</h5>
                    <p className="text-xs max-w-xs mt-1">Choose an issue from the list on the left to view messages and chat with our platform support team.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Ticket Modal */}
          {showNewTicketModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <h4 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <LifeBuoy className="h-5 w-5 text-primary" /> Open Support Ticket
                  </h4>
                  <Button variant="ghost" size="icon" onClick={() => setShowNewTicketModal(false)} className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Select Issue Category</Label>
                    <select
                      id="category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="billing">Billing & Subscription</option>
                      <option value="ai">AI Assistant</option>
                      <option value="stock_add">Stock / FEFO Additions</option>
                      <option value="analytics">Analytics & Charts</option>
                      <option value="delay_response">Slow Server Response</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Subject / Issue Title</Label>
                    <Input
                      id="subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Subscription payment failed but amount deducted"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message">Explain the Issue in Detail</Label>
                    <textarea
                      id="message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Describe what went wrong, steps to reproduce, or support required..."
                      rows={4}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4 mt-4">
                    <Button type="button" variant="outline" onClick={() => setShowNewTicketModal(false)} disabled={isPending} size="sm">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending} size="sm" className="shadow-sm">
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
