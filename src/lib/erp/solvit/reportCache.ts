type CacheEntry<T> = { expiresAt: number; value: T };

const store = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 90_000;

export function getCachedReport<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setCachedReport<T>(key: string, value: T): T {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}
