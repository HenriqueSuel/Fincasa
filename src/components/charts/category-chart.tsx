"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/money";
import type { CategorySlice } from "@/lib/reports-query";

export function CategoryChart({ data }: { data: CategorySlice[] }) {
  const chartData = data.map((d) => ({
    name: d.label,
    color: d.color,
    budget: Math.round(d.budget),
    spent: Math.round(d.spent),
    pct:
      d.budget > 0
        ? Math.round(Math.min(999, (d.spent / d.budget) * 100))
        : 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 4, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
            formatter={(value, key) => [
              formatBRL(Number(value)),
              key === "spent" ? "Gasto" : "Orçamento",
            ]}
          />
          <Bar dataKey="budget" fill="var(--color-muted)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
