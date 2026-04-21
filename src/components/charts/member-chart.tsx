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
import type { MemberSlice } from "@/lib/reports-query";

export function MemberChart({ data }: { data: MemberSlice[] }) {
  const chartData = data.map((m) => ({
    name: m.name,
    Essenciais: Math.round(m.byCategory.essentials),
    "Qualidade de vida": Math.round(m.byCategory.qualityOfLife),
    Objetivos: Math.round(m.byCategory.goals),
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
          <Bar
            dataKey="Essenciais"
            stackId="a"
            fill="#EF4444"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Qualidade de vida"
            stackId="a"
            fill="#F59E0B"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Objetivos"
            stackId="a"
            fill="#10B981"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
