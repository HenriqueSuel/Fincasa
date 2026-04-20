import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getLoan, listRepayments } from "@/lib/loans-query";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LoanDetailClient } from "./loan-detail-client";

export const metadata: Metadata = { title: "Empréstimo" };

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uid, householdId } = await requireHouseholdContext();
  const [loan, repayments] = await Promise.all([
    getLoan(householdId, id),
    listRepayments(householdId, id),
  ]);
  if (!loan) notFound();

  const isOwner = loan.createdBy === uid;
  const paidIds = new Set(repayments.map((r) => r.transactionId));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-32 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/loans"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Empréstimo</p>
          <h1 className="text-2xl font-semibold truncate">
            {loan.debtorName}
          </h1>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Falta receber</p>
            <p className="text-3xl font-semibold mt-1 tabular-nums">
              {formatBRL(loan.outstandingAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              de {formatBRL(loan.totalAmount)} · pago{" "}
              {formatBRL(loan.repaidAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {loan.status === "settled"
                ? "Quitado"
                : loan.status === "cancelled"
                  ? "Cancelado"
                  : "Em aberto"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {loan.installments > 1 ? `${loan.installments}x` : "À vista"} ·{" "}
              {PAYMENT_LABELS[loan.paymentMethod] ?? loan.paymentMethod}
            </p>
          </div>
        </div>
        {loan.description ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {loan.description}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Agenda
        </h2>
        <ul className="flex flex-col gap-1.5">
          {loan.schedule.map((s, i) => {
            const paid = paidIds.has(s.transactionId);
            return (
              <li
                key={s.transactionId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {loan.installments > 1
                      ? `Parcela ${i + 1}/${loan.installments}`
                      : "Cobrança única"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(s.dueDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    paid ? "text-muted-foreground line-through" : "",
                  )}
                >
                  {formatBRL(s.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pagamentos recebidos
        </h2>
        {repayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada recebido ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {repayments.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {format(r.paidAt, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    {r.paymentMethod
                      ? ` · ${PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod}`
                      : ""}
                  </p>
                  {r.note ? (
                    <p className="text-xs text-muted-foreground">{r.note}</p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-primary tabular-nums">
                  + {formatBRL(r.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LoanDetailClient
        loanId={loan.id}
        outstanding={loan.outstandingAmount}
        isOwner={isOwner}
        status={loan.status}
      />
    </main>
  );
}
