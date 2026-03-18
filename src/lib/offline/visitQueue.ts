"use client";

import type { VisitInsert } from "@/types/db";

const DB_NAME = "bakery-offline";
const DB_VERSION = 1;
const STORE_NAME = "visit_queue";

export interface OfflineVisitQueueItem {
  id: string;
  companyId: string;
  tempId: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  payload: VisitInsert;
}

function getNextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `visit-queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Failed opening IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("companyId", "companyId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    openQueueDb()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let settled = false;
        let actionResult: T | null = null;

        tx.oncomplete = () => {
          if (settled) return;
          settled = true;
          db.close();
          resolve(actionResult as T);
        };
        tx.onerror = () => {
          if (settled) return;
          settled = true;
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction failed"));
        };
        tx.onabort = () => {
          if (settled) return;
          settled = true;
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction aborted"));
        };

        action(store)
          .then((result) => {
            actionResult = result;
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            try {
              tx.abort();
            } catch {
              // no-op
            }
            db.close();
            reject(err);
          });
      })
      .catch(reject);
  });
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function enqueueOfflineVisit(
  item: Omit<OfflineVisitQueueItem, "id" | "attempts"> & { attempts?: number },
): Promise<OfflineVisitQueueItem> {
  const toSave: OfflineVisitQueueItem = {
    ...item,
    id: getNextId(),
    attempts: item.attempts ?? 0,
  };

  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.put(toSave));
    return true;
  });

  return toSave;
}

export async function listOfflineVisitsByCompany(
  companyId: string,
): Promise<OfflineVisitQueueItem[]> {
  return withStore("readonly", async (store) => {
    const index = store.index("companyId");
    const all = await requestAsPromise(index.getAll(companyId));
    return (all as OfflineVisitQueueItem[]).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  });
}

export async function updateOfflineVisit(
  item: OfflineVisitQueueItem,
): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.put(item));
    return true;
  });
}

export async function removeOfflineVisit(id: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.delete(id));
    return true;
  });
}
