// Parses filter query params shared by /api/listings and /api/aggregate.
// role_category and job_type are multi-select (comma-separated), everything
// else is single-value. Returns a WHERE clause fragment + params array so
// both routes build the exact same predicate.

export interface ParsedFilters {
  roleCategories: string[];
  jobTypes: string[];
  seniority: string | null;
  aiDepth: string | null;
}

// Algolia supplies these role tags before the AI extraction worker runs.
const SOURCE_ROLE_CODES: Record<string, string[]> = {
  backend: ["be"],
  frontend: ["fe"],
  fullstack: ["fs"],
  forward_deployed: ["forward_deployed", "fde"],
  devops_infra: ["devops"],
  data_ml: ["ml", "data_sci", "ai"],
};

export function parseFilters(searchParams: URLSearchParams): ParsedFilters {
  const roleCategories = (searchParams.get("role_category") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const jobTypes = (searchParams.get("job_type") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seniority = searchParams.get("seniority");
  const aiDepth = searchParams.get("ai_depth");

  return { roleCategories, jobTypes, seniority, aiDepth };
}

/**
 * Builds "WHERE ..." (or "" if no filters) plus the params array, starting at $1.
 * Callers join raw_listings r with extracted_listings e, so imported jobs can
 * still match source role tags before AI classification is available.
 */
export function buildWhereClause(filters: ParsedFilters): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.roleCategories.length) {
    params.push(filters.roleCategories);
    const classifiedParam = params.length;
    params.push(filters.roleCategories.flatMap((role) => SOURCE_ROLE_CODES[role] ?? []));
    const sourceParam = params.length;
    clauses.push(
      `(e.role_category = ANY($${classifiedParam}::text[]) OR ` +
        `(e.object_id IS NULL AND r.eng_type && $${sourceParam}::text[]))`
    );
  }
  if (filters.jobTypes.length) {
    params.push(filters.jobTypes);
    clauses.push(`r.job_type = ANY($${params.length})`);
  }
  if (filters.seniority) {
    params.push(filters.seniority);
    clauses.push(`e.seniority = $${params.length}`);
  }
  if (filters.aiDepth) {
    params.push(filters.aiDepth);
    clauses.push(`e.ai_integration_depth = $${params.length}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}
