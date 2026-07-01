-- yc-job-radar schema
-- Design notes:
--   raw_listings   : one row per YC job objectID. Overwritten in place when the
--                    underlying listing changes (content_hash differs), so this
--                    table always reflects the latest known version of a listing.
--   extracted_listings : one row per raw_listings row, holding the LLM-derived
--                    structured fields. Re-generated only when raw content_hash
--                    changes (tracked via extracted_from_hash).
--   ingest_checkpoints  : lets a paginated Algolia crawl resume after a crash
--                    instead of restarting from page 0.

CREATE TABLE IF NOT EXISTS raw_listings (
    object_id           TEXT PRIMARY KEY,       -- Algolia objectID == YC job id
    company_id          BIGINT,
    company_name        TEXT,
    company_website     TEXT,
    company_description TEXT,
    company_waas_stage  TEXT,
    title               TEXT NOT NULL,
    description_md      TEXT NOT NULL,          -- raw markdown description from Algolia
    role                TEXT,                   -- coarse category: eng | design | data | ...
    eng_type            TEXT[],                 -- sub-type: fs | be | fe | android | devops | ...
    job_type             TEXT,                  -- fulltime | contract | internship | ...
    remote               TEXT,
    min_experience        INT,
    has_salary            BOOLEAN,
    has_equity            BOOLEAN,
    has_interview_process  BOOLEAN,
    skills                TEXT[],               -- often empty; extraction worker fills gaps
    locations_for_search   TEXT[],
    us_visa_required        TEXT,
    content_hash          TEXT NOT NULL,        -- sha256 of description_md, drives dedup
    first_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_json               JSONB NOT NULL        -- full original Algolia hit, for future-proofing
);

CREATE INDEX IF NOT EXISTS idx_raw_listings_eng_type ON raw_listings USING GIN (eng_type);
CREATE INDEX IF NOT EXISTS idx_raw_listings_job_type ON raw_listings (job_type);
CREATE INDEX IF NOT EXISTS idx_raw_listings_content_hash ON raw_listings (content_hash);

CREATE TABLE IF NOT EXISTS extracted_listings (
    object_id             TEXT PRIMARY KEY REFERENCES raw_listings(object_id) ON DELETE CASCADE,
    extracted_from_hash    TEXT NOT NULL,        -- content_hash of raw_listings row this came from
    role_category           TEXT,                -- normalized: backend | frontend | fullstack | forward_deployed | other
    seniority                TEXT,                -- intern | junior | mid | senior | unclear
    must_have_skills          TEXT[],
    nice_to_have_skills        TEXT[],
    ai_integration_depth        TEXT,             -- none | mentioned | core_to_role | ai_native
    ai_integration_notes         TEXT,
    interview_process_summary     TEXT,
    extracted_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_role_category ON extracted_listings (role_category);
CREATE INDEX IF NOT EXISTS idx_extracted_ai_depth ON extracted_listings (ai_integration_depth);
CREATE INDEX IF NOT EXISTS idx_extracted_must_have_skills ON extracted_listings USING GIN (must_have_skills);

CREATE TABLE IF NOT EXISTS ingest_checkpoints (
    filter_key       TEXT PRIMARY KEY,   -- e.g. "role:eng" — one checkpoint per query shape
    last_page_fetched INT NOT NULL DEFAULT -1,
    total_pages       INT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
