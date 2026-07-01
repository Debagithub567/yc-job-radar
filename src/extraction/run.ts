import "dotenv/config";
import { pool } from "../db/client.js";
import { extractListing } from "./worker.js";

const BATCH_SIZE = Number(process.argv[2] ?? 25);

interface PendingRow {
  object_id: string;
  title: string;
  company_name: string | null;
  company_description: string | null;
  description_md: string;
  skills: string[] | null;
  content_hash: string;
}

async function fetchPendingBatch(): Promise<PendingRow[]> {
  // "Pending" = never extracted, OR raw content changed since last extraction
  // (extracted_from_hash != current content_hash). This is the whole dedup
  // guarantee for the extraction stage: unchanged listings never re-hit the API.
  const { rows } = await pool.query<PendingRow>(
    `SELECT r.object_id, r.title, r.company_name, r.company_description,
            r.description_md, r.skills, r.content_hash
     FROM raw_listings r
     LEFT JOIN extracted_listings e ON e.object_id = r.object_id
     WHERE e.object_id IS NULL OR e.extracted_from_hash != r.content_hash
     LIMIT $1`,
    [BATCH_SIZE]
  );
  return rows;
}

async function run() {
  let totalDone = 0;
  let totalFailed = 0;

  while (true) {
    const batch = await fetchPendingBatch();
    if (batch.length === 0) break;

    console.log(`Extracting batch of ${batch.length}...`);

    for (const row of batch) {
      try {
        const extracted = await extractListing({
          title: row.title,
          companyName: row.company_name,
          companyDescription: row.company_description,
          descriptionMd: row.description_md,
          existingSkills: row.skills,
        });

        await pool.query(
          `INSERT INTO extracted_listings (
              object_id, extracted_from_hash, role_category, seniority,
              must_have_skills, nice_to_have_skills, ai_integration_depth,
              ai_integration_notes, interview_process_summary, extracted_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
           ON CONFLICT (object_id) DO UPDATE SET
              extracted_from_hash = $2, role_category = $3, seniority = $4,
              must_have_skills = $5, nice_to_have_skills = $6,
              ai_integration_depth = $7, ai_integration_notes = $8,
              interview_process_summary = $9, extracted_at = now()`,
          [
            row.object_id,
            row.content_hash,
            extracted.role_category,
            extracted.seniority,
            extracted.must_have_skills,
            extracted.nice_to_have_skills,
            extracted.ai_integration_depth,
            extracted.ai_integration_notes,
            extracted.interview_process_summary,
          ]
        );

        totalDone++;
      } catch (err) {
        // Fail loud per-row, keep the batch moving — one bad listing shouldn't
        // block the other 24. Flagged rows just stay "pending" and get retried
        // next run.
        console.error(`Extraction failed for ${row.object_id} (${row.title}):`, err);
        totalFailed++;
      }
    }

    console.log(`Batch done. Running totals — done:${totalDone} failed:${totalFailed}`);
  }

  console.log(`Extraction run complete. done:${totalDone} failed:${totalFailed}`);
  await pool.end();
}

run().catch(async (err) => {
  console.error("Extraction run crashed:", err);
  await pool.end();
  process.exit(1);
});
