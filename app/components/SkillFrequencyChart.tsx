"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export function SkillFrequencyChart({
  data,
}: {
  data: { skill: string; count: number }[];
}) {
  if (!data.length) {
    return <EmptyState label="No skill data for this filter set yet." />;
  }

  const max = data[0]?.count ?? 1;

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="skill"
          width={140}
          tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--bg-panel-raised)" }}
          contentStyle={{
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-bright)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={entry.skill}
              fill={entry.count === max ? "var(--accent-amber)" : "var(--accent-amber-dim)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {label}
    </div>
  );
}
