import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Download,
} from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listTransactions, monthRange } from "@/lib/transactions-query";
import { CATEGORIES } from "@/lib/categories";
import { formatBRL, formatSignedBRL } from "@/lib/money";
import { toLocalDateKey } from "@/lib/dates";
import { ViewToggle } from "@/components/transactions/view-toggle";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";

export const metadata: Metadata = { title: "Transações" };

type ViewParam = "mine" | "partner" | "family";

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function categoryIcon(category: string, subcategory: string): string {
  const def = CATEGORIES.find((c) => c.id === category);
  const sub = def?.subcategories.find((s) => s.name === subcategory);
  if (sub) return sub.icon;
  if (category === "income") return "💰";
  if (category === "transfer") return "↔️";
  return "💸";
}

type CategoryFilter =
  | "all"
  | "essentials"
  | "qualityOfLife"
  | "goals"
  | "income";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    y?: string;
    m?: string;
    cat?: string;
    q?: string;
  }>;
}) {
  const {
    view: rawView,
    y: rawY,
    m: rawM,
    cat: rawCat,
    q: rawQ,
  } = await searchParams;
  const ctx = await requireHouseholdContext();
  const { uid, householdId, partnerId } = ctx;

  const now = new Date();
  const year = rawY ? Number(rawY) : now.getFullYear();
  const monthIndex = rawM ? Number(rawM) : now.getMonth();
  const view: ViewParam =
    rawView === "mine" || rawView === "partner" || rawView === "family"
      ? rawView
      : "family";
  if (view === "partner" && !partnerId) redirect("/transactions?view=family");

  const memberId =
    view === "mine" ? uid : view === "partner" ? partnerId : undefined;

  const { from, to } = monthRange(year, monthIndex);
  const allTransactions = await listTransactions({
    householdId,
    from,
    to,
    memberId,
  });

  const category: CategoryFilter =
    rawCat === "essentials" ||
    rawCat === "qualityOfLife" ||
    rawCat === "goals" ||
    rawCat === "income"
      ? rawCat
      : "all";
  const searchTerm = (rawQ ?? "").trim().toLowerCase();

  const transactions = allTransactions.filter((t) => {
    if (category !== "all") {
      if (category === "income") {
        if (t.type !== "income") return false;
      } else if (t.category !== category) {
        return false;
      }
    }
    if (searchTerm) {
      const hay = `${t.description} ${t.subcategory} ${t.createdByName}`.toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return true;
  });

  const grouped = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const key = toLocalDateKey(t.date);
    const arr = grouped.get(key) ?? [];
    arr.push(t);
    grouped.set(key, arr);
  }

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  const buildQs = (overrides: Record<string, string | undefined>) => {
    const base: Record<string, string | undefined> = {
      view,
      y: String(year),
      m: String(monthIndex),
      cat: category === "all" ? undefined : category,
      q: searchTerm || undefined,
      ...overrides,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) {
      if (v !== undefined && v !== "") sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  };
  const exportHref = `/api/export/csv?view=${view}&y=${year}&m=${monthIndex}`;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-3xl w-full mx-auto">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Transações</h1>
          <div className="flex items-center gap-2">
            <a
              href={exportHref}
              download
              className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
              aria-label="Exportar CSV"
              title="Exportar CSV"
            >
              <Download className="size-4" />
            </a>
            <Link
              href="/transactions/new"
              className="flex items-center gap-2 rounded-full bg-primary px-4 h-10 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Nova
            </Link>
          </div>
        </div>

        <ViewToggle current={view} year={year} month={monthIndex} />

        <div className="flex items-center justify-between rounded-full border border-border bg-card px-2 h-10">
          <Link
            href={`/transactions${buildQs({
              y: String(prevYear),
              m: String(prevMonth),
            })}`}
            className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="text-sm font-medium capitalize">
            {monthLabel(year, monthIndex)}
          </span>
          <Link
            href={`/transactions${buildQs({
              y: String(nextYear),
              m: String(nextMonth),
            })}`}
            className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <TransactionsFilters
          currentCategory={category}
          currentSearch={searchTerm}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-lg font-semibold text-primary">
              {formatBRL(income)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="text-lg font-semibold text-destructive">
              {formatBRL(expense)}
            </p>
          </div>
        </div>
      </header>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {category !== "all" || searchTerm
              ? "Nenhuma transação bate com os filtros."
              : "Nenhuma transação nesse mês."}
          </p>
          <Link
            href="/transactions/new"
            className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
          >
            <Plus className="size-4" />
            Lançar a primeira
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(grouped.entries()).map(([key, items]) => (
            <section key={key} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide capitalize">
                {dayLabel(new Date(items[0]!.date))}
              </p>
              <ul className="flex flex-col gap-1.5">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={
                        t.createdBy === uid
                          ? `/transactions/${t.id}`
                          : "/transactions"
                      }
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-lg">
                        {categoryIcon(t.category, t.subcategory)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.description}
                          {t.installment ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground align-middle">
                              {t.installment.number}/{t.installment.count}
                            </span>
                          ) : null}
                          {t.recurring ? (
                            <span
                              className="ml-2 inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground align-middle"
                              title="Transação recorrente"
                            >
                              ♻︎ mensal
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.subcategory} · {t.createdByName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            t.type === "income"
                              ? "text-sm font-semibold text-primary"
                              : "text-sm font-semibold text-destructive"
                          }
                        >
                          {formatSignedBRL(t.amount, t.type)}
                        </p>
                        {t.createdBy === uid ? (
                          <Pencil className="size-3 text-muted-foreground ml-auto mt-0.5" />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
