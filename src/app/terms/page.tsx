import Link from "next/link";
import { Pill } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Terms & Conditions - ${APP_NAME}` };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-6 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{APP_NAME} Terms & Conditions</h1>
            <p className="text-xs text-muted-foreground">Last updated: June 25, 2026</p>
          </div>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              Welcome to {APP_NAME}. By registering a shop and utilizing our platform, you agree to comply with and be bound by these comprehensive Terms and Conditions. Please review them carefully before using our inventory and billing solutions.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Registration, Multi-Step Onboarding & Review Delay</h2>
            <p>
              To establish an active account, shop owners must successfully fulfill a mandatory multi-step validation workflow:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Step 1:</strong> Input of mandatory operational markers including Shop Name, Owner Name, Contact Phone, State (all states within India), City, Pincode, Drug License Number, PAN, and GST Number.</li>
              <li><strong>Step 2:</strong> Securely upload digital documentation for the shop’s Drug License, GST Certificate, PAN, and optional Shop Photo via our interactive drag-and-drop / file browser interfaces. Drug License and GST certificates are strictly mandatory uploads.</li>
              <li><strong>Step 3:</strong> Perform active identity verification using safe Firebase Email Authentication methods.</li>
              <li><strong>Step 4:</strong> Select an operational subscription framework and verify legal compliance checkboxes.</li>
            </ul>
            <p className="mt-2">
              <strong>Verification Pending Status:</strong> Upon form submission, all configurations transition immediately into a restricted review state. Our central administrative compliance team manually audits records within a <strong>24 to 48-hour timeline</strong>. Full access is withheld until explicit verification confirmation is dispatched to the user’s authenticated email.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Subscription Tiers & System Database Caps</h2>
            <p>
              {APP_NAME} services are split into three definitive models. System constraints are rigidly checked at the application level:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Small Pharmacies Plan (₹999 / mo)</strong>: Limited to 30 bills/day, 100 medicine SKUs, 100 monthly stock batch updates, and up to 3 core wholesale dealers. Includes 1 staff user allocation. Financial graphs, advanced trends, and GenAI modules are locked. Billing history maintains a rolling maximum buffer of 1,000 logs utilizing a First-In, First-Out (FIFO) auto-overwrite sequence.
              </li>
              <li>
                <strong>Professional Plan (₹1,999 / mo)</strong>: Limited to 100 bills/day, 1,000 medicine SKUs, 1,500 monthly stock batch updates, and 5–7 wholesale dealers. Includes up to 5 individual staff users. Unlocks full performance charts and advanced analytical tools alongside the GenAI Assistant (capped at 10 queries/day). Billing history retains a maximum 3,000 record buffer before initiating FIFO auto-overwrites.
              </li>
              <li>
                <strong>Enterprise Plan (₹4,999 / mo)</strong>: Provides completely unlimited daily invoice thresholds, medicine SKUs, monthly stock entries, supplier integrations, and staff profile additions. Completely bypasses FIFO data deletions to provide infinite/lifetime billing history archives alongside unrestricted analytics and GenAI usage.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Staff Accounts & Role-Based Security</h2>
            <p>
              Shop Owners retain full management privileges, covering billing deletions, dealer editing, manual database cleaning, and modifying profile contexts. Secondary profiles created for staff members are heavily restricted to secure store data. Staff users are permitted access <strong>only</strong> to: New Bill creation, Inventory overview layouts, the GenAI Assistant, and historical Bill records. Administrative configurations, legal compliance records, and business financial metrics remain completely invisible to staff accounts.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Advanced Inventory Logic, Batching & Billing Consolidation</h2>
            <p>
              <strong>FEFO Optimizations:</strong> Core stock logic actively pairs low-volume alerts (items under 20 quantities) with near-to-expire batch monitoring. The system will automatically suggest deploying near-expiry stock first, but completely filters out and ceases to suggest any medicine batch once its specific expiration date passes.
            </p>
            <p>
              <strong>Invoice Print Consolidation:</strong> While internal ledgers monitor and parse items batch-by-batch for deep regulatory auditing, consumer-facing printouts omit raw batch codes. If multiple separate batches of the same medicine name are selected during checkout, the billing engine aggregates their quantities into a clean, single-line sum on the customer's invoice.
            </p>
            <p>
              <strong>Bulk CSV Data Ingestion:</strong> Bulk catalog populations require strict alignment with structural templates (Batch, Medicine, Generic name, Manufacturer, Category, Discount Cluster, Dealer, Expiry, Qty, Cost Price, Selling Price). Omitted fields will cleanly render blank values; the accuracy of ingested batch data sheets remains entirely the operator's responsibility.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Generative AI Assistant Disclosures</h2>
            <p>
              The embedded GenAI model is programmatically constrained to interpret only specific, localized pharmacy metrics (such as active totals, recent volumes, and upcoming expiry arrays). It will systematically reject non-contextual or irrelevant outside questions. Responses are produced strictly using explicit store data constraints and outputted into plain, concise English sentences without revealing raw instructional parameters.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Profile Modifiability & Statutory Compliance</h2>
            <p>
              To maintain statutory compliance under the <i>Drugs and Cosmetics Act, 1940</i> and standard GST mandates, primary identification indicators—including the registered Shop Name, Address, Contact Phone, City, State, Pincode, PAN, GSTIN, and Drug License Numbers—are locked and immutable once certified. Shop Owners may dynamically modify secondary elements like alternative contact lines, store email destinations, and shop brand images/logos.
            </p>
          </section>
        </div>

        <div className="mt-8 border-t pt-6 flex justify-between items-center text-xs">
          <span className="text-muted-foreground">© 2026 {APP_NAME}. All rights reserved.</span>
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}