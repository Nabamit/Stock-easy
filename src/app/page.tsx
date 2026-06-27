import Link from "next/link";
import {
  Pill,
  TrendingDown,
  BarChart3,
  Bot,
  Shield,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
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
      <footer className="bg-white text-muted-foreground border-t border-muted">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
            {/* Column 1: Logo, tagline, socials */}
            <div className="space-y-4 md:col-span-2 text-left">
              <Link href="/" className="flex items-center gap-2 text-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Pill className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">{APP_NAME}</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Smart medicine stock management and expiry intelligence designed specifically for small pharmacies across India. Eliminate medicine expiry losses and boost your counter profits.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Facebook">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                  <svg className="h-5 w-5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="X (Twitter)">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="WhatsApp">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.638 2.023 14.162.997 11.533.997c-5.442 0-9.866 4.372-9.87 9.802 0 1.714.47 3.387 1.357 4.868l-.999 3.65 3.738-.971z" />
                  </svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="GitHub">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: About Us */}
            <div className="space-y-3 text-left">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">About Us</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Company History</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Meet the Team</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Employee Handbook</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>

            {/* Column 3: Our Services */}
            <div className="space-y-3 text-left">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Our Services</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">FEFO Stock Management</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Smart Analytics</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI Assistant</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GST Billing</a></li>
              </ul>
            </div>

            {/* Column 4: Contact Us */}
            <div className="space-y-3 text-left">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Contact Us</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>New South Block , Phase 8B , 160055</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>909090XXXX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href="mailto:stock_easy@gmail.com" className="hover:text-foreground transition-colors">
                    stock_easy@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <hr className="my-10 border-muted" />

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
              <span>·</span>
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link href="/admin/login" className="text-primary hover:underline font-semibold">
                Admin Login Gateway
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
