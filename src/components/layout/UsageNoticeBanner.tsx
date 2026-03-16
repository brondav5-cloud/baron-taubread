"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

const DISMISS_KEY = "usage_notice_dismissed_v1";

export function UsageNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors; just hide in current session.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            המערכת אוספת נתוני שימוש לשיפור השירות והביצועים.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1.5 hover:bg-amber-100 transition-colors"
          title="סגור"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
