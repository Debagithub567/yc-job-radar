# YC Job Radar

A personal tool that replaces scrolling YC's job board with a filtered signal:
pick a role, see aggregated requirements across every matching posting,
extracted, deduped, summarized. Built for personal use only — see the
Legal note at the bottom before making this public.

## How it works

```
[Algolia query, paginated, resumable]
   → full structured hit per listing: title, description, skills[],
     job_type, remote, min_experience, has_salary, has_equity, company_*
        ↓
[raw_listings — Postgres]
   dedup key: content_hash = sha256(description).
   Unchanged listings are skipped entirely on re-ingest. Changed listings
   overwrite in place. New listings insert fresh.
        ↓
[Claude extraction worker — Haiku, forced tool-use]
   Only classifies what the structured data can't give us: role_category,
   seniority, ai_integration_depth, interview_process_summary. Re-runs only
   when extracted_from_hash != raw_listings.content_hash.
        ↓
[extracted_listings — Postgres]
        ↓
[Next.js dashboard]
   Filter by role / employment type / seniority / AI depth → every query
   (/api/aggregate, /api/listings) runs fresh against the full matching set,
   so nothing is double-counted or dropped.
```

## Setup

1. **Postgres**: create a database, then set `DATABASE_URL` in `.env`
   (copy from `.env.example`).
   ```bash
   npm run db:migrate
   ```

2. **Algolia key**: this is captured from your own browser session, not a
   secret you generate. Open `workatastartup.com`, open DevTools → Network →
   filter `algolia`, apply any filter on the jobs page, and copy the full
   `x-algolia-api-key` header value from the request. Paste it into
   `ALGOLIA_SEARCH_KEY` in `.env`. It's a public, search-only, signed key —
   the same one your browser uses — but it may be domain-restricted or
   rotate over time, so re-capture it if ingestion starts 403ing.

3. **Anthropic API key**: set `ANTHROPIC_API_KEY` in `.env`.

4. **Ingest**:
   ```bash
   npm run ingest        # defaults to filter "(role:eng)"
   npm run ingest "(role:design)"   # or any other Algolia filter string
   ```
   Safe to re-run any time — it resumes from the last checkpointed page and
   skips unchanged listings automatically.

5. **Extract**:
   ```bash
   npm run extract       # processes 25 pending rows at a time until none remain
   ```
   Only processes rows that are new or whose content changed since the last
   extraction — never reprocesses (and never re-bills) unchanged listings.

6. **Dashboard**:
   ```bash
   npm run dev
   ```
   Open `localhost:3000`.

## Red flags this design already accounts for

- **Algolia key stops working** → re-capture from DevTools, it's a config
  value not a code change.
- **Rate limiting** → ingestion already waits `ALGOLIA_REQUEST_DELAY_MS`
  (default 400ms) between pages.
- **YC changes their data shape** → all Algolia fields are typed as optional
  in `src/algolia/types.ts` with a catch-all index signature, so an added or
  removed field won't crash ingestion.
- **Duplicate/reprocessed data** → content-hash dedup at both the ingest and
  extraction stages (see architecture above).
- **Crash mid-crawl** → `ingest_checkpoints` table resumes from the last
  completed page, not page 0.

## Legal note

This hits Algolia's public, browser-facing search endpoint at low volume for
personal use — not LinkedIn, not a scraper fighting anti-bot measures. That's
a meaningfully different risk profile than running a public product at scale.
Keep it personal (not deployed publicly, not redistributing YC's data) unless
you've separately worked through the legal side of making it a public tool.
# yc-job-radar
