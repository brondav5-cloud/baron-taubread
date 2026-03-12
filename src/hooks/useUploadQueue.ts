"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ============================================================
// TYPES
// ============================================================

export type QueueItemStatus = "pending" | "processing" | "success" | "error";

export interface QueueItem<TStats = unknown> {
  id:       string;
  file:     File;
  status:   QueueItemStatus;
  progress: number; // 0-100
  error?:   string;
  stats?:   TStats;
}

export type UploadFn<TStats> = (
  file: File,
  onProgress: (pct: number) => void,
) => Promise<{ success: boolean; stats?: TStats; error?: string }>;

// ============================================================
// HOOK
// ============================================================

export function useUploadQueue<TStats = unknown>(uploadFn: UploadFn<TStats>) {
  const [items,     setItems]     = useState<QueueItem<TStats>[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Keep a ref so processQueue can always access the latest items list
  const itemsRef      = useRef<QueueItem<TStats>[]>([]);
  const isRunningRef  = useRef(false);
  const uploadFnRef   = useRef(uploadFn);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { uploadFnRef.current = uploadFn; }, [uploadFn]);

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem<TStats>>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const addFiles = useCallback((files: File[]) => {
    const valid = Array.from(files).filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"),
    );
    if (valid.length === 0) return;

    const newItems: QueueItem<TStats>[] = valid.map((file) => ({
      id:       `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status:   "pending",
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const processQueue = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);

    // Process all currently pending items in order
    const snapshot = itemsRef.current.filter((i) => i.status === "pending");

    for (const item of snapshot) {
      updateItem(item.id, { status: "processing", progress: 0 });
      // Yield to the browser so React can render the "processing" state
      // before SheetJS blocks the main thread with large file parsing.
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      try {
        const result = await uploadFnRef.current(item.file, (pct) => {
          updateItem(item.id, { progress: pct });
        });

        if (result.success) {
          updateItem(item.id, { status: "success", progress: 100, stats: result.stats });
        } else {
          updateItem(item.id, {
            status: "error",
            error:  result.error ?? "שגיאה לא ידועה",
          });
        }
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          error:  err instanceof Error ? err.message : "שגיאה לא ידועה",
        });
      }
    }

    isRunningRef.current = false;
    setIsRunning(false);
  }, [updateItem]);

  // Auto-start when new pending items are added and queue is idle
  useEffect(() => {
    const hasPending = items.some((i) => i.status === "pending");
    if (hasPending && !isRunningRef.current) {
      processQueue();
    }
  }, [items, processQueue]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id && i.status !== "processing"));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status === "pending" || i.status === "processing"));
  }, []);

  const clearAll = useCallback(() => {
    if (!isRunningRef.current) setItems([]);
  }, []);

  const pendingCount    = items.filter((i) => i.status === "pending").length;
  const processingCount = items.filter((i) => i.status === "processing").length;
  const successCount    = items.filter((i) => i.status === "success").length;
  const errorCount      = items.filter((i) => i.status === "error").length;

  return {
    items,
    isRunning,
    addFiles,
    removeItem,
    clearCompleted,
    clearAll,
    pendingCount,
    processingCount,
    successCount,
    errorCount,
  };
}
