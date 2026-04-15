/**
 * DOG (Diario Oficial de Galicia) RSS feed parser.
 *
 * Monitors the "Profesionais do mar" RSS feed for fishing-related
 * legal dispositions — closures, openings, management plan updates.
 *
 * The DOG publishes resolutions from the Consellería do Mar that
 * include "paro biológico", "veda", and extraction plan details.
 */

import type { DogFeedEntry } from "./types";
import { evictCache } from "@/lib/thredds/cache";

// ── Cache ───────────────────────────────────────────────────────

interface CachedFeed {
  entries: DogFeedEntry[];
  expiresAt: number;
}

/** Server-side in-memory cache — 6-hour TTL, single key. */
const feedCache = new Map<string, CachedFeed>();
const CACHE_KEY = "dog-feed";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 1;

// ── Keywords for fishing-related entries ─────────────────────────

const FISHING_KEYWORDS = [
  "veda",
  "paro biológico",
  "parada biolóxica",
  "prohibición",
  "extracción",
  "marisqueo",
  "marisco",
  "plan de xestión",
  "plan de gestión",
  "recurso marisqueiro",
  "molusco",
  "crustáceo",
  "percebe",
  "centollo",
  "pulpo",
  "navaja",
  "almeja",
  "berberecho",
  "vieira",
  "zamburiña",
  "mejillón",
];

// ── RSS XML parser ──────────────────────────────────────────────

/**
 * Minimal XML text parser for RSS 2.0 <item> elements.
 * Avoids importing a full XML parser library.
 */
function parseRssItems(xml: string): DogFeedEntry[] {
  const items: DogFeedEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        url: link,
        date: pubDate ? new Date(pubDate).toISOString() : "",
      });
    }
  }

  return items;
}

/** Extract text content from the first occurrence of an XML tag. */
function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA: <tag><![CDATA[content]]></tag>
  const cdataRegex = new RegExp(
    `<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i",
  );
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle plain text: <tag>content</tag>
  const plainRegex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const plainMatch = plainRegex.exec(xml);
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

/** Decode common HTML entities. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ── Public API ──────────────────────────────────────────────────

const DOG_RSS_URL =
  "https://www.xunta.gal/diario-oficial-galicia/rss/Taxonomia21022_gl.rss";

/**
 * Fetch and parse the DOG "Profesionais do mar" RSS feed.
 *
 * Returns only entries whose titles contain fishing-related keywords.
 * Results are cached server-side for 6 hours.
 */
export async function fetchDogFeedEntries(): Promise<DogFeedEntry[]> {
  // Check cache
  const cached = feedCache.get(CACHE_KEY);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.entries;
  }

  try {
    const response = await fetch(DOG_RSS_URL, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });

    if (!response.ok) {
      console.warn(`DOG RSS fetch failed: HTTP ${response.status}`);
      return cached?.entries ?? [];
    }

    const xml = await response.text();
    const allEntries = parseRssItems(xml);

    // Filter to fishing-related entries
    const fishingEntries = allEntries.filter((entry) => {
      const titleLower = entry.title.toLowerCase();
      return FISHING_KEYWORDS.some((kw) => titleLower.includes(kw));
    });

    // Take the 10 most recent
    const result = fishingEntries.slice(0, 10);

    // Cache result
    feedCache.set(CACHE_KEY, {
      entries: result,
      expiresAt: Date.now() + TTL_MS,
    });
    evictCache(feedCache, MAX_ENTRIES);

    return result;
  } catch (error) {
    console.warn("DOG RSS fetch error:", error);
    // Return stale cache if available, otherwise empty
    return cached?.entries ?? [];
  }
}
