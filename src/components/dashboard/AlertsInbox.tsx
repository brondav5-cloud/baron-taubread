"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import type { OpsAlert } from "@/lib/opsAlerts";

interface AlertsInboxProps {
  alerts: OpsAlert[];
  isLoading?: boolean;
}

const SEVERITY_LABEL: Record<OpsAlert["severity"], string> = {
  critical: "קריטי",
  warning: "התראה",
  watch: "מעקב",
};

export function AlertsInbox({ alerts, isLoading }: AlertsInboxProps) {
  return (
    <section id="alerts" className="scroll-mt-24 rounded-2xl bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">תור חריגות</h2>
        </div>
        <span className="text-sm text-gray-500">
          {isLoading ? "בודק שבועות..." : `${alerts.length} פריטים`}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">
          אין חריגות לפי הספים הנוכחיים. מדדים חודשיים וסגירת שבוע נבדקים יחד.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {alerts.slice(0, 30).map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{alert.evidence}</p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    alert.severity === "critical" && "bg-red-100 text-red-700",
                    alert.severity === "warning" && "bg-amber-100 text-amber-800",
                    alert.severity === "watch" && "bg-gray-100 text-gray-600",
                  )}
                >
                  {SEVERITY_LABEL[alert.severity]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
