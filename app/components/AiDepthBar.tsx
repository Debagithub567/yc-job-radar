"use client";

const DEPTH_ORDER = ["none", "mentioned", "core_to_role", "ai_native"];
const DEPTH_LABEL: Record<string, string> = {
  none: "None",
  mentioned: "Mentioned",
  core_to_role: "Core to role",
  ai_native: "AI-native",
};
const DEPTH_COLOR: Record<string, string> = {
  none: "var(--text-dim)",
  mentioned: "var(--border-bright)",
  core_to_role: "var(--accent-amber-dim)",
  ai_native: "var(--accent-amber)",
};

export function AiDepthBar({ data }: { data: { depth: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (!total) {
    return (
      <div style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        No data for this filter set yet.
      </div>
    );
  }

  const byDepth = Object.fromEntries(data.map((d) => [d.depth, d.count]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          display: "flex",
          height: "10px",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {DEPTH_ORDER.map((depth) => {
          const count = byDepth[depth] ?? 0;
          if (!count) return null;
          return (
            <div
              key={depth}
              style={{
                width: `${(count / total) * 100}%`,
                background: DEPTH_COLOR[depth],
              }}
              title={`${DEPTH_LABEL[depth]}: ${count}`}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {DEPTH_ORDER.map((depth) => {
          const count = byDepth[depth] ?? 0;
          return (
            <div
              key={depth}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: DEPTH_COLOR[depth],
                  display: "inline-block",
                }}
              />
              {DEPTH_LABEL[depth]} · {count}
            </div>
          );
        })}
      </div>
    </div>
  );
}
