import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db/client";
import { parseFilters, buildWhereClause } from "@/db/filters";

export async function GET(req: NextRequest) {
  const filters = parseFilters(req.nextUrl.searchParams);
  const { where, params } = buildWhereClause(filters);

  // Every query below runs against the full current matching set, fresh —
  // nothing cached or incrementally built, so counts can't drift from reality.
  const joinBase = `FROM extracted_listings e JOIN raw_listings r ON r.object_id = e.object_id ${where}`;

  const [totalResult, skillsResult, aiDepthResult, seniorityResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${joinBase}`, params),

    pool.query(
      `SELECT skill, COUNT(*)::int AS count
       FROM (
         SELECT unnest(must_have_skills) AS skill ${joinBase}
       ) s
       GROUP BY skill
       ORDER BY count DESC
       LIMIT 25`,
      params
    ),

    pool.query(
      `SELECT ai_integration_depth AS depth, COUNT(*)::int AS count
       ${joinBase}
       GROUP BY ai_integration_depth
       ORDER BY count DESC`,
      params
    ),

    pool.query(
      `SELECT seniority, COUNT(*)::int AS count
       ${joinBase}
       GROUP BY seniority
       ORDER BY count DESC`,
      params
    ),
  ]);

  return NextResponse.json({
    total: totalResult.rows[0]?.total ?? 0,
    skillFrequency: skillsResult.rows,
    aiDepthDistribution: aiDepthResult.rows,
    seniorityDistribution: seniorityResult.rows,
  });
}
