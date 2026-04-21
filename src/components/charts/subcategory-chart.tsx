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
import type { SubcategoryPoint } from "@/lib/reports-query";

export function SubcategoryChart({ data }: { data: SubcategoryPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem despesas categorizadas nesse mês.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    name: d.name,
    value: Math.round(d.spent),
    color: d.color,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(1)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--color-foreground)" }}
            formatter={(value) => [formatBRL(Number(value)), "Gasto"]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
