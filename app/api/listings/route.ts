import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db/client";
import { parseFilters, buildWhereClause } from "@/db/filters";
import { databaseErrorResponse } from "../db-error";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const { where, params } = buildWhereClause(filters);

    const page = Number(req.nextUrl.searchParams.get("page") ?? "0");
    const pageSize = 25;

    const rows = await pool.query(
      `SELECT r.object_id, r.title, r.company_name, r.job_type, r.remote,
             r.min_experience, r.has_salary, r.has_equity, r.locations_for_search,
             r.raw_json->>'search_path' AS source_url,
             e.role_category, e.seniority, e.ai_integration_depth,
             e.ai_integration_notes,
             CASE WHEN cardinality(e.must_have_skills) > 0 THEN e.must_have_skills ELSE r.skills END AS must_have_skills
       FROM raw_listings r
       LEFT JOIN extracted_listings e ON e.object_id = r.object_id AND e.extracted_from_hash = r.content_hash
       ${where}
       ORDER BY r.last_seen_at DESC, r.object_id DESC
       LIMIT ${pageSize} OFFSET ${page * pageSize}`,
      params
    );

    return NextResponse.json({ listings: rows.rows, page, pageSize });
  } catch (error) {
    return databaseErrorResponse("/api/listings", error);
  }
}
