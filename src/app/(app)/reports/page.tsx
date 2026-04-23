import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import {
  categoryBreakdown,
  categoryComparison,
  memberBreakdown,
  monthlyTrend,
  subcategoryBreakdown,
} from "@/lib/reports-query";
import { cn } from "@/lib/utils";
import { CategoryChart } from "@/components/charts/category-chart";
import { MemberChart } from "@/components/charts/member-chart";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { SubcategoryChart } from "@/components/charts/subcategory-chart";

export const metadata: Metadata = { title: "Relatórios" };

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y: rawY, m: rawM } = await searchParams;
  const { householdId, household } = await requireHouseholdContext();

  const now = new Date();
  const year = rawY ? Number(rawY) : now.getFullYear();
  const monthIndex = rawM ? Number(rawM) : now.getMonth();

  const baseIncome = household.combinedMonthlyIncome ?? 0;
  const members = Object.entries(household.members ?? {}).map(([id, m]) => ({
    id,
    name: m.name,
  }));

  const [byCategory, byMember, trend, topSubcategories] = await Promise.all([
    categoryBreakdown(householdId, year, monthIndex, baseIncome),
    memberBreakdown(householdId, year, monthIndex, members),
    monthlyTrend(householdId, year, monthIndex, 6),
    subcategoryBreakdown(householdId, year, monthIndex, 5),
  ]);
  const comparisons = await categoryComparison(
    householdId,
    year,
    monthIndex,
    byCategory,
  );
  const comparisonByCategory = Object.fromEntries(
    comparisons.map((c) => [c.category, c]),
  );

  const totalIncome = byMember.reduce((s, m) => s + m.income, 0);
  const totalExpense = byMember.reduce((s, m) => s + m.expense, 0);
  const net = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  const qs = (y: number, m: number) => `?y=${y}&m=${m}`;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-3xl w-full mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
        </div>
        <a
          href={`/api/export/csv?y=${year}&m=${monthIndex}&view=family`}
          download
          className="flex items-center gap-2 rounded-full border border-border px-4 h-9 text-sm font-medium hover:bg-accent transition-colors"
          title="Exportar transações do mês em CSV"
        >
          <Download className="size-4" />
          CSV
        </a>
      </header>

      <div className="flex items-center justify-between rounded-full border border-border bg-card px-2 h-10">
        <Link
          href={`/reports${qs(prevYear, prevMonth)}`}
          className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-sm font-medium capitalize">
          {monthLabel(year, monthIndex)}
        </span>
        <Link
          href={`/reports${qs(nextYear, nextMonth)}`}
          className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Entradas" value={formatBRL(totalIncome)} tone="positive" />
        <StatCard label="Saídas" value={formatBRL(totalExpense)} tone="negative" />
        <StatCard
          label="Taxa de poupança"
          value={`${savingsRate}%`}
          tone={net >= 0 ? "positive" : "negative"}
          hint={formatBRL(net)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Orçamento 40/15/45
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
          {baseIncome === 0 ? (
            <p className="text-sm text-muted-foreground">
              Defina a renda da família em <Link href="/settings/household" className="text-primary underline underline-offset-4">Família</Link> pra ver o orçamento.
            </p>
          ) : (
            <CategoryChart data={byCategory} />
          )}
          <ul className="flex flex-col gap-1.5">
            {byCategory.map((c) => {
              const comp = comparisonByCategory[c.category];
              return (
                <li
                  key={c.category}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <span className="truncate">{c.label}</span>
                  </span>
                  {comp ? <CategoryDelta comp={comp} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {members.length > 1 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Gastos por membro
          </h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <MemberChart data={byMember} />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Top 5 subcategorias
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <SubcategoryChart data={topSubcategories} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Últimos 6 meses
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <MonthlyChart data={trend} />
        </div>
      </section>
    </main>
  );
}

function CategoryDelta({
  comp,
}: {
  comp: NonNullable<Awaited<ReturnType<typeof categoryComparison>>[number]>;
}) {
  // Expense up vs prev = worse (destructive). Down = better (primary).
  const hasData = comp.previousSpent > 0 || comp.changeAbs !== 0;
  if (!hasData) {
    return (
      <span className="text-xs text-muted-foreground">
        sem dado em {comp.previousLabel}
      </span>
    );
  }
  if (comp.changePct === null) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {comp.changeAbs > 0 ? "+" : ""}
        {formatBRL(comp.changeAbs)} vs {comp.previousLabel}
      </span>
    );
  }
  const isDown = comp.changePct < 0;
  const formatted = `${comp.changePct > 0 ? "+" : ""}${comp.changePct.toFixed(0)}%`;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs tabular-nums",
        isDown ? "text-primary" : "text-destructive",
      )}
      title={`${formatBRL(comp.previousSpent)} em ${comp.previousLabel}`}
    >
      {isDown ? (
        <TrendingDown className="size-3" />
      ) : (
        <TrendingUp className="size-3" />
      )}
      {formatted}
      <span className="text-muted-foreground font-normal">
        vs {comp.previousLabel}
      </span>
    </span>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p
        className={
          tone === "positive"
            ? "text-base font-semibold text-primary truncate"
            : "text-base font-semibold text-destructive truncate"
        }
      >
        {value}
      </p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
