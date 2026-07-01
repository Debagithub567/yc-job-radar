import "dotenv/config";
import { Pool } from "pg";

// Single shared pool for the whole process. Next.js API routes, the ingest
// script, and the extraction worker all import this same instance.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // Idle client errors shouldn't crash the process — log and move on.
  console.error("Unexpected Postgres pool error", err);
});

export async function query<T = any>(text: string, params?: unknown[]) {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
