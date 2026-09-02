"use client";

import { useCallback, useEffect, useState } from "react";

export function useErpJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "שגיאה בטעינה");
        setData(null);
        return;
      }
      setData(json as T);
    } catch {
      setError("בעיית תקשורת");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
