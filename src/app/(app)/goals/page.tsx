import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { listGoals } from "@/lib/goals-query";
import { estimateMonthsRemaining } from "@/lib/goals";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Metas" };

export default async function GoalsPage() {
  const session = (await getSession())!;
  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data()!;
  const goals = await listGoals(user.currentHouseholdId);

  const active = goals.filter((g) => g.status === "active");
  const paused = goals.filter((g) => g.status === "paused");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-3xl w-full mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Metas</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {active.length} ativa{active.length === 1 ? "" : "s"} ·{" "}
            {completed.length} concluída{completed.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/goals/new"
          className="flex items-center gap-2 rounded-full bg-primary px-4 h-10 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nova
        </Link>
      </header>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma meta ainda. Crie a primeira pra começar a planejar o
            futuro financeiro da família.
          </p>
          <Link
            href="/goals/new"
            className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
          >
            <Plus className="size-4" />
            Criar meta
          </Link>
        </div>
      ) : (
        <>
          <Group title="Ativas" goals={active} emptyLabel="Nenhuma meta ativa" />
          {paused.length > 0 ? (
            <Group title="Pausadas" goals={paused} muted />
          ) : null}
          {completed.length > 0 ? (
            <Group title="Concluídas" goals={completed} muted />
          ) : null}
        </>
      )}
    </main>
  );
}

function Group({
  title,
  goals,
  emptyLabel,
  muted = false,
}: {
  title: string;
  goals: Awaited<ReturnType<typeof listGoals>>;
  emptyLabel?: string;
  muted?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {goals.length === 0 && emptyLabel ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {goals.map((g) => {
            const pct =
              g.targetAmount > 0
                ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
                : 0;
            const monthsLeft = estimateMonthsRemaining(
              g.currentAmount,
              g.targetAmount,
              g.monthlyContribution,
            );
            return (
              <li key={g.id}>
                <Link
                  href={`/goals/${g.id}`}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent",
                    muted ? "border-border opacity-70" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${g.color}20`, color: g.color }}
                    >
                      <span className="text-lg">{g.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(g.currentAmount)} de{" "}
                        {formatBRL(g.targetAmount)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{Math.round(pct)}%</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: g.color,
                      }}
                    />
                  </div>
                  {monthsLeft !== null && g.status === "active" ? (
                    <p className="text-xs text-muted-foreground">
                      {monthsLeft === 0
                        ? "Meta atingida 🎉"
                        : `≈ ${monthsLeft} ${monthsLeft === 1 ? "mês" : "meses"} no ritmo atual`}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
