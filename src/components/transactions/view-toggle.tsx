"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type ViewParam = "mine" | "partner" | "family";

const LABELS: Record<ViewParam, string> = {
  mine: "Minha",
  partner: "Dela",
  family: "Família",
};

export function ViewToggle({
  current,
  year,
  month,
}: {
  current: ViewParam;
  year: number;
  month: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const views: ViewParam[] = ["mine", "partner", "family"];

  function buildHref(v: ViewParam) {
    const next = new URLSearchParams(params);
    next.set("view", v);
    next.set("y", String(year));
    next.set("m", String(month));
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1">
      {views.map((v) => (
        <Link
          key={v}
          href={buildHref(v)}
          aria-pressed={current === v}
          className={cn(
            "h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors",
            current === v
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABELS[v]}
        </Link>
      ))}
    </div>
  );
}
