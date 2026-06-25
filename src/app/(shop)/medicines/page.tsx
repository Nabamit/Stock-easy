import { MedicinesClient } from "@/components/medicines/medicines-client";

export const metadata = { title: "Medicines" };
export const dynamic = "force-dynamic";

export default function MedicinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Medicine Catalogue</h2>
        <p className="text-muted-foreground">Search, view stock levels, and add new medicines</p>
      </div>
      <MedicinesClient />
    </div>
  );
}
