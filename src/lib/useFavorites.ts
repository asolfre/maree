"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "maree_favorites";

/**
 * Hook for managing favorite stations persisted in localStorage.
 *
 * Returns the list of favorite station IDs, plus toggle/add/remove helpers.
 * Safe for SSR — returns empty array until hydrated on client.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }
  }, []);

  const persist = useCallback((updated: string[]) => {
    setFavorites(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => favorites.includes(stationId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (stationId: string) => {
      if (favorites.includes(stationId)) {
        persist(favorites.filter((id) => id !== stationId));
      } else {
        persist([...favorites, stationId]);
      }
    },
    [favorites, persist]
  );

  const addFavorite = useCallback(
    (stationId: string) => {
      if (!favorites.includes(stationId)) {
        persist([...favorites, stationId]);
      }
    },
    [favorites, persist]
  );

  const removeFavorite = useCallback(
    (stationId: string) => {
      persist(favorites.filter((id) => id !== stationId));
    },
    [favorites, persist]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
