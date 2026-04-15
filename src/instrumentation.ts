/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * Node.js 22 exposes a `localStorage` global that is an incomplete Storage
 * implementation (e.g. `.getItem()` throws). This breaks any client-side code
 * that references `localStorage` during SSR, even inside "use client"
 * components. Removing the broken global makes the server environment behave
 * like older Node versions where `localStorage` is simply `undefined`.
 */
export async function register() {
  if (typeof window === "undefined" && typeof globalThis.localStorage !== "undefined") {
    // @ts-expect-error — intentionally removing the broken Node 22 global
    delete globalThis.localStorage;
  }
}
