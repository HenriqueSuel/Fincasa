"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { formatBRL } from "@/lib/money";

export interface InvestmentEventPoint {
  type: "contribution" | "revaluation" | "withdrawal";
  date: Date;
  amount: number;
  newValue?: number;
}

/**
 * Reconstroi a série do `currentValue` a partir dos eventos, assumindo que
 * começa em 0 antes do primeiro contribution:
 *
 *  - contribution → value += amount
 *  - revaluation  → value = newValue (absoluto)
 *  - withdrawal   → value -= amount
 */
export function InvestmentValueChart({
  events,
}: {
  events: InvestmentEventPoint[];
}) {
  const data = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    let running = 0;
    return sorted.map((e) => {
      if (e.type === "contribution") running += e.amount;
      else if (e.type === "withdrawal") running = Math.max(0, running - e.amount);
      else if (typeof e.newValue === "number") running = e.newValue;
      return {
        ts: e.date.getTime(),
        value: Number(running.toFixed(2)),
        label: format(e.date, "dd/MM/yy"),
        type: e.type,
      };
    });
  }, [events]);

  if (data.length < 2) return null;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 12, left: -8, bottom: 0 }}
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
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toFixed(0)}`
            }
            width={58}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--color-foreground)" }}
            formatter={(value) => [formatBRL(Number(value)), "Posição"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ fill: "var(--color-primary)", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
