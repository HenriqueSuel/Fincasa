import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getGoal } from "@/lib/goals-query";
import {
  getInvestment,
  listInvestmentEvents,
} from "@/lib/investments-query";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { INVESTMENT_TYPE_LABELS } from "@/types/enums";
import { InvestmentValueChart } from "@/components/charts/investment-value-chart";
import { InvestmentDetailClient } from "./investment-detail-client";
import { EventHistoryList } from "./event-history-list";

export const metadata: Metadata = { title: "Investimento" };

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; investmentId: string }>;
}) {
  const { id: goalId, investmentId } = await params;
  const { householdId } = await requireHouseholdContext();

  const [goal, inv, events] = await Promise.all([
    getGoal(householdId, goalId),
    getInvestment(householdId, goalId, investmentId),
    listInvestmentEvents(householdId, goalId, investmentId),
  ]);
  if (!goal || !inv) notFound();

  const gain = inv.currentValue - inv.totalContributed;
  const gainPct =
    inv.totalContributed > 0 ? (gain / inv.totalContributed) * 100 : 0;
  const isPositive = gain >= 0;
  const stale =
    !inv.archived &&
    Date.now() - inv.lastUpdatedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-32 max-w-2xl w-full mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/goals/${goalId}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{goal.name}</p>
            <h1 className="text-2xl font-semibold truncate">{inv.name}</h1>
          </div>
        </div>
        {!inv.archived ? (
          <Link
            href={`/goals/${goalId}/investments/${investmentId}/edit`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Editar investimento"
          >
            <Pencil className="size-4" />
          </Link>
        ) : null}
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Posição atual</p>
            <p className="text-3xl font-semibold mt-1 tabular-nums">
              {formatBRL(inv.currentValue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {INVESTMENT_TYPE_LABELS[inv.type]}
              {inv.broker ? ` · ${inv.broker}` : ""}
            </p>
            {inv.archived ? (
              <p className="text-[10px] mt-1 uppercase tracking-wide text-muted-foreground">
                Arquivado
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Aportado</p>
            <p className="text-sm font-semibold mt-0.5 tabular-nums">
              {formatBRL(inv.totalContributed)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Rendimento</p>
            {inv.totalContributed > 0 ? (
              <p
                className={cn(
                  "text-sm font-semibold mt-0.5 tabular-nums flex items-center gap-1",
                  isPositive ? "text-primary" : "text-destructive",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {isPositive ? "+" : ""}
                {formatBRL(gain)} ({gainPct.toFixed(2)}%)
              </p>
            ) : (
              <p className="text-sm font-semibold mt-0.5 text-muted-foreground">
                —
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            Última atualização: {format(inv.lastUpdatedAt, "dd/MM/yyyy HH:mm")}
          </span>
          {stale ? (
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
              atualizar
            </span>
          ) : null}
        </div>
      </section>

      <InvestmentDetailClient
        goalId={goalId}
        investmentId={investmentId}
        currentValue={inv.currentValue}
        archived={inv.archived}
      />

      {events.length >= 2 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evolução da posição
          </h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <InvestmentValueChart
              events={events.map((e) => ({
                type: e.type,
                date: e.date,
                amount: e.amount,
                newValue: e.newValue,
              }))}
            />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Histórico
        </h2>
        <EventHistoryList
          goalId={goalId}
          investmentId={investmentId}
          canEdit={!inv.archived}
          events={events.map((e) => ({
            id: e.id,
            type: e.type,
            amount: e.amount,
            previousValue: e.previousValue,
            newValue: e.newValue,
            date: e.date,
            note: e.note,
            createdByName: e.createdByName,
          }))}
        />
      </section>
    </main>
  );
}
