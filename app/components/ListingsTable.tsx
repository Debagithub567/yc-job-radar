"use client";

interface Listing {
  object_id: string;
  title: string;
  company_name: string | null;
  job_type: string | null;
  remote: string | null;
  seniority: string | null;
  ai_integration_depth: string | null;
  must_have_skills: string[] | null;
}

export function ListingsTable({ listings }: { listings: Listing[] }) {
  if (!listings.length) {
    return (
      <div style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        No listings match this filter set.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {listings.map((l) => (
        <div
          key={l.object_id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: "16px",
            alignItems: "center",
            padding: "14px 16px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>{l.title}</div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              {l.company_name ?? "Unknown company"}
              {l.must_have_skills?.length ? ` · ${l.must_have_skills.slice(0, 4).join(", ")}` : ""}
            </div>
          </div>
          <Tag>{l.job_type ?? "—"}</Tag>
          <Tag>{l.seniority ?? "—"}</Tag>
          <Tag accent={l.ai_integration_depth === "ai_native" || l.ai_integration_depth === "core_to_role"}>
            {l.ai_integration_depth ?? "—"}
          </Tag>
        </div>
      ))}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        padding: "4px 8px",
        borderRadius: "var(--radius)",
        border: `1px solid ${accent ? "var(--accent-amber)" : "var(--border-bright)"}`,
        color: accent ? "var(--accent-amber)" : "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
