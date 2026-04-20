import Link from "next/link";
import { Settings, UserPlus, Target } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { BUDGET_ALLOCATION, CATEGORIES } from "@/lib/categories";
import { formatBRL } from "@/lib/money";
import { listTransactions, monthRange } from "@/lib/transactions-query";
import { listGoals } from "@/lib/goals-query";
import { ViewToggle } from "@/components/transactions/view-toggle";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { cn } from "@/lib/utils";

type ViewParam = "mine" | "partner" | "family";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const ctx = await requireHouseholdContext();
  const { uid, user, household, householdId, partnerId } = ctx;

  const memberIds = household.memberIds ?? [];
  const view: ViewParam =
    rawView === "mine" ||
    (rawView === "partner" && partnerId) ||
    rawView === "family"
      ? (rawView as ViewParam)
      : "family";

  const now = new Date();
  const { from, to } = monthRange(now.getFullYear(), now.getMonth());
  const memberFilter =
    view === "mine" ? uid : view === "partner" ? partnerId : undefined;

  const transactions = await listTransactions({
    householdId,
    from,
    to,
    memberId: memberFilter,
  });

  const goals = await listGoals(householdId, { activeOnly: true });

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const spentByCat = { essentials: 0, qualityOfLife: 0, goals: 0 };
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.category === "essentials") spentByCat.essentials += t.amount;
    else if (t.category === "qualityOfLife")
      spentByCat.qualityOfLife += t.amount;
    else if (t.category === "goals") spentByCat.goals += t.amount;
  }

  const baseIncome =
    view === "mine"
      ? household.members?.[uid]?.monthlyIncome ?? 0
      : view === "partner"
        ? household.members?.[partnerId ?? ""]?.monthlyIncome ?? 0
        : household.combinedMonthlyIncome ?? 0;

  const budgets = {
    essentials: baseIncome * BUDGET_ALLOCATION.essentials,
    qualityOfLife: baseIncome * BUDGET_ALLOCATION.qualityOfLife,
    goals: baseIncome * BUDGET_ALLOCATION.goals,
  };

  const headerName =
    view === "mine"
      ? user.name
      : view === "partner" && partnerId
        ? household.members?.[partnerId]?.name
        : household.name;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-3xl w-full mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {view === "family" ? "Família" : "Dashboard"}
          </p>
          <h1 className="text-2xl font-semibold">{headerName}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {now.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Configurações"
          >
            <Settings className="size-4" />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <ViewToggle current={view} year={now.getFullYear()} month={now.getMonth()} />

      {memberIds.length < 2 ? (
        <Link
          href="/settings/household"
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="size-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Convide sua esposa</p>
            <p className="text-xs text-muted-foreground">
              Gere um link pra ela entrar na família.
            </p>
          </div>
        </Link>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Entradas no mês</p>
        <p className="text-3xl font-semibold mt-1 text-primary">
          {formatBRL(income)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Renda base: {formatBRL(baseIncome)}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Orçamento 40/15/45
        </h2>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const spent =
              c.id === "essentials"
                ? spentByCat.essentials
                : c.id === "qualityOfLife"
                  ? spentByCat.qualityOfLife
                  : spentByCat.goals;
            const budget = budgets[c.id as keyof typeof budgets];
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(c.allocation * 100)}% · {formatBRL(budget)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      over ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {formatBRL(spent)}
                  </p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-destructive" : "bg-primary",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Metas
          </h2>
          <Link
            href="/goals"
            className="text-xs text-primary underline underline-offset-4"
          >
            Ver todas
          </Link>
        </div>
        {goals.length === 0 ? (
          <Link
            href="/goals/new"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Target className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Criar primeira meta</p>
              <p className="text-xs text-muted-foreground">
                Reserva, viagem, carro… planeje e acompanhe.
              </p>
            </div>
          </Link>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.slice(0, 3).map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
                  : 0;
              return (
                <li key={g.id}>
                  <Link
                    href={`/goals/${g.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-9 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `${g.color}20`,
                          color: g.color,
                        }}
                      >
                        <span className="text-base">{g.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {g.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBRL(g.currentAmount)} de{" "}
                          {formatBRL(g.targetAmount)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {Math.round(pct)}%
                      </p>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Recentes
          </h2>
          <Link
            href="/transactions"
            className="text-xs text-primary underline underline-offset-4"
          >
            Ver todas
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma transação ainda. Toque no + pra lançar a primeira.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.subcategory} · {t.createdByName}
                    </p>
                  </div>
                  <p
                    className={
                      t.type === "income"
                        ? "text-sm font-semibold text-primary"
                        : "text-sm font-semibold text-destructive"
                    }
                  >
                    {t.type === "income" ? "+ " : "− "}
                    {formatBRL(Math.abs(t.amount))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
