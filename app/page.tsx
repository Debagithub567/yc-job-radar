"use client";

import { useEffect, useState } from "react";
import { FilterBar, FilterState, EMPTY_FILTERS } from "./components/FilterBar";
import { SkillFrequencyChart } from "./components/SkillFrequencyChart";
import { AiDepthBar } from "./components/AiDepthBar";
import { ListingsTable } from "./components/ListingsTable";

interface AggregateResponse {
  total: number;
  classified: number;
  importedTotal: number;
  classifiedTotal: number;
  lastSeenAt: string | null;
  skillFrequency: { skill: string; count: number }[];
  aiDepthDistribution: { depth: string; count: number }[];
  seniorityDistribution: { seniority: string; count: number }[];
}

interface ListingsResponse {
  listings: any[];
  pageSize: number;
}

async function fetchApi<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}). Check the server logs.`);
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (HTTP ${response.status}). Check the server logs.`;
    throw new Error(message);
  }

  return body as T;
}

function filtersToQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.roleCategories.length) params.set("role_category", filters.roleCategories.join(","));
  if (filters.jobTypes.length) params.set("job_type", filters.jobTypes.join(","));
  if (filters.seniority) params.set("seniority", filters.seniority);
  if (filters.aiDepth) params.set("ai_depth", filters.aiDepth);
  return params.toString();
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [aggregate, setAggregate] = useState<AggregateResponse | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const qs = filtersToQuery(filters);
    setLoading(true);
    setError(null);
    Promise.all([
      fetchApi<AggregateResponse>(`/api/aggregate?${qs}`, controller.signal),
      fetchApi<ListingsResponse>(`/api/listings?${qs ? `${qs}&` : ""}page=${page}`, controller.signal),
    ])
      .then(([agg, list]) => {
        if (!agg || !list || !Array.isArray(list.listings) || typeof agg.total !== "number") {
          throw new Error("The API returned incomplete job data. Check the server logs.");
        }
        setAggregate(agg);
        setListings(list.listings);
        setPageSize(list.pageSize);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setAggregate(null);
        setListings([]);
        setError(cause instanceof Error ? cause.message : "Could not load job data.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, retry]);

  const updateFilters = (next: FilterState) => {
    setPage(0);
    setFilters(next);
  };

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
      <header style={{ position: "relative", overflow: "hidden", marginBottom: "32px" }}>
        <div className="radar-sweep" />
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--accent-amber)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          YC Job Radar
        </div>
        <h1 style={{ fontSize: "28px", margin: 0, fontWeight: 600 }}>
          One filtered signal, not a feed.
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "8px", maxWidth: "560px" }}>
          Set your target role once. See what {aggregate ? aggregate.total.toLocaleString() : "…"}{" "}
          matching postings actually require — aggregated, not scrolled.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }}>
        <FilterBar filters={filters} onChange={updateFilters} />

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: "20px",
                border: "1px solid var(--accent-red)",
                borderRadius: "var(--radius)",
                background: "var(--bg-panel)",
              }}
            >
              <strong style={{ color: "var(--accent-red)" }}>Could not load jobs</strong>
              <p style={{ margin: "8px 0 16px", color: "var(--text-muted)" }}>{error}</p>
              <button type="button" className="focus-ring" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            </div>
          )}

          {!error && (
            <>
              {aggregate && (
                <div
                  role="status"
                  style={{
                    padding: "14px 18px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--bg-panel)",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                  }}
                >
                  Showing {aggregate.total.toLocaleString()} of {aggregate.importedTotal.toLocaleString()} imported YC jobs.
                  {aggregate.importedTotal > 0 && (
                    <> {aggregate.classifiedTotal.toLocaleString()} have AI analysis.</>
                  )}
                  {aggregate.lastSeenAt && (
                    <> Last import: {new Date(aggregate.lastSeenAt).toLocaleDateString()}.</>
                  )}
                  {aggregate.importedTotal === 0 && <> Run <code>npm run ingest</code> to import jobs.</>}
                  {aggregate.importedTotal > aggregate.classifiedTotal && (
                    <> Seniority and AI depth filters need <code>npm run extract</code>.</>
                  )}
                </div>
              )}

              <Panel title="AI integration depth" subtitle="How deeply AI shows up across matching postings">
                {aggregate && <AiDepthBar data={aggregate.aiDepthDistribution} />}
              </Panel>

              <Panel title="Known skills" subtitle="Frequency across matching postings with skill data">
                {aggregate && <SkillFrequencyChart data={aggregate.skillFrequency} />}
              </Panel>

              <Panel
                title={`Listings${aggregate ? ` (${aggregate.total})` : ""}`}
                subtitle="Every posting matching your current filters"
              >
                {loading ? (
                  <div style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    Loading…
                  </div>
                ) : (
                  <>
                    <ListingsTable listings={listings} />
                    {aggregate && aggregate.total > pageSize && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                        <button type="button" className="focus-ring" disabled={page === 0} onClick={() => setPage(page - 1)}>
                          Previous
                        </button>
                        <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                          Page {page + 1} of {Math.ceil(aggregate.total / pageSize)}
                        </span>
                        <button
                          type="button"
                          className="focus-ring"
                          disabled={(page + 1) * pageSize >= aggregate.total}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", margin: 0, fontWeight: 600 }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: "4px 0 0" }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
