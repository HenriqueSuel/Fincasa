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

export interface PricePoint {
  date: Date;
  price: number;
  brand?: string;
  store?: string;
}

export function ItemPriceChart({ purchases }: { purchases: PricePoint[] }) {
  const data = useMemo(() => {
    return [...purchases]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => ({
        ts: p.date.getTime(),
        price: Number(p.price.toFixed(2)),
        label: format(p.date, "dd/MM"),
        brand: p.brand,
        store: p.store,
      }));
  }, [purchases]);

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
            width={52}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
            formatter={(value) => [formatBRL(Number(value)), "Preço"]}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as
                | (typeof data)[number]
                | undefined;
              if (!point) return label as string;
              const parts = [label as string, point.brand, point.store].filter(
                Boolean,
              );
              return parts.join(" · ");
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
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
