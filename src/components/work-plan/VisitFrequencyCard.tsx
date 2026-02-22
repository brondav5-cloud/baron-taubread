"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStoreVisitFrequency } from "@/lib/supabase/work-plan.queries";

export function VisitFrequencyCard() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [data, setData] = useState<
    Awaited<ReturnType<typeof getStoreVisitFrequency>>
  >([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    getStoreVisitFrequency(companyId).then(setData);
  }, [companyId]);

  if (!companyId || data.length === 0) return null;

  const topStores = expanded ? data : data.slice(0, 5);

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <span className="font-medium">חנויות בתדירות ביקור גבוהה</span>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {topStores.map((s) => (
            <div
              key={s.store_id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <span
                className="font-medium truncate max-w-[180px]"
                title={s.store_name}
              >
                {s.store_name}
              </span>
              <span className="text-blue-600 font-bold">
                {s.visit_count} ביקורים
              </span>
              <span className="text-gray-500 text-sm">
                ({s.weeks_planned} שבועות)
              </span>
            </div>
          ))}
        </div>
        {data.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            {expanded ? "הצג פחות" : `הצג עוד (${data.length - 5})`}
          </button>
        )}
      </div>
    </div>
  );
}
