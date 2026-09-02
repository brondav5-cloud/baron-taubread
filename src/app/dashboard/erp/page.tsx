"use client";

import Link from "next/link";
import { Loader2, RefreshCw, FileText } from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";
import { useErpJson } from "@/hooks/useErpJson";

interface StatusPayload {
  connected: boolean;
  configured?: boolean;
  reason?: string;
  error?: string;
  whoami?: {
    company_id: string;
    company: string;
    permissions: {
      can_create: boolean;
      can_modify: boolean;
      can_create_docs: boolean;
      can_read_data: boolean;
    };
  };
  connection?: {
    last_ok_at: string | null;
    last_catalog_sync_at: string | null;
    last_error: string | null;
    erp_company_id: string;
    erp_company_slug: string | null;
  };
}

export default function ErpOverviewPage() {
  const { data, error, loading, reload } = useErpJson<StatusPayload>("/api/erp/status");

  return (
    <div className="space-y-6">
      <PageHeader
        title="תוכנת האם — Solvit"
        subtitle="נתונים תפעוליים מניהול קו, בלי לשנות את האקסל או דוחות הבנק"
        icon={<FileText className="w-5 h-5 text-blue-700" />}
        actions={
          <button
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            בדוק חיבור
          </button>
        }
      />

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <Card>
        <CardContent className="space-y-3">
          {loading && !data ? (
            <p className="text-sm text-gray-500">בודק חיבור...</p>
          ) : data?.reason === "no_connection" ? (
            <p className="text-sm text-amber-700">
              לחברה הנבחרת אין חיבור Solvit. החיבור פעיל רק עבור טאוברד.
            </p>
          ) : data?.connected ? (
            <>
              <p className="text-sm text-green-700 font-medium">החיבור פעיל</p>
              <p className="text-sm text-gray-600">
                חברה {data.whoami?.company_id} / {data.whoami?.company}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge ok={data.whoami?.permissions.can_read_data}>קריאת דוחות</Badge>
                <Badge ok={data.whoami?.permissions.can_create_docs}>יצירת מסמכים</Badge>
                <Badge ok={data.whoami?.permissions.can_create}>יצירת כרטיסים</Badge>
                <Badge ok={data.whoami?.permissions.can_modify}>עדכון כרטיסים</Badge>
              </div>
              {data.connection?.last_catalog_sync_at && (
                <p className="text-xs text-gray-500">
                  סנכרון קטלוג אחרון: {new Date(data.connection.last_catalog_sync_at).toLocaleString("he-IL")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-red-700">{data?.error || "החיבור לא זמין"}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {([
          ["/dashboard/erp/revenue", "מחזור"],
          ["/dashboard/erp/payments", "תקבולים"],
          ["/dashboard/erp/debts", "חובות"],
          ["/dashboard/erp/aging", "גיול"],
          ["/dashboard/erp/activity", "לקוחות רדומים"],
          ["/dashboard/erp/documents", "מסמכים"],
          ["/dashboard/settings/erp", "הגדרות ומיפוי"],
        ] as const).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl bg-white shadow-sm px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Badge({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`px-2 py-1 rounded-lg ${
        ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {children}: {ok ? "כן" : "לא"}
    </span>
  );
}
