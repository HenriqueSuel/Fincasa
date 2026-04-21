import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LineChart, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getGoal } from "@/lib/goals-query";
import { listInvestments } from "@/lib/investments-query";
import { estimateMonthsRemaining } from "@/lib/goals";
import { formatBRL } from "@/lib/money";
import { GoalForm } from "@/components/goals/goal-form";
import { updateGoal } from "@/app/actions/goal";
import { INVESTMENT_TYPE_LABELS } from "@/types/enums";
import { cn } from "@/lib/utils";
import { GoalActions } from "./goal-actions";

export const metadata: Metadata = { title: "Meta" };

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { householdId } = await requireHouseholdContext();
  const goal = await getGoal(householdId, id);
  if (!goal) notFound();

  const investments = await listInvestments(householdId, id, {
    includeArchived: true,
  });
  const activeInvestments = investments.filter((i) => !i.archived);
  const archivedInvestments = investments.filter((i) => i.archived);

  const contributionsSnap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .where("goalId", "==", id)
    .orderBy("date", "desc")
    .limit(10)
    .get();

  const contributions = contributionsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      amount: data.amount as number,
      description: data.description as string,
      date: (data.date as Timestamp).toDate(),
      createdByName: data.createdByName as string,
      createdBy: data.createdBy as string,
    };
  });

  const pct =
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;
  const monthsLeft = estimateMonthsRemaining(
    goal.currentAmount,
    goal.targetAmount,
    goal.monthlyContribution,
  );
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const boundUpdate = updateGoal.bind(null, id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/goals"
            className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold">{goal.name}</h1>
        </div>
        <GoalActions id={id} status={goal.status} />
      </div>

      <section
        className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4"
        style={{ borderColor: `${goal.color}40` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
          >
            <span className="text-2xl">{goal.icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {goal.status === "active"
                ? "Ativa"
                : goal.status === "paused"
                  ? "Pausada"
                  : "Concluída"}
              {" · prioridade "}
              {goal.priority === "high"
                ? "alta"
                : goal.priority === "medium"
                  ? "média"
                  : "baixa"}
            </p>
            <p className="text-2xl font-semibold mt-1">
              {formatBRL(goal.currentAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatBRL(goal.targetAmount)} · {Math.round(pct)}%
            </p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: goal.color }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Stat label="Falta" value={formatBRL(remaining)} />
          <Stat
            label="Aporte mensal"
            value={formatBRL(goal.monthlyContribution)}
          />
          <Stat label="Início" value={BR_DATE.format(goal.startDate)} />
          <Stat label="Prazo" value={BR_DATE.format(goal.estimatedEndDate)} />
        </div>

        {monthsLeft !== null ? (
          <p className="text-xs text-muted-foreground">
            {monthsLeft === 0
              ? "🎉 Meta atingida — registre como concluída."
              : `No ritmo atual, você atinge em ${monthsLeft} ${monthsLeft === 1 ? "mês" : "meses"}.`}
          </p>
        ) : goal.monthlyContribution === 0 ? (
          <p className="text-xs text-muted-foreground">
            Defina um aporte mensal pra ver a previsão.
          </p>
        ) : null}

        {goal.status === "active" ? (
          <Link
            href={`/transactions/new?goalId=${goal.id}`}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Fazer aporte
          </Link>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Investimentos
          </h2>
          <Link
            href={`/goals/${id}/investments/new`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 h-8 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Adicionar
          </Link>
        </div>
        {activeInvestments.length === 0 && archivedInvestments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum investimento nessa meta. Cadastre um CDB, ação, fundo… pra
            acompanhar o rendimento mês a mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeInvestments.map((inv) => (
              <InvestmentRow key={inv.id} goalId={id} inv={inv} />
            ))}
          </ul>
        )}
        {archivedInvestments.length > 0 ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {archivedInvestments.length}{" "}
              {archivedInvestments.length === 1 ? "arquivado" : "arquivados"}
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {archivedInvestments.map((inv) => (
                <InvestmentRow key={inv.id} goalId={id} inv={inv} />
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Últimos aportes
        </h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aporte ainda. Clique em <strong>Fazer aporte</strong> pra
            começar.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.createdByName} · {BR_DATE.format(c.date)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary">
                  + {formatBRL(c.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Editar meta
        </h2>
        <GoalForm
          action={boundUpdate}
          submitLabel="Salvar alterações"
          initial={{
            name: goal.name,
            category: goal.category,
            priority: goal.priority,
            targetAmount: goal.targetAmount,
            monthlyContribution: goal.monthlyContribution,
            startDate: goal.startDate,
            estimatedEndDate: goal.estimatedEndDate,
          }}
        />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function InvestmentRow({
  goalId,
  inv,
}: {
  goalId: string;
  inv: Awaited<ReturnType<typeof listInvestments>>[number];
}) {
  const gain = inv.currentValue - inv.totalContributed;
  const gainPct =
    inv.totalContributed > 0 ? (gain / inv.totalContributed) * 100 : 0;
  const isPositive = gain >= 0;
  return (
    <li>
      <Link
        href={`/goals/${goalId}/investments/${inv.id}`}
        className={cn(
          "flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent",
          inv.archived ? "opacity-60" : "",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LineChart className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {inv.name}
            {inv.archived ? (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                arquivado
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {INVESTMENT_TYPE_LABELS[inv.type]}
            {inv.broker ? ` · ${inv.broker}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatBRL(inv.currentValue)}
          </p>
          {inv.totalContributed > 0 ? (
            <p
              className={cn(
                "flex items-center justify-end gap-1 text-[11px] tabular-nums",
                isPositive ? "text-primary" : "text-destructive",
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {isPositive ? "+" : ""}
              {formatBRL(gain)} ({gainPct.toFixed(1)}%)
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
