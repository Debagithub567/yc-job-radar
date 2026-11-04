import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db/client";
import { parseFilters, buildWhereClause } from "@/db/filters";
import { databaseErrorResponse } from "../db-error";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const { where, params } = buildWhereClause(filters);

    // Every query below runs against the full current matching set, fresh —
    // nothing cached or incrementally built, so counts can't drift from reality.
    const joinBase = `FROM raw_listings r LEFT JOIN extracted_listings e
      ON e.object_id = r.object_id AND e.extracted_from_hash = r.content_hash ${where}`;
    const classifiedBase = `${joinBase} ${where ? "AND" : "WHERE"} e.object_id IS NOT NULL`;

    const [totalResult, skillsResult, aiDepthResult, seniorityResult, importResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(e.object_id)::int AS classified ${joinBase}`,
        params
      ),

      pool.query(
        `SELECT skill, COUNT(*)::int AS count
         FROM (
           SELECT unnest(CASE WHEN cardinality(e.must_have_skills) > 0
                             THEN e.must_have_skills ELSE r.skills END) AS skill ${joinBase}
         ) s
         GROUP BY skill
         ORDER BY count DESC
         LIMIT 25`,
        params
      ),

      pool.query(
        `SELECT ai_integration_depth AS depth, COUNT(*)::int AS count
         ${classifiedBase}
         GROUP BY ai_integration_depth
         ORDER BY count DESC`,
        params
      ),

      pool.query(
        `SELECT seniority, COUNT(*)::int AS count
         ${classifiedBase}
         GROUP BY seniority
         ORDER BY count DESC`,
        params
      ),

      pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(e.object_id)::int AS classified,
                MAX(r.last_seen_at) AS last_seen_at
         FROM raw_listings r
         LEFT JOIN extracted_listings e ON e.object_id = r.object_id AND e.extracted_from_hash = r.content_hash`
      ),
    ]);

    return NextResponse.json({
      total: totalResult.rows[0]?.total ?? 0,
      classified: totalResult.rows[0]?.classified ?? 0,
      importedTotal: importResult.rows[0]?.total ?? 0,
      classifiedTotal: importResult.rows[0]?.classified ?? 0,
      lastSeenAt: importResult.rows[0]?.last_seen_at ?? null,
      skillFrequency: skillsResult.rows,
      aiDepthDistribution: aiDepthResult.rows,
      seniorityDistribution: seniorityResult.rows,
    });
  } catch (error) {
    return databaseErrorResponse("/api/aggregate", error);
  }
}
