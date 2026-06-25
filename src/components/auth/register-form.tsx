"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { registerAction } from "@/lib/auth/actions";
import { getPublicPlansAction } from "@/lib/actions/subscription";
import { formatCurrency } from "@/lib/utils";
import type { ShopRegistrationInput } from "@/types";

const STEPS = ["Business Details", "Documents", "Account", "Subscription"];

type Plan = { id: string; name: string; price: number; description: string | null };

export function RegisterForm() {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ShopRegistrationInput>({
    shopName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    drugLicenseNo: "",
    panNo: "",
    gstNo: "",
    drugLicenseUrl: "",
    panUrl: "",
    gstUrl: "",
    shopPhotoUrl: "",
    subscriptionPlanId: "",
  });

  useEffect(() => {
    getPublicPlansAction().then(setPlans);
  }, []);

  function update(field: keyof ShopRegistrationInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.subscriptionPlanId) {
      toast.error("Please select a subscription plan");
      return;
    }
    startTransition(async () => {
      const result = await registerAction(form);
      if (result && !result.success) {
        if (result.fieldErrors) {
          const firstMsg = Object.values(result.fieldErrors).flat()[0];
          toast.error(firstMsg ?? result.error ?? "Registration failed");
        } else {
          toast.error(result.error ?? "Registration failed");
        }
        return;
      }

      toast.success("Registration submitted — check your email for next steps");
    });
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Register Your Pharmacy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 w-12 rounded-full sm:w-16 ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Shop Name *</Label>
              <Input value={form.shopName} onChange={(e) => update("shopName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Owner Name *</Label>
              <Input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Drug License No. *</Label>
              <Input value={form.drugLicenseNo} onChange={(e) => update("drugLicenseNo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>PAN *</Label>
              <Input value={form.panNo} onChange={(e) => update("panNo", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>GST Number *</Label>
              <Input value={form.gstNo} onChange={(e) => update("gstNo", e.target.value)} required />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload document URLs (Drug License, PAN, GST, Shop Photo). Use Uploadthing in production.
          </p>
          {(["drugLicenseUrl", "panUrl", "gstUrl", "shopPhotoUrl"] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label>{field.replace("Url", "").replace(/([A-Z])/g, " $1")} URL *</Label>
              <Input value={form[field]} onChange={(e) => update(field, e.target.value)} placeholder="https://..." required />
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Choose a plan (Razorpay payment placeholder — activates on submit)
          </p>
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-colors ${form.subscriptionPlanId === plan.id ? "border-primary ring-2 ring-primary" : ""}`}
              onClick={() => update("subscriptionPlanId", plan.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                <p className="text-lg font-bold">{formatCurrency(Number(plan.price))}/mo</p>
              </CardContent>
            </Card>
          ))}
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            After payment, your shop enters verification queue. Access is locked until admin approval.
          </p>
        </div>
      )}

      <div className="flex justify-between gap-4">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !form.subscriptionPlanId}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : "Pay & Submit"}
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
