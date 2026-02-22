"use client";

import { Building2 } from "lucide-react";
import { NetworksTab } from "@/components/settings";
import { PageHeader } from "@/components/ui";

export default function NetworksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול רשתות"
        subtitle="ניהול רשתות חנויות ומחירים אחידים"
        icon={<Building2 className="w-6 h-6" />}
      />

      <NetworksTab />
    </div>
  );
}
