import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db/client";
import { parseFilters, buildWhereClause } from "@/db/filters";

export async function GET(req: NextRequest) {
  const filters = parseFilters(req.nextUrl.searchParams);
  const { where, params } = buildWhereClause(filters);

  const page = Number(req.nextUrl.searchParams.get("page") ?? "0");
  const pageSize = 25;

  const rows = await pool.query(
    `SELECT r.object_id, r.title, r.company_name, r.job_type, r.remote,
            r.min_experience, r.has_salary, r.has_equity, r.locations_for_search,
            e.role_category, e.seniority, e.ai_integration_depth,
            e.ai_integration_notes, e.must_have_skills
     FROM extracted_listings e
     JOIN raw_listings r ON r.object_id = e.object_id
     ${where}
     ORDER BY r.last_seen_at DESC
     LIMIT ${pageSize} OFFSET ${page * pageSize}`,
    params
  );

  return NextResponse.json({ listings: rows.rows, page, pageSize });
}
