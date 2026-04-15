"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/useTheme";

export default function TopAppBar() {
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const themeIcon =
    theme === "light"
      ? "light_mode"
      : theme === "dark"
        ? "dark_mode"
        : "brightness_auto";

  const themeLabel =
    theme === "light" ? "Claro" : theme === "dark" ? "Oscuro" : "Sistema";

  // Close menu on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showMenu]);

  return (
    <header className="bg-surface/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            waves
          </span>
          <span className="text-xl font-bold tracking-tighter text-on-surface font-headline">
            Mare<span className="text-primary">e</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block font-headline text-sm tracking-tight font-semibold text-on-surface-variant">
            Costa Gallega
          </span>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
            aria-label={`Tema: ${theme}`}
            title={`Tema: ${themeLabel}`}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              {themeIcon}
            </span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20 flex items-center justify-center hover:border-primary/30 transition-colors"
              aria-label="Ajustes"
              aria-expanded={showMenu}
              aria-haspopup="true"
              title="Ajustes"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                person
              </span>
            </button>

            {/* Settings dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50" role="menu">
                <div className="px-4 pt-4 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Ajustes
                  </span>
                </div>
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {themeIcon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-on-surface">
                      Tema
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {themeLabel}
                    </div>
                  </div>
                </button>
                <div className="border-t border-outline-variant/10" />
                <div className="px-4 py-3 flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    waves
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-on-surface">
                      Maree
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      Costa Gallega — v1.0
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-outline-variant/30 h-[1px] w-full" />
    </header>
  );
}
