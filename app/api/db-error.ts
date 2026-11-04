import { NextResponse } from "next/server";

export function databaseErrorResponse(route: string, error: unknown) {
  console.error(`${route} failed:`, error);

  const message = process.env.DATABASE_URL
    ? "Could not load job data. Check that Postgres is running and run npm run db:migrate."
    : "DATABASE_URL is missing. Set it in .env, then restart the development server.";

  return NextResponse.json({ error: message }, { status: 503 });
}
