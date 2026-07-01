"use client";

const ROLE_CATEGORIES = [
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "fullstack", label: "Fullstack" },
  { value: "forward_deployed", label: "Forward Deployed" },
  { value: "devops_infra", label: "DevOps / Infra" },
  { value: "data_ml", label: "Data / ML" },
];

const JOB_TYPES = [
  { value: "fulltime", label: "Full-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const SENIORITY = [
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];

const AI_DEPTH = [
  { value: "none", label: "None" },
  { value: "mentioned", label: "Mentioned" },
  { value: "core_to_role", label: "Core to role" },
  { value: "ai_native", label: "AI-native" },
];

export interface FilterState {
  roleCategories: string[];
  jobTypes: string[];
  seniority: string | null;
  aiDepth: string | null;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring"
      style={{
        padding: "6px 12px",
        borderRadius: "var(--radius)",
        border: `1px solid ${active ? "var(--accent-amber)" : "var(--border)"}`,
        background: active ? "var(--accent-amber-dim)" : "var(--bg-panel-raised)",
        color: active ? "var(--accent-amber)" : "var(--text-muted)",
        fontSize: "13px",
        fontFamily: "var(--font-mono)",
        cursor: "pointer",
        transition: "border-color 120ms, color 120ms",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span
        style={{
          fontSize: "11px",
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const toggleMulti = (key: "roleCategories" | "jobTypes", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const toggleSingle = (key: "seniority" | "aiDepth", value: string) => {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        padding: "20px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <FilterGroup label="Role">
        {ROLE_CATEGORIES.map((r) => (
          <Pill
            key={r.value}
            active={filters.roleCategories.includes(r.value)}
            onClick={() => toggleMulti("roleCategories", r.value)}
          >
            {r.label}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label="Employment type">
        {JOB_TYPES.map((j) => (
          <Pill
            key={j.value}
            active={filters.jobTypes.includes(j.value)}
            onClick={() => toggleMulti("jobTypes", j.value)}
          >
            {j.label}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label="Seniority">
        {SENIORITY.map((s) => (
          <Pill
            key={s.value}
            active={filters.seniority === s.value}
            onClick={() => toggleSingle("seniority", s.value)}
          >
            {s.label}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label="AI integration depth">
        {AI_DEPTH.map((a) => (
          <Pill
            key={a.value}
            active={filters.aiDepth === a.value}
            onClick={() => toggleSingle("aiDepth", a.value)}
          >
            {a.label}
          </Pill>
        ))}
      </FilterGroup>
    </div>
  );
}

export const EMPTY_FILTERS: FilterState = {
  roleCategories: [],
  jobTypes: [],
  seniority: null,
  aiDepth: null,
};
