import "dotenv/config";
import { createHash } from "node:crypto";
import { fetchJobsPage, sleep, ALGOLIA_REQUEST_DELAY_MS } from "./algolia/client.js";
import type { AlgoliaJobHit } from "./algolia/types.js";
import { pool } from "./db/client.js";

// One filter per run. Broad "(role:eng)" covers backend/frontend/fullstack/etc,
// since eng_type sub-classifies within it and we want to store everything —
// filtering to a specific eng_type happens at query time in the dashboard, not here.
const FILTER = process.argv[2] ?? "(role:eng)";
const FILTER_KEY = FILTER; // used as the checkpoint row key

function hashDescription(description: string): string {
  return createHash("sha256").update(description).digest("hex");
}

async function getCheckpoint(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT last_page_fetched FROM ingest_checkpoints WHERE filter_key = $1`,
    [FILTER_KEY]
  );
  return rows.length ? rows[0].last_page_fetched : -1;
}

async function saveCheckpoint(page: number, totalPages: number) {
  await pool.query(
    `INSERT INTO ingest_checkpoints (filter_key, last_page_fetched, total_pages, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (filter_key)
     DO UPDATE SET last_page_fetched = $2, total_pages = $3, updated_at = now()`,
    [FILTER_KEY, page, totalPages]
  );
}

async function upsertListing(hit: AlgoliaJobHit) {
  const description = hit.description ?? "";
  const contentHash = hashDescription(description);

  // Skip the write entirely if nothing changed since last time — this is the
  // "don't reprocess the same 800" guarantee. We still touch last_seen_at so
  // we can later tell which listings have disappeared from the board.
  const existing = await pool.query(
    `SELECT content_hash FROM raw_listings WHERE object_id = $1`,
    [hit.objectID]
  );

  if (existing.rows.length && existing.rows[0].content_hash === contentHash) {
    await pool.query(`UPDATE raw_listings SET last_seen_at = now() WHERE object_id = $1`, [
      hit.objectID,
    ]);
    return { status: "unchanged" as const };
  }

  await pool.query(
    `INSERT INTO raw_listings (
        object_id, company_id, company_name, company_website, company_description,
        company_waas_stage, title, description_md, role, eng_type, job_type, remote,
        min_experience, has_salary, has_equity, has_interview_process, skills,
        locations_for_search, us_visa_required, content_hash, raw_json,
        first_seen_at, last_seen_at
     ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21, now(), now()
     )
     ON CONFLICT (object_id) DO UPDATE SET
        company_id = $2, company_name = $3, company_website = $4, company_description = $5,
        company_waas_stage = $6, title = $7, description_md = $8, role = $9, eng_type = $10,
        job_type = $11, remote = $12, min_experience = $13, has_salary = $14, has_equity = $15,
        has_interview_process = $16, skills = $17, locations_for_search = $18,
        us_visa_required = $19, content_hash = $20, raw_json = $21, last_seen_at = now()`,
    [
      hit.objectID,
      hit.company_id ?? null,
      hit.company_name ?? null,
      hit.company_website ?? null,
      hit.company_description ?? null,
      hit.company_waas_stage ?? null,
      hit.title,
      description,
      hit.role ?? null,
      hit.eng_type ?? null,
      hit.job_type ?? null,
      hit.remote ?? null,
      hit.min_experience ?? null,
      hit.has_salary ?? null,
      hit.has_equity ?? null,
      hit.has_interview_process ?? null,
      hit.skills ?? null,
      hit.locations_for_search ?? null,
      hit.us_visa_required ?? null,
      contentHash,
      JSON.stringify(hit),
    ]
  );

  return { status: existing.rows.length ? ("updated" as const) : ("new" as const) };
}

async function run() {
  console.log(`Starting ingest with filter: ${FILTER}`);
  const startPage = (await getCheckpoint()) + 1;
  if (startPage > 0) {
    console.log(`Resuming from page ${startPage} (checkpoint found)`);
  }

  let page = startPage;
  let totalPages = Infinity;
  const counts = { new: 0, updated: 0, unchanged: 0 };

  while (page < totalPages) {
    const { hits, nbPages, nbHits } = await fetchJobsPage(FILTER, page, 100);
    totalPages = nbPages;

    if (page === startPage) {
      console.log(`Total matching listings: ${nbHits} across ${nbPages} pages`);
    }

    for (const hit of hits) {
      const { status } = await upsertListing(hit);
      counts[status]++;
    }

    await saveCheckpoint(page, totalPages);
    console.log(
      `Page ${page + 1}/${totalPages} done — new:${counts.new} updated:${counts.updated} unchanged:${counts.unchanged}`
    );

    page++;
    if (page < totalPages) await sleep(ALGOLIA_REQUEST_DELAY_MS);
  }

  console.log("Ingest complete.", counts);
  await pool.end();
}

run().catch(async (err) => {
  console.error("Ingest failed (checkpoint preserved, safe to re-run):", err);
  await pool.end();
  process.exit(1);
});
