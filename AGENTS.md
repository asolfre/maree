# AGENTS.md

## Commands

```
npm run dev          # Next.js dev server
npm run build        # production build (also typechecks)
npm run lint         # ESLint (next/core-web-vitals)
npm test             # vitest run (all unit tests)
npm run test:watch   # vitest in watch mode
```

Verification order: `lint` → `build` → `test`. `build` catches type errors; there is no separate `tsc` script.

Run a single test file: `npx vitest run src/lib/sun.test.ts`

## Node version

`.nvmrc` requires **Node 22**. The project has an `instrumentation.ts` hook that deletes the broken `globalThis.localStorage` exposed by Node 22 to prevent SSR crashes — do not remove it.

## Tailwind CSS v4

This repo uses **Tailwind v4** with the new engine. There is **no `tailwind.config.ts`**. All design tokens (colors, fonts, radii) are defined as CSS custom properties inside `@theme {}` in `src/app/globals.css`. Do not create a Tailwind config file.

## Dark mode

Dark mode uses a `.dark` class on `<html>`, toggled via `src/lib/useTheme.ts`. Color swaps are CSS variable overrides in the `.dark {}` block in `globals.css`. The custom variant is `@variant dark (&:where(.dark, .dark *))` — do not use Tailwind's default `dark:` media-query strategy.

## Icons

Material Symbols Outlined, **self-hosted** (`public/fonts/material-symbols-outlined.woff2`). Render as ligature text: `<span className="material-symbols-outlined">icon_name</span>`. Not an icon component library.

## Leaflet (maps)

Leaflet **cannot be SSR'd**. `StationMap` is loaded via `next/dynamic` with `ssr: false` in `src/app/map/page.tsx`. Any new map component must follow the same pattern.

## Architecture

- **App Router** (Next.js 15) — pages in `src/app/`, components in `src/components/`, domain logic in `src/lib/`.
- **Path alias:** `@/*` → `./src/*`
- **Fonts:** Manrope (`--font-headline`) for headlines, Inter (`--font-body`) for body. Loaded via `next/font/google` in `layout.tsx`.
- **All UI text is in Spanish.** No i18n framework — strings are hardcoded.
- **PWA:** service worker at `public/sw.js`, manifest at `public/manifest.json`, registered inline in root layout.

## Data layer

API routes in `src/app/api/` are **server-side proxies** to external oceanographic servers (Puertos del Estado THREDDS, MeteoGalicia MOHID/ROMS via `thredds.meteogalicia.gal`). No direct browser-to-THREDDS calls.

- **In-memory caching** with TTLs (15 min observations, 6 h forecasts) — see `src/lib/thredds/cache.ts`.
- **Station registry** is a static array in `src/lib/stations.ts` (7 Galician stations). To add a station, edit that file.
- OPeNDAP responses are parsed from ASCII text, not binary NetCDF.

## Testing

- **Vitest** with `globals: true`, environment `node`, pattern `src/**/*.test.ts`.
- Tests cover only `src/lib/` (pure functions: tide analysis, parser, sun calc, geo, alerts, retry). No component/E2E tests.
- D3 and Leaflet are not tested — they are client-only rendering.

## No CI

No GitHub Actions workflows or pre-commit hooks. Verify locally before pushing.
