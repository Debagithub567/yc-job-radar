import "dotenv/config";
import type { AlgoliaJobHit, AlgoliaSearchResponse } from "./types.js";

const APP_ID = process.env.ALGOLIA_APP_ID!;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY!;
const INDEX = process.env.ALGOLIA_INDEX!;
const REQUEST_DELAY_MS = Number(process.env.ALGOLIA_REQUEST_DELAY_MS ?? 400);

if (!APP_ID || !SEARCH_KEY || !INDEX) {
  throw new Error(
    "Missing ALGOLIA_APP_ID / ALGOLIA_SEARCH_KEY / ALGOLIA_INDEX. Copy .env.example to .env and fill them in — see README for how to capture the key from DevTools."
  );
}

const ENDPOINT = `https://${APP_ID}-dsn.algolia.net/1/indexes/*/queries`;

/**
 * filters supports Algolia's filter syntax, e.g. "(role:eng)" or "(eng_type:fs)".
 * hitsPerPage capped defensively at 100 — bigger pages, fewer requests, still polite.
 */
export async function fetchJobsPage(
  filters: string,
  page: number,
  hitsPerPage = 100
): Promise<{ hits: AlgoliaJobHit[]; nbPages: number; nbHits: number }> {
  const params = new URLSearchParams({
    query: "",
    page: String(page),
    filters,
    hitsPerPage: String(hitsPerPage),
    distinct: "true",
  }).toString();

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-algolia-application-id": APP_ID,
      "x-algolia-api-key": SEARCH_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ indexName: INDEX, params }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Algolia request failed: ${res.status} ${res.statusText} — ${body}`);
  }

  const data = (await res.json()) as AlgoliaSearchResponse;
  const result = data.results[0];
  return { hits: result.hits, nbPages: result.nbPages, nbHits: result.nbHits };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ALGOLIA_REQUEST_DELAY_MS = REQUEST_DELAY_MS;
