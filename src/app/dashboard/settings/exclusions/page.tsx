"use client";

import { XCircle } from "lucide-react";
import { ExcludedEntitiesTab } from "@/components/settings";
import { PageHeader } from "@/components/ui";

export default function ExclusionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="חריגי העלאה"
        subtitle="ניהול רשתות, נהגים, חנויות וסוכנים שיוחרגו מעיבוד קבצי פירוט מוצרים"
        icon={<XCircle className="w-6 h-6" />}
      />
      <ExcludedEntitiesTab />
    </div>
  );
}
