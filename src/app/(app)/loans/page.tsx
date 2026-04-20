import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HandCoins, Plus } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listLoans } from "@/lib/loans-query";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Empréstimos" };

const statusLabel = {
  active: "Ativo",
  settled: "Pago",
  cancelled: "Cancelado",
} as const;

export default async function LoansPage() {
  const { householdId } = await requireHouseholdContext();
  const loans = await listLoans(householdId);

  const active = loans.filter((l) => l.status === "active");
  const settled = loans.filter((l) => l.status === "settled");

  const totalOutstanding = active.reduce(
    (s, l) => s + l.outstandingAmount,
    0,
  );
  const debtors = new Set(active.map((l) => l.debtorNameLower));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-32 max-w-2xl w-full mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Empréstimos</h1>
        </div>
        <Link
          href="/loans/new"
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo
        </Link>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Te devem agora</p>
        <p className="text-3xl font-semibold mt-1 tabular-nums">
          {formatBRL(totalOutstanding)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {debtors.size === 0
            ? "Ninguém te deve nada no momento."
            : `${debtors.size} ${debtors.size === 1 ? "pessoa" : "pessoas"} · ${active.length} ${active.length === 1 ? "empréstimo ativo" : "empréstimos ativos"}`}
        </p>
      </section>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HandCoins className="size-5" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Sem empréstimos ativos. Registre o primeiro pra começar a acompanhar.
          </p>
          <Link
            href="/loans/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
          >
            <Plus className="size-3.5" />
            Registrar empréstimo
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ativos
          </h2>
          <ul className="flex flex-col gap-2">
            {active.map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))}
          </ul>
        </section>
      )}

      {settled.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pagos
          </h2>
          <ul className="flex flex-col gap-2">
            {settled.slice(0, 10).map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function LoanRow({
  loan,
}: {
  loan: Awaited<ReturnType<typeof listLoans>>[number];
}) {
  const pct =
    loan.totalAmount > 0
      ? Math.min(100, (loan.repaidAmount / loan.totalAmount) * 100)
      : 0;
  return (
    <li>
      <Link
        href={`/loans/${loan.id}`}
        className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {loan.debtorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{loan.debtorName}</p>
            <p className="text-xs text-muted-foreground">
              {loan.installments > 1
                ? `${loan.installments}x · ${formatBRL(loan.totalAmount)}`
                : formatBRL(loan.totalAmount)}
              {loan.description ? ` · ${loan.description}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                loan.status === "settled"
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
            >
              {formatBRL(loan.outstandingAmount)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {statusLabel[loan.status]}
            </p>
          </div>
        </div>
        {loan.status === "active" ? (
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}
