"use client";

import { useEffect, useState } from "react";
import { FilterBar, FilterState, EMPTY_FILTERS } from "./components/FilterBar";
import { SkillFrequencyChart } from "./components/SkillFrequencyChart";
import { AiDepthBar } from "./components/AiDepthBar";
import { ListingsTable } from "./components/ListingsTable";

interface AggregateResponse {
  total: number;
  skillFrequency: { skill: string; count: number }[];
  aiDepthDistribution: { depth: string; count: number }[];
  seniorityDistribution: { seniority: string; count: number }[];
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = filtersToQuery(filters);
    setLoading(true);
    Promise.all([
      fetch(`/api/aggregate?${qs}`).then((r) => r.json()),
      fetch(`/api/listings?${qs}`).then((r) => r.json()),
    ])
      .then(([agg, list]) => {
        setAggregate(agg);
        setListings(list.listings);
      })
      .finally(() => setLoading(false));
  }, [filters]);

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
        <FilterBar filters={filters} onChange={setFilters} />

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Panel title="AI integration depth" subtitle="How deeply AI shows up across matching postings">
            {aggregate && <AiDepthBar data={aggregate.aiDepthDistribution} />}
          </Panel>

          <Panel title="Most-required skills" subtitle="Frequency across matching postings">
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
              <ListingsTable listings={listings} />
            )}
          </Panel>
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
