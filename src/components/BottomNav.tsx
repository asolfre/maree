"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: "home_max" },
  { href: "/search", label: "Buscar", icon: "search" },
  { href: "/forecast", label: "Previsión", icon: "waves" },
  { href: "/vedas", label: "Vedas", icon: "phishing" },
  { href: "/map", label: "Mapa", icon: "map" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,42,72,0.06)] rounded-t-3xl">
      <div className="flex justify-around items-center px-4 pb-6 pt-3 w-full max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-3 py-2 transition-all ${
                isActive
                  ? "bg-secondary-container/40 text-primary rounded-2xl"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className="material-symbols-outlined text-[24px] mb-0.5"
                style={
                  isActive
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
