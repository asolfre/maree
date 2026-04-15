/**
 * Shared cache eviction helper for THREDDS data caches.
 *
 * Evicts expired entries first, then removes the oldest entries
 * (by insertion order — Map preserves insertion order) if the cache
 * still exceeds the maximum size.
 */
export function evictCache<V extends { expiresAt: number }>(
  cache: Map<string, V>,
  maxEntries: number,
): void {
  const now = Date.now();

  // Pass 1: remove expired entries
  for (const [key, entry] of cache) {
    if (now >= entry.expiresAt) {
      cache.delete(key);
    }
  }

  // Pass 2: if still over limit, remove oldest entries (first in Map order)
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}
