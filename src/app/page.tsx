import Link from "next/link";
import {
  Pill,
  TrendingDown,
  BarChart3,
  Bot,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const features = [
  {
    icon: TrendingDown,
    title: "FEFO Stock Management",
    description:
      "Automatically sell medicines closest to expiry first. Reduce waste and protect your margins.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description:
      "Track sales, expiry trends, low stock alerts, and dead stock — all in one dashboard.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Ask questions in plain English. Get instant insights about your pharmacy inventory.",
  },
  {
    icon: Shield,
    title: "Verified & Secure",
    description:
      "Multi-tenant architecture with verified shops, role-based access, and data isolation.",
  },
];

const benefits = [
  "Eliminate medicine expiry losses entirely",
  "GST-compliant billing with CGST + SGST",
  "Batch-level traceability for every sale",
  "Mobile-friendly for counter operations",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-primary">{APP_NAME}</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register Shop</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Pill className="h-4 w-4 text-primary" />
            Built for Indian Pharmacies
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Stop Losing Money to{" "}
            <span className="text-primary">Expired Medicines</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {APP_TAGLINE}. FEFO-powered stock management, smart analytics, and
            an AI assistant — designed for small pharmacies across India.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Shop Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" />
              <span className="text-sm font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Everything Your Pharmacy Needs</h2>
            <p className="mt-3 text-muted-foreground">
              From daily billing to expiry intelligence — all in one platform.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Ready to Protect Your Profits?</h2>
          <p className="mt-4 opacity-90">
            Join pharmacies across India using FEFO to minimize expiry losses.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 bg-white text-primary hover:bg-white/90"
            >
              Register Your Pharmacy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. Smart medicine stock management
          for Indian pharmacies.
        </p>
        <p className="mt-2">
          <Link href="/admin/login" className="hover:text-primary">
            Admin Login
          </Link>
        </p>
      </footer>
    </div>
  );
}
