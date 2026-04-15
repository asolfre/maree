"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

/**
 * Hook to manage dark mode theme.
 *
 * Persists choice in localStorage. "system" follows OS preference.
 * Applies `.dark` class to <html> element.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Read stored preference on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("maree-theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Resolve and apply the effective theme
  useEffect(() => {
    function apply(t: Theme) {
      let effective: "light" | "dark";
      if (t === "system") {
        effective = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        effective = t;
      }
      setResolved(effective);
      document.documentElement.classList.toggle("dark", effective === "dark");
    }

    apply(theme);

    // Listen for OS preference changes when in system mode
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { window.localStorage.setItem("maree-theme", t); } catch { /* */ }
  }, []);

  /** Cycle through: light → dark → system */
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      try { window.localStorage.setItem("maree-theme", next); } catch { /* */ }
      return next;
    });
  }, []);

  return { theme, resolved, setTheme, toggleTheme };
}
