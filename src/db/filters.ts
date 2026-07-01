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
 * Always joins extracted_listings e + raw_listings r, so callers can reference
 * either table's columns in what they select.
 */
export function buildWhereClause(filters: ParsedFilters): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.roleCategories.length) {
    params.push(filters.roleCategories);
    clauses.push(`e.role_category = ANY($${params.length})`);
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
