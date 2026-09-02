"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export interface InactiveStoreAlert {
  id: string;
  name: string;
  city?: string | null;
}

interface StoresInactivityAlertProps {
  stores: InactiveStoreAlert[];
  previousLabel: string;
  currentLabel: string;
}

export function StoresInactivityAlert({
  stores,
  previousLabel,
  currentLabel,
}: StoresInactivityAlertProps) {
  const [open, setOpen] = useState(false);
  if (stores.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-right"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          {stores.length} חנויות היו פעילות ב{previousLabel} ולא ב{currentLabel}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-amber-700" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-700" />
        )}
      </button>
      {open && (
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-amber-900">
          {stores.map((store) => (
            <li key={store.id}>
              {store.name}
              {store.city ? ` · ${store.city}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
