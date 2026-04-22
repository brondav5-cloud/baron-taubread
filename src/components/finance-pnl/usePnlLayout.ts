"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PnlLayoutBlock, PnlLayoutResponse } from "./types";

function normalizeBlocks(blocks: PnlLayoutBlock[]): PnlLayoutBlock[] {
  return blocks
    .map((block, blockIndex) => ({
      ...block,
      sort_order: blockIndex,
      categories: [...block.categories]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat, catIndex) => ({ ...cat, sort_order: catIndex })),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function usePnlLayout() {
  const [blocks, setBlocks] = useState<PnlLayoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLayout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/pnl/layout");
      if (!res.ok) throw new Error("שגיאה בטעינת מבנה הדוח");
      const data = await res.json() as PnlLayoutResponse;
      setBlocks(normalizeBlocks(data.blocks ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  const saveLayout = useCallback(async (nextBlocks: PnlLayoutBlock[]) => {
    setSaving(true);
    setError(null);
    const normalized = normalizeBlocks(nextBlocks);
    try {
      const res = await fetch("/api/finance/pnl/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: normalized }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירת מבנה הדוח");
      setBlocks(normalized);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(() => ({
    blocks,
    loading,
    saving,
    error,
    setBlocks,
    loadLayout,
    saveLayout,
  }), [blocks, loading, saving, error, setBlocks, loadLayout, saveLayout]);
}
