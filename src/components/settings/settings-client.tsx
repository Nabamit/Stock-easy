"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
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
} from "@/lib/actions/settings";
import { formatCurrency } from "@/lib/utils";

export function SettingsClient() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getShopProfileAction>>>(null);
  const [staff, setStaff] = useState<Awaited<ReturnType<typeof getStaffAction>>>([]);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getSubscriptionPlansAction>>>([]);
  const [tab, setTab] = useState<"shop" | "staff" | "password" | "subscription">("shop");
  const [isPending, startTransition] = useTransition();
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "" });

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

  useEffect(() => { load(); }, []);

  if (!profile) return <p>Loading...</p>;

  const plan = profile.subscription_plans as { name: string; price: number } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["shop", "staff", "password", "subscription"] as const).map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {tab === "shop" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Shop Profile</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(["name", "phone", "address", "city", "state", "pincode"] as const).map((field) => (
              <div key={field}>
                <Label>{field}</Label>
                <Input
                  defaultValue={String(profile[field] ?? "")}
                  onBlur={(e) => {
                    startTransition(async () => {
                      await updateShopProfileAction({ [field]: e.target.value });
                      toast.success("Updated");
                    });
                  }}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Badge variant={profile.verification_status === "approved" ? "success" : "warning"}>
                {profile.verification_status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "staff" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff Members</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {staff.map((u) => (
              <div key={u.id} className="flex justify-between border-b pb-2 text-sm">
                <span>{u.name} ({u.email})</span>
                <Badge variant="secondary">{u.role}</Badge>
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
        <div className="grid gap-4 sm:grid-cols-3">
          {plan && (
            <Card className="border-primary sm:col-span-3">
              <CardContent className="p-4">
                Current plan: <strong>{plan.name}</strong> — {formatCurrency(Number(plan.price))}/mo
                <Badge className="ml-2" variant="success">{profile.subscription_status}</Badge>
              </CardContent>
            </Card>
          )}
          {plans.map((p) => (
            <Card key={p.id}>
              <CardHeader><CardTitle className="text-base">{p.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(Number(p.price))}<span className="text-sm font-normal">/mo</span></p>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                <Button className="mt-4 w-full" size="sm" onClick={() => startTransition(async () => {
                  const r = await selectPlanAction(p.id);
                  if (r.success) { toast.success(r.message); load(); }
                  else toast.error(r.error);
                })} disabled={isPending}>
                  Select Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
