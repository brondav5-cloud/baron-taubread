"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

interface VersionPayload {
  ok?: boolean;
  version?: string;
  force_refresh?: boolean;
}

const POLL_MS = 60_000;

export function AppUpdateBanner() {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as VersionPayload;
      const version = typeof data.version === "string" ? data.version : null;
      if (!version) return;

      if (!initialVersionRef.current) {
        initialVersionRef.current = version;
        return;
      }

      if (data.force_refresh) {
        setForceRefresh(true);
      }

      if (version !== initialVersionRef.current) {
        setHasUpdate(true);
      }
    } catch {
      // Silent by design: version checks should never block the app UX.
    }
  }, []);

  useEffect(() => {
    void checkVersion();
    const id = setInterval(() => void checkVersion(), POLL_MS);
    return () => clearInterval(id);
  }, [checkVersion]);

  if (!hasUpdate || dismissed) return null;

  return (
    <div className="mx-4 mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">זוהתה גרסה חדשה של המערכת</p>
          <p className="text-sm text-blue-800 mt-0.5">
            מומלץ לרענן כדי לקבל את העדכון האחרון
            {forceRefresh ? " (עדכון קריטי)." : "."}
          </p>
        </div>
        {!forceRefresh && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors"
            title="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          רענן עכשיו
        </button>
      </div>
    </div>
  );
}
