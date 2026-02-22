"use client";

import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { parseExcelPricing } from "@/lib/excelPricingParser";
import * as pricingRepo from "@/lib/db/pricing.repo";
import type { ExcelParseResult, StorePricing } from "@/types/pricing";
import type { DbStore } from "@/types/supabase";

export type UploadStatus =
  | "idle"
  | "parsing"
  | "preview"
  | "saving"
  | "success"
  | "error";

interface UploadState {
  status: UploadStatus;
  result: ExcelParseResult | null;
  error: string | null;
  fileName: string | null;
  mappingNote?: string;
}

/** נרמול שם להשוואה – מסיר רווחים לא־מתפרדים ותווים מיוחדים */
function normalizeName(s: string): string {
  return s
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** נרמול מזהה למספר – מתקן אי־התאמת טיפוסים (string vs number) מ־Supabase */
function toStoreId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * ממפה מחירונים מהקובץ למזהה חנות במערכת.
 * אם מזהה החנות בקובץ לא קיים - מנסה להתאים לפי שם חנות.
 * משתמש בנרמול טיפוסים (number) כדי לתקן אי־התאמות מ־Supabase.
 */
function mapPricingToStores(
  pricings: StorePricing[],
  stores: DbStore[],
): {
  mapped: StorePricing[];
  matchedById: number;
  matchedByName: number;
  unmatched: number;
} {
  const storeById = new Map<number, DbStore>();
  for (const s of stores) {
    const id = toStoreId(s.external_id);
    if (id !== null) storeById.set(id, s);
  }
  const storeByName = new Map(stores.map((s) => [normalizeName(s.name), s]));

  let matchedById = 0;
  let matchedByName = 0;
  let unmatched = 0;

  const mapped = pricings.map((p) => {
    const id = toStoreId(p.storeId);
    if (id !== null) {
      const existing = storeById.get(id);
      if (existing) {
        matchedById++;
        return { ...p, storeId: toStoreId(existing.external_id) ?? id };
      }
    }
    const byName = storeByName.get(normalizeName(p.storeName));
    if (byName) {
      matchedByName++;
      const resolvedId = toStoreId(byName.external_id);
      return {
        ...p,
        storeId: resolvedId ?? p.storeId,
        storeName: byName.name,
      };
    }
    unmatched++;
    return p;
  });

  return { mapped, matchedById, matchedByName, unmatched };
}

/** מאחד מחירונים שממופים לאותה חנות (למשל התאמה לפי שם משתי חנויות שונות בקובץ) */
function mergePricingsByStore(pricings: StorePricing[]): StorePricing[] {
  const byStore = new Map<number, StorePricing>();
  for (const p of pricings) {
    const id = toStoreId(p.storeId);
    if (id === null) continue;
    const existing = byStore.get(id);
    if (!existing) {
      byStore.set(id, { ...p });
      continue;
    }
    for (const prod of p.products) {
      const idx = existing.products.findIndex(
        (x) => x.productId === prod.productId,
      );
      if (idx >= 0) existing.products[idx] = prod;
      else existing.products.push(prod);
    }
  }
  return Array.from(byStore.values());
}

export function usePricingUpload(
  onSuccess?: () => void,
  stores: DbStore[] = [],
) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [state, setState] = useState<UploadState>({
    status: "idle",
    result: null,
    error: null,
    fileName: null,
  });

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setState({
        status: "error",
        result: null,
        error: "יש להעלות קובץ Excel",
        fileName: file.name,
      });
      return;
    }

    setState({
      status: "parsing",
      result: null,
      error: null,
      fileName: file.name,
    });

    try {
      const result = await parseExcelPricing(file);

      if (!result.success || result.storePricings.length === 0) {
        setState({
          status: "error",
          result,
          error: result.errors[0]?.message || "לא נמצאו נתונים",
          fileName: file.name,
        });
        return;
      }

      setState({ status: "preview", result, error: null, fileName: file.name });
    } catch (err) {
      setState({
        status: "error",
        result: null,
        error: err instanceof Error ? err.message : "שגיאה",
        fileName: file.name,
      });
    }
  }, []);

  const confirm = useCallback(async () => {
    if (!state.result?.storePricings.length || !companyId) return;

    if (stores.length === 0) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          'אין חנויות במערכת. יש לבצע תחילה "העלאת נתונים" עם קובץ Excel המכיל מזהה לקוח ושם לקוח.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: "saving" }));

    try {
      const { mapped } = mapPricingToStores(state.result.storePricings, stores);

      const storesInSystem = new Set(
        stores
          .map((s) => toStoreId(s.external_id))
          .filter((id): id is number => id !== null),
      );
      const matched = mapped.filter((p) => {
        const id = toStoreId(p.storeId);
        return id !== null && storesInSystem.has(id);
      });
      const toSave = mergePricingsByStore(matched);

      if (toSave.length === 0 && mapped.length > 0) {
        const sample = mapped
          .slice(0, 3)
          .map((p) => `#${p.storeId} ${p.storeName}`)
          .join(", ");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: `אף חנות מהקובץ לא תואמת לחנויות במערכת (${stores.length} חנויות). דוגמאות מהקובץ: ${sample}. וודא ש"מזהה לקוח" ו"שם לקוח" בקובץ המחירון תואמים לקובץ "העלאת נתונים".`,
        }));
        return;
      }

      await pricingRepo.clearAllPricingData(companyId);
      const ok = await pricingRepo.saveAllStorePricings(
        companyId,
        toSave.length > 0 ? toSave : mapped,
      );
      if (!ok) throw new Error("שגיאה בשמירה");

      setState((prev) => ({ ...prev, status: "success", error: null }));
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בשמירה";
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          msg.includes("Row") || msg.includes("row")
            ? "שגיאה בשמירה - ייתכן שמזהה חנות בקובץ לא תואם למערכת"
            : msg,
      }));
    }
  }, [state.result, companyId, onSuccess, stores]);

  const reset = useCallback(() => {
    setState({ status: "idle", result: null, error: null, fileName: null });
  }, []);

  /** סטטיסטיקות התאמה – מוצגות בתצוגה מקדימה לפני אישור */
  const mappingStats = useMemo(() => {
    if (!state.result?.storePricings?.length || stores.length === 0)
      return null;
    const { matchedById, matchedByName, unmatched } = mapPricingToStores(
      state.result.storePricings,
      stores,
    );
    const toSaveCount = matchedById + matchedByName;
    return {
      matchedById,
      matchedByName,
      unmatched,
      toSaveCount,
      fromFile: state.result.storePricings.length,
      storesInSystem: stores.length,
    };
  }, [state.result, stores]);

  return {
    ...state,
    handleFile,
    confirm,
    reset,
    isProcessing: state.status === "parsing" || state.status === "saving",
    canSave: !!companyId,
    mappingStats,
  };
}
