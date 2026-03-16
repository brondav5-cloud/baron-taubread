"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { CostsTable } from "@/components/settings/costs";
import { useAuth } from "@/hooks/useAuth";

export default function CostsPage() {
  const auth = useAuth();
  const router = useRouter();
  const role =
    auth.status === "authed"
      ? auth.user.selectedCompanyRole ?? auth.user.role
      : null;
  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (auth.status !== "loading" && !isAdmin) {
      router.replace("/dashboard/settings");
    }
  }, [auth.status, isAdmin, router]);

  if (auth.status === "loading" || !isAdmin) {
    return null;
  }

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
