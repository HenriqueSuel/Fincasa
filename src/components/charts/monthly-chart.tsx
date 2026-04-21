"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/money";
import type { MonthPoint } from "@/lib/reports-query";

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const chartData = data.map((p) => ({
    label: p.label,
    Entradas: Math.round(p.income),
    Saídas: Math.round(p.expense),
  }));

  return (
    <div className="h-72 w-full">
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
            dataKey="label"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.replace(".", "")}
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
              color: "var(--color-foreground)",
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--color-foreground)" }}
            formatter={(value) => formatBRL(Number(value))}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconSize={10}
          />
          <Bar dataKey="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Saídas" fill="#EF4444" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
