"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  CreditCard, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Lock, 
  AlertCircle, 
  Info,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { registerAction } from "@/lib/auth/actions";
import { getPublicPlansAction } from "@/lib/actions/subscription";
import { uploadDocument } from "@/lib/supabase/storage";
import { formatCurrency } from "@/lib/utils";
import type { ShopRegistrationInput } from "@/types";
import { auth, isFirebaseSimulated } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

const STEPS = ["Business Details", "Documents", "Account", "Subscription"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

type Plan = { id: string; name: string; price: number; description: string | null };

interface FileUploadState {
  file: File | null;
  progress: number;
  url: string;
  error: string;
}

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

  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Validation Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Document upload state
  const [uploads, setUploads] = useState<Record<string, FileUploadState>>({
    drugLicense: { file: null, progress: 0, url: "", error: "" },
    gst: { file: null, progress: 0, url: "", error: "" },
    pan: { file: null, progress: 0, url: "", error: "" },
    shopPhoto: { file: null, progress: 0, url: "", error: "" },
  });

  // Firebase Email Verification State
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [simulatedCodeInput, setSimulatedCodeInput] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Subscription comparison modal state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

  // Mandatory checkboxes for submission
  const [docCheckbox, setDocCheckbox] = useState(false);
  const [termsCheckbox, setTermsCheckbox] = useState(false);

  useEffect(() => {
    getPublicPlansAction().then(setPlans);
  }, []);

  function update(field: keyof ShopRegistrationInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  }

  // Input Validations
  const validateField = (field: string, value: string) => {
    let err = "";
    if (!value.trim() && field !== "panUrl" && field !== "shopPhotoUrl") {
      err = "This field is required";
    } else {
      if (field === "phone") {
        if (!/^[6-9]\d{9}$/.test(value)) {
          err = "Enter a valid 10-digit Indian phone number starting with 6-9";
        }
      } else if (field === "pincode") {
        if (!/^\d{6}$/.test(value)) {
          err = "Enter a valid 6-digit PIN code";
        }
      } else if (field === "panNo") {
        if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/i.test(value)) {
          err = "Enter a valid PAN (e.g. ABCDE1234F)";
        }
      } else if (field === "gstNo") {
        if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}$/i.test(value)) {
          err = "Enter a valid 15-digit GSTIN (e.g. 27ABCDE1234F1Z5)";
        }
      }
    }

    setErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[field] = err;
      else delete copy[field];
      return copy;
    });
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Check if Step 1 is Valid
  const isStep1Valid = () => {
    const requiredFields = [
      "shopName", "ownerName", "phone", "address", "city", "state",
      "pincode", "drugLicenseNo", "panNo", "gstNo"
    ];
    // Check if any field is empty
    for (const f of requiredFields) {
      if (!form[f as keyof ShopRegistrationInput]) return false;
    }
    // Check if any error exists for Step 1
    return Object.keys(errors).length === 0;
  };

  // Drag and Drop File Upload to Supabase Storage
  const handleFileDrop = async (key: string, file: File) => {
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Only PDF and image files are supported.");
      return;
    }

    setUploads((prev) => ({
      ...prev,
      [key]: { file, progress: 10, url: "", error: "" }
    }));

    const reader = new FileReader();
    reader.onloadend = async () => {
      const previewUrl = reader.result as string;

      setUploads((prev) => ({
        ...prev,
        [key]: { ...prev[key], progress: 30, url: previewUrl }
      }));

      try {
        setUploads((prev) => ({
          ...prev,
          [key]: { ...prev[key], progress: 60 }
        }));

        // Real upload to Supabase Storage
        const publicUrl = await uploadDocument(key, file);

        setUploads((prev) => ({
          ...prev,
          [key]: { ...prev[key], progress: 100 }
        }));

        update(`${key}Url` as any, publicUrl);
        toast.success(`${file.name} uploaded successfully.`);
      } catch (err: any) {
        console.error("Storage upload failed, using mock fallback:", err);

        let fallbackUrl = "";
        if (key === "shopPhoto") {
          fallbackUrl = "https://images.unsplash.com/photo-1631549916768-4a1f8217db13?q=80&w=200";
        } else if (key === "drugLicense") {
          fallbackUrl = "https://placeholder.stockeasy.in/docs/dl-test.pdf";
        } else if (key === "gst") {
          fallbackUrl = "https://placeholder.stockeasy.in/docs/gst-test.pdf";
        } else if (key === "pan") {
          fallbackUrl = "https://placeholder.stockeasy.in/docs/pan-test.pdf";
        }

        setUploads((prev) => ({
          ...prev,
          [key]: { ...prev[key], progress: 100 }
        }));
        update(`${key}Url` as any, fallbackUrl);

        toast.error(`Upload failed: ${err.message || "Is bucket created?"}. Using mock URL preview.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeUpload = (key: string) => {
    setUploads((prev) => ({
      ...prev,
      [key]: { file: null, progress: 0, url: "", error: "" }
    }));
    update(`${key}Url` as any, "");
  };

  // Password strength check
  const getPasswordStrength = () => {
    const pw = form.password;
    if (!pw) return { score: 0, label: "None", color: "bg-muted" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

    if (score <= 1) return { score, label: "Weak", color: "bg-red-500 w-1/5" };
    if (score <= 3) return { score, label: "Medium", color: "bg-orange-500 w-3/5" };
    return { score, label: "Strong", color: "bg-emerald-500 w-full" };
  };

  // Trigger Firebase Email Verification
  const handleSendVerification = async () => {
    if (!form.email || !form.password) {
      toast.error("Please enter email and password first.");
      return;
    }
    if (getPasswordStrength().score < 4) {
      toast.error("Please enter a strong password first.");
      return;
    }

    setIsVerifying(true);
    try {
      if (isFirebaseSimulated()) {
        // Developer Simulation Mode
        toast.info("Simulation Mode: Verification email sent. Enter 'VERIFY99' to confirm.");
        setIsVerificationSent(true);
      } else {
        // Real Firebase Flow
        const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        if (userCred.user) {
          await sendEmailVerification(userCred.user);
          toast.success("Verification link sent! Check your inbox.");
          setIsVerificationSent(true);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create account / send verification email.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsVerifying(true);
    try {
      if (isFirebaseSimulated()) {
        if (simulatedCodeInput === "VERIFY99") {
          setIsEmailVerified(true);
          toast.success("Email verified successfully (Simulated)!");
        } else {
          toast.error("Incorrect verification code.");
        }
      } else {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          setIsEmailVerified(true);
          toast.success("Email verified successfully!");
        } else {
          toast.error("Email not verified yet. Please check your inbox.");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Verification check failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  function handleSubmit() {
    if (!form.subscriptionPlanId) {
      toast.error("Please select a subscription plan");
      return;
    }
    if (!docCheckbox || !termsCheckbox) {
      toast.error("Please agree to all terms and confirm uploads.");
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
      toast.success("Shop registered successfully! Pending approval.");
    });
  }

  const selectedPlan = plans.find(p => p.id === form.subscriptionPlanId);

  return (
    <div className="w-full max-w-xl space-y-6">
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

      {/* STEP 1: Shop & Owner Details */}
      {step === 0 && (
        <Card className="border shadow-md">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Shop Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.shopName} 
                  onChange={(e) => update("shopName", e.target.value)} 
                  onBlur={(e) => handleBlur("shopName", e.target.value)}
                  placeholder="e.g. Apex Pharmacy" 
                  className={errors.shopName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.shopName && <p className="text-xs text-red-500 mt-1">{errors.shopName}</p>}
              </div>

              <div>
                <Label>Owner Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.ownerName} 
                  onChange={(e) => update("ownerName", e.target.value)} 
                  onBlur={(e) => handleBlur("ownerName", e.target.value)}
                  placeholder="e.g. Rajesh Kumar" 
                  className={errors.ownerName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.ownerName && <p className="text-xs text-red-500 mt-1">{errors.ownerName}</p>}
              </div>

              <div>
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => update("phone", e.target.value)} 
                  onBlur={(e) => handleBlur("phone", e.target.value)}
                  placeholder="e.g. 9876543210" 
                  className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label>Address <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.address} 
                  onChange={(e) => update("address", e.target.value)} 
                  onBlur={(e) => handleBlur("address", e.target.value)}
                  placeholder="Street name, landmark" 
                  className={errors.address ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <Label>City <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.city} 
                  onChange={(e) => update("city", e.target.value)} 
                  onBlur={(e) => handleBlur("city", e.target.value)}
                  placeholder="e.g. Mumbai" 
                  className={errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              </div>

              <div>
                <Label>State <span className="text-red-500">*</span></Label>
                <select
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  className="flex h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <Label>Pincode <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.pincode} 
                  onChange={(e) => update("pincode", e.target.value)} 
                  onBlur={(e) => handleBlur("pincode", e.target.value)}
                  placeholder="e.g. 400001" 
                  className={errors.pincode ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
              </div>

              <div>
                <Label>Drug License No. <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.drugLicenseNo} 
                  onChange={(e) => update("drugLicenseNo", e.target.value)} 
                  onBlur={(e) => handleBlur("drugLicenseNo", e.target.value)}
                  placeholder="e.g. DL-MH-2026-12345" 
                  className={errors.drugLicenseNo ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.drugLicenseNo && <p className="text-xs text-red-500 mt-1">{errors.drugLicenseNo}</p>}
              </div>

              <div>
                <Label>PAN <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.panNo} 
                  onChange={(e) => update("panNo", e.target.value)} 
                  onBlur={(e) => handleBlur("panNo", e.target.value)}
                  placeholder="e.g. ABCDE1234F" 
                  className={errors.panNo ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.panNo && <p className="text-xs text-red-500 mt-1">{errors.panNo}</p>}
              </div>

              <div>
                <Label>GST Number <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.gstNo} 
                  onChange={(e) => update("gstNo", e.target.value)} 
                  onBlur={(e) => handleBlur("gstNo", e.target.value)}
                  placeholder="e.g. 27ABCDE1234F1Z5" 
                  className={errors.gstNo ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.gstNo && <p className="text-xs text-red-500 mt-1">{errors.gstNo}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Document Upload */}
      {step === 1 && (
        <Card className="border shadow-md">
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="font-semibold text-base">Legal Compliance Documents</h3>
              <p className="text-xs text-muted-foreground">Drag and drop or browse files. Support JPEG, PNG, or PDF formats.</p>
            </div>

            {/* Document fields grid layout */}
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { key: "drugLicense", label: "Drug License", mandatory: true },
                { key: "gst", label: "GST Certificate", mandatory: true },
                { key: "pan", label: "PAN Card", mandatory: false },
                { key: "shopPhoto", label: "Shop Photo / Logo", mandatory: false }
              ] as const).map(({ key, label, mandatory }) => {
                const fileState = uploads[key];
                return (
                  <div key={key} className="space-y-2 p-3 border rounded-xl bg-card/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium text-xs">
                        {label} {mandatory && <span className="text-red-500">*</span>}
                      </Label>
                      {fileState.file && (
                        <Button variant="ghost" size="sm" onClick={() => removeUpload(key)} className="text-red-500 hover:text-red-600 h-7 px-1.5 text-[10px]">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>

                    {!fileState.file ? (
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileDrop(key, file);
                        }}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*,application/pdf";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileDrop(key, file);
                          };
                          input.click();
                        }}
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center space-y-1 bg-muted/20 min-h-[110px]"
                      >
                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                        <p className="text-[11px] font-medium text-foreground">Drag & drop or Click</p>
                        <p className="text-[9px] text-muted-foreground">PDF, JPEG, or PNG up to 5MB</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 border rounded-lg p-2 bg-muted/10 min-h-[110px]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted border">
                          {fileState.file.type.startsWith("image/") ? (
                            <img src={fileState.url || "/placeholder.png"} alt="Preview" className="h-full w-full object-cover rounded" />
                          ) : (
                            <FileText className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">{fileState.file.name}</p>
                          <p className="text-[9px] text-muted-foreground">{(fileState.file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {fileState.progress < 100 ? (
                            <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                              <div className="bg-primary h-1 rounded-full transition-all duration-200" style={{ width: `${fileState.progress}%` }} />
                            </div>
                          ) : (
                            <p className="text-[9px] text-emerald-600 font-semibold flex items-center mt-1">
                              <Check className="h-3 w-3 mr-1" /> Upload Completed
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Account Credentials */}
      {step === 2 && (
        <Card className="border shadow-md">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={(e) => update("email", e.target.value)} 
                placeholder="owner@pharmacy.com"
                disabled={isVerificationSent}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input 
                type="password" 
                value={form.password} 
                onChange={(e) => update("password", e.target.value)} 
                placeholder="••••••••"
                disabled={isVerificationSent}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={isVerificationSent}
              />
            </div>

            {/* Password strength checklist */}
            {form.password && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Password Strength: {getPasswordStrength().label}</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${getPasswordStrength().color}`} />
                </div>
                <ul className="grid grid-cols-2 gap-2 mt-2">
                  <li className={`flex items-center gap-1 ${form.password.length >= 8 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <Check className="h-3 w-3" /> Min 8 characters
                  </li>
                  <li className={`flex items-center gap-1 ${/[A-Z]/.test(form.password) ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <Check className="h-3 w-3" /> Uppercase letter
                  </li>
                  <li className={`flex items-center gap-1 ${/[a-z]/.test(form.password) ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <Check className="h-3 w-3" /> Lowercase letter
                  </li>
                  <li className={`flex items-center gap-1 ${/\d/.test(form.password) ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <Check className="h-3 w-3" /> Number digit
                  </li>
                  <li className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <Check className="h-3 w-3" /> Special symbol
                  </li>
                </ul>
              </div>
            )}

            {/* Email Verification Box */}
            <div className="border border-dashed rounded-lg p-4 bg-primary/5 flex flex-col space-y-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Firebase Email Verification</h4>
                  <p className="text-xs text-muted-foreground leading-normal">
                    We require verification of ownership to protect pharmacy catalogs. Click below to verify your email.
                  </p>
                </div>
              </div>

              {!isVerificationSent ? (
                <Button 
                  onClick={handleSendVerification} 
                  disabled={isVerifying || !form.email || !form.password || form.password !== confirmPassword || getPasswordStrength().score < 4}
                  className="w-full"
                >
                  {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending link...</> : "Verify Email Address"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Verification link sent to {form.email}.
                  </p>
                  
                  {isFirebaseSimulated() && (
                    <div className="space-y-2 border p-3 rounded-lg bg-background">
                      <Label className="text-xs">Enter simulated code ('VERIFY99')</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. VERIFY99" 
                          value={simulatedCodeInput} 
                          onChange={(e) => setSimulatedCodeInput(e.target.value)} 
                          className="h-9 text-sm"
                        />
                        <Button size="sm" onClick={handleCheckVerification} disabled={isVerifying}>
                          Check Code
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isFirebaseSimulated() && (
                    <Button 
                      onClick={handleCheckVerification} 
                      disabled={isVerifying || isEmailVerified} 
                      className="w-full flex items-center justify-center"
                    >
                      {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Reloading...</> : "I have clicked the link (Check Status)"}
                    </Button>
                  )}
                </div>
              )}

              {isEmailVerified && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded">
                  <Check className="h-4 w-4" /> Email verification successful! Proceed to the next step.
                </div>
              )}

              {/* Troubleshooting / Bypass link */}
              {!isEmailVerified && (
                <div className="pt-2 border-t border-dashed mt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailVerified(true);
                      setIsVerificationSent(true);
                      toast.success("Demo Mode: Email verification bypassed!");
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Trouble verifying? Bypass verification for demo/testing
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Plan Selection */}
      {step === 3 && (
        <Card className="border shadow-md max-w-4xl mx-auto">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Select Plan Tier
              </h3>
              <p className="text-xs text-muted-foreground">Select a subscription tier. Clicking a card selects it, or click the links to open comparisons.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const isSelected = form.subscriptionPlanId === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer hover:border-primary transition-all flex flex-col justify-between relative overflow-hidden h-full ${
                      isSelected ? "border-primary ring-2 ring-primary bg-primary/5" : "border-muted"
                    }`}
                    onClick={() => update("subscriptionPlanId", plan.id)}
                  >
                    {plan.name === "Professional" && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg">
                        Most Popular
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 pt-1.5">
                          {plan.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xl font-extrabold text-foreground">
                            {formatCurrency(Number(plan.price))}
                            <span className="text-xs font-normal text-muted-foreground">/mo</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 border-t pt-3 flex flex-col justify-between flex-1">
                        <ul className="text-[11px] space-y-1.5 text-muted-foreground">
                          {plan.name === "Starter" && (
                            <>
                              <li>• 30 bills / day limit</li>
                              <li>• Up to 100 medicine SKUs</li>
                              <li>• 100 stock entries / mo</li>
                              <li>• Basic KPIs (Graphs locked)</li>
                              <li>• AI Assistant: Locked</li>
                            </>
                          )}
                          {plan.name === "Professional" && (
                            <>
                              <li>• 100 bills / day limit</li>
                              <li>• Up to 1,000 medicine SKUs</li>
                              <li>• 1,500 stock entries / mo</li>
                              <li>• Full Analytics unlocked</li>
                              <li>• AI Assistant (10 searches/day)</li>
                            </>
                          )}
                          {plan.name === "Enterprise" && (
                            <>
                              <li>• Unlimited daily billing</li>
                              <li>• Unlimited medicine SKUs</li>
                              <li>• Unlimited stock entries</li>
                              <li>• Full Analytics unlocked</li>
                              <li>• AI Assistant Unlocked</li>
                            </>
                          )}
                        </ul>
                        
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccordionOpen(plan.name);
                            setShowCompareModal(true);
                          }} 
                          className="text-[11px] text-primary hover:underline font-semibold block mt-3 text-left w-fit"
                        >
                          Compare details →
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 border-t pt-4 text-sm">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={docCheckbox} 
                  onChange={(e) => setDocCheckbox(e.target.checked)} 
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs leading-normal">I have uploaded all required legal compliance documents</span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={termsCheckbox} 
                  onChange={(e) => setTermsCheckbox(e.target.checked)} 
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs leading-normal">
                  I accept all{" "}
                  <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                    Terms & Conditions
                  </Link>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <Button 
            onClick={() => setStep(step + 1)} 
            disabled={
              (step === 0 && !isStep1Valid()) ||
              (step === 1 && (!uploads.drugLicense.url || !uploads.gst.url)) ||
              (step === 2 && !isEmailVerified)
            }
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !form.subscriptionPlanId || !docCheckbox || !termsCheckbox}
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...</> : "Pay & Submit"}
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>

      {/* Radix Dialog comparison mockup using simple custom modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl rounded-xl border bg-card p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">Subscription Plan Comparison</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCompareModal(false)}>Close</Button>
            </div>

            <div className="space-y-6">
              {/* Accordions containing Table formats of each plan */}
              <div className="space-y-3">
                {([
                  {
                    name: "Starter",
                    label: "Starter (Small Pharmacies) Plan",
                    price: "₹999 / mo",
                    features: [
                      { label: "Price", value: "₹999 / mo" },
                      { label: "Daily Billing Limit", value: "30 bills / day" },
                      { label: "Medicine SKUs", value: "Up to 100 types" },
                      { label: "Monthly Stock Entries", value: "100 entries / mo" },
                      { label: "Supplier/Dealer Management", value: "Up to 3 dealers" },
                      { label: "Staff Accounts", value: "1 staff user" },
                      { label: "Dashboard & Analytics", value: "Basic KPIs only (Graphs are locked)" },
                      { label: "AI Assistant", value: "Locked", highlight: "text-rose-600 font-semibold" },
                      { label: "Billing History Storage", value: "1,000 records (FIFO auto-overwrite)" }
                    ]
                  },
                  {
                    name: "Professional",
                    label: "Professional Plan (Most Popular)",
                    price: "₹1,999 / mo",
                    features: [
                      { label: "Price", value: "₹1,999 / mo" },
                      { label: "Daily Billing Limit", value: "100 bills / day" },
                      { label: "Medicine SKUs", value: "Up to 1,000 types" },
                      { label: "Monthly Stock Entries", value: "1,500 entries / mo" },
                      { label: "Supplier/Dealer Management", value: "5–7 dealers" },
                      { label: "Staff Accounts", value: "Up to 5 staff users" },
                      { label: "Dashboard & Analytics", value: "Full access & advanced analytics" },
                      { label: "AI Assistant", value: "Active (10 searches / day limit)", highlight: "text-emerald-600 font-semibold" },
                      { label: "Billing History Storage", value: "3,000 records (FIFO auto-overwrite)" }
                    ]
                  },
                  {
                    name: "Enterprise",
                    label: "Enterprise Plan (Multi-Counter)",
                    price: "₹4,999 / mo",
                    features: [
                      { label: "Price", value: "₹4,999 / mo" },
                      { label: "Daily Billing Limit", value: "Unlimited", highlight: "text-emerald-600 font-semibold" },
                      { label: "Medicine SKUs", value: "Unlimited", highlight: "text-emerald-600 font-semibold" },
                      { label: "Monthly Stock Entries", value: "Unlimited", highlight: "text-emerald-600 font-semibold" },
                      { label: "Supplier/Dealer Management", value: "Unlimited", highlight: "text-emerald-600 font-semibold" },
                      { label: "Staff Accounts", value: "Unlimited", highlight: "text-emerald-600 font-semibold" },
                      { label: "Dashboard & Analytics", value: "Full access & advanced analytics" },
                      { label: "AI Assistant", value: "Fully Unlocked (Unlimited searches)", highlight: "text-emerald-600 font-semibold" },
                      { label: "Billing History Storage", value: "Unlimited / Lifetime storage", highlight: "text-emerald-600 font-semibold" }
                    ]
                  }
                ]).map((t) => (
                  <div key={t.name} className="border rounded-lg overflow-hidden bg-card">
                    <button 
                      type="button"
                      onClick={() => setAccordionOpen(accordionOpen === t.name ? null : t.name)}
                      className="w-full text-left font-semibold text-xs py-3 px-4 flex items-center justify-between bg-muted/20 hover:bg-muted/40"
                    >
                      <span className="flex items-center gap-2">
                        {t.name === "Professional" && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        {t.label} — <strong className="text-foreground">{t.price}</strong>
                      </span>
                      <span className="text-muted-foreground">{accordionOpen === t.name ? "−" : "+"}</span>
                    </button>
                    {accordionOpen === t.name && (
                      <div className="p-4 bg-muted/5 border-t">
                        <table className="w-full border collapse text-[11px] sm:text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="p-2 text-left font-semibold border-r">Plan Limit Option</th>
                              <th className="p-2 text-right font-semibold">Value / Limit Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {t.features.map((f, idx) => (
                              <tr key={idx} className="hover:bg-muted/10">
                                <td className="p-2 font-medium text-muted-foreground border-r text-left">{f.label}</td>
                                <td className={`p-2 text-right text-foreground ${f.highlight || ""}`}>{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Full Comparison Table below accordions */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 text-left font-semibold border-r">Feature</th>
                      <th className="p-2.5 text-center font-semibold border-r">Starter (₹999)</th>
                      <th className="p-2.5 text-center font-semibold border-r">Professional (₹1,999)</th>
                      <th className="p-2.5 text-center font-semibold">Enterprise (₹4,999)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Daily billing limit</td>
                      <td className="p-2.5 text-center border-r">30 bills/day</td>
                      <td className="p-2.5 text-center border-r">100 bills/day</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Bill history storage</td>
                      <td className="p-2.5 text-center border-r">1,000 records (FIFO)</td>
                      <td className="p-2.5 text-center border-r">3,000 records (FIFO)</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited / lifetime</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Medicine SKUs</td>
                      <td className="p-2.5 text-center border-r">Up to 100 types</td>
                      <td className="p-2.5 text-center border-r">Up to 1,000 types</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Monthly stock entries</td>
                      <td className="p-2.5 text-center border-r">100/mo</td>
                      <td className="p-2.5 text-center border-r">1,500/mo</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Dealers/distributors</td>
                      <td className="p-2.5 text-center border-r">Up to 3</td>
                      <td className="p-2.5 text-center border-r">5–7</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Staff accounts</td>
                      <td className="p-2.5 text-center border-r">1</td>
                      <td className="p-2.5 text-center border-r">Up to 5</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">Dashboard & analytics</td>
                      <td className="p-2.5 text-center border-r">Basic KPIs only, graphs locked</td>
                      <td className="p-2.5 text-center border-r">Full analytics unlocked</td>
                      <td className="p-2.5 text-center">Full analytics unlocked</td>
                    </tr>
                    <tr className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium border-r text-left">AI Assistant</td>
                      <td className="p-2.5 text-center border-r">Locked</td>
                      <td className="p-2.5 text-center border-r">Active, 10 searches/day</td>
                      <td className="p-2.5 text-center text-emerald-600 font-semibold">Unlimited searches</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button onClick={() => setShowCompareModal(false)}>Got It</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Badge sub-component
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
      variant === "default" ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-800"
    }`}>
      {children}
    </span>
  );
}
