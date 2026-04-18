/**
 * Shared User-Agent string for all outbound HTTP requests.
 *
 * Follows RFC 7231 bot etiquette: identifies the app and provides
 * contact URLs so data providers can reach out instead of blocking.
 */
export const USER_AGENT =
  "Maree/1.0 (+https://maree.vercel.app; +https://github.com/asolfre/maree)";
