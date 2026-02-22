"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const DEFAULT_POSITIONS = [
  { value: "agent", label: "סוכן שטח" },
  { value: "warehouse_manager", label: "מנהל מחסן" },
  { value: "pricing_manager", label: "מנהל תמחור" },
  { value: "logistics_manager", label: "מנהל לוגיסטיקה" },
  { value: "accountant", label: "הנהלת חשבונות" },
  { value: "quality_manager", label: "מנהל איכות" },
  { value: "sales_manager", label: "מנהל מכירות" },
  { value: "admin", label: "מנהל" },
];

const STORAGE_KEY = "bakery_position_options";

function loadCustomPositions(
  companyId: string,
): { value: string; label: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${companyId}`);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return (Array.isArray(arr) ? arr : []).map((label) => ({
      value: label.replace(/\s+/g, "_").toLowerCase() || label,
      label,
    }));
  } catch {
    return [];
  }
}

function saveCustomPositions(
  companyId: string,
  items: { value: string; label: string }[],
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${companyId}`,
      JSON.stringify(items.map((i) => i.label)),
    );
  } catch {
    // ignore
  }
}

export function useCompanyPositions(companyId: string | null) {
  const [custom, setCustom] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!companyId) {
      setCustom([]);
      return;
    }
    setCustom(loadCustomPositions(companyId));
  }, [companyId]);

  const allPositions = useMemo(
    () => [...DEFAULT_POSITIONS, ...custom],
    [custom],
  );

  const addPosition = useCallback(
    (label: string) => {
      if (!companyId || !label.trim()) return;
      const trimmed = label.trim();
      const exists = allPositions.some(
        (p) => p.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) return;
      const newItem = {
        value: trimmed.replace(/\s+/g, "_").toLowerCase(),
        label: trimmed,
      };
      const next = [...custom, newItem];
      setCustom(next);
      saveCustomPositions(companyId, next);
    },
    [companyId, custom, allPositions],
  );

  const removePosition = useCallback(
    (value: string) => {
      if (!companyId) return;
      const next = custom.filter((p) => p.value !== value);
      setCustom(next);
      saveCustomPositions(companyId, next);
    },
    [companyId, custom],
  );

  return { allPositions, custom, addPosition, removePosition };
}
