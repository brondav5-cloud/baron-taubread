"use client";

import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { CostsTable } from "@/components/settings/costs";

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="עלויות מוצרים"
        subtitle="הגדרת עלויות ייצור לכל מוצר"
        icon={<Calculator className="w-6 h-6 text-green-500" />}
      />
      <CostsTable />
    </div>
  );
}
