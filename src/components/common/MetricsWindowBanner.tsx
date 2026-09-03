"use client";

import { formatMonthLabelHe, type MetricsWindow } from "@/lib/metricsWindow";

interface MetricsWindowBannerProps {
  window: MetricsWindow;
  onMarkReady?: () => void;
  markingReady?: boolean;
}

export function MetricsWindowBanner({
  window,
  onMarkReady,
  markingReady = false,
}: MetricsWindowBannerProps) {
  const settledLabel = formatMonthLabelHe(window.settledMonth);
  const pendingLabel = window.pendingReturnsMonth
    ? formatMonthLabelHe(window.pendingReturnsMonth)
    : null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">
        מדדים עד {settledLabel}
      </p>
      <p className="mt-1 text-amber-800">
        החודש והשבוע הנוכחיים מוצגים כנתון בלבד. מדדים וחריגות רצים רק על תקופות
        שנסגרו
        {pendingLabel
          ? ` · ${pendingLabel} ממתין להחזרות עד ${window.autoReadyLabel}`
          : ""}
        .
      </p>
      {pendingLabel && onMarkReady && (
        <button
          type="button"
          onClick={onMarkReady}
          disabled={markingReady}
          className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {markingReady ? "מעדכן..." : `המדדים מוכנים — כלול את ${pendingLabel}`}
        </button>
      )}
    </div>
  );
}
