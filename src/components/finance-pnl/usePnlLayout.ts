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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ensurePersistableIds(blocks: PnlLayoutBlock[]): PnlLayoutBlock[] {
  return blocks.map((block) => ({
    ...block,
    id: isUuid(block.id) ? block.id : crypto.randomUUID(),
  }));
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
    const normalized = normalizeBlocks(ensurePersistableIds(nextBlocks));
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
