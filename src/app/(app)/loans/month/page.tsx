import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, HandCoins } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listLoans, listRepayments } from "@/lib/loans-query";
import { monthRange } from "@/lib/transactions-query";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = { title: "Empréstimos do mês" };

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

interface PersonBucket {
  debtorName: string;
  loanId: string;
  dueAmount: number;
  paidAmount: number;
  entryCount: number;
  paidCount: number;
}

export default async function LoansMonthPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y: rawY, m: rawM } = await searchParams;
  const { householdId } = await requireHouseholdContext();

  const now = new Date();
  const year = rawY ? Number(rawY) : now.getFullYear();
  const monthIndex = rawM ? Number(rawM) : now.getMonth();
  const { from, to } = monthRange(year, monthIndex);

  const loans = await listLoans(householdId);
  const relevant = loans.filter((l) => l.status !== "cancelled");

  const repaymentsByLoan = await Promise.all(
    relevant.map((l) => listRepayments(householdId, l.id)),
  );
  const paidTxIds = new Set<string>();
  for (const list of repaymentsByLoan) {
    for (const r of list) paidTxIds.add(r.transactionId);
  }

  const buckets = new Map<string, PersonBucket>();
  for (const loan of relevant) {
    for (const entry of loan.schedule) {
      if (entry.dueDate < from || entry.dueDate >= to) continue;
      const key = `${loan.debtorNameLower}::${loan.id}`;
      const paid = paidTxIds.has(entry.transactionId);
      const b = buckets.get(key) ?? {
        debtorName: loan.debtorName,
        loanId: loan.id,
        dueAmount: 0,
        paidAmount: 0,
        entryCount: 0,
        paidCount: 0,
      };
      b.entryCount += 1;
      if (paid) {
        b.paidCount += 1;
        b.paidAmount += entry.amount;
      } else {
        b.dueAmount += entry.amount;
      }
      buckets.set(key, b);
    }
  }

  // Groupar por pessoa (somando todos os empréstimos dela no mês)
  const byPerson = new Map<
    string,
    {
      debtorName: string;
      dueAmount: number;
      paidAmount: number;
      entries: PersonBucket[];
    }
  >();
  for (const b of buckets.values()) {
    const key = b.debtorName.toLowerCase();
    const p = byPerson.get(key) ?? {
      debtorName: b.debtorName,
      dueAmount: 0,
      paidAmount: 0,
      entries: [] as PersonBucket[],
    };
    p.dueAmount += b.dueAmount;
    p.paidAmount += b.paidAmount;
    p.entries.push(b);
    byPerson.set(key, p);
  }

  const personList = Array.from(byPerson.values()).sort(
    (a, b) => b.dueAmount - a.dueAmount,
  );
  const totalDue = personList.reduce((s, p) => s + p.dueAmount, 0);
  const totalPaid = personList.reduce((s, p) => s + p.paidAmount, 0);

  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;

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
        <h1 className="text-2xl font-semibold">Por pessoa no mês</h1>
      </header>

      <div className="flex items-center justify-between rounded-full border border-border bg-card px-2 h-10">
        <Link
          href={`/loans/month?y=${prevYear}&m=${prevMonth}`}
          className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-sm font-medium capitalize">
          {monthLabel(year, monthIndex)}
        </span>
        <Link
          href={`/loans/month?y=${nextYear}&m=${nextMonth}`}
          className="flex size-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">A receber nesse mês</p>
        <p className="text-3xl font-semibold mt-1 tabular-nums">
          {formatBRL(totalDue)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {personList.length === 0
            ? "Ninguém te deve nada nesse mês."
            : `${personList.length} ${personList.length === 1 ? "pessoa" : "pessoas"}${
                totalPaid > 0 ? ` · ${formatBRL(totalPaid)} já recebido` : ""
              }`}
        </p>
      </section>

      {personList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HandCoins className="size-5" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma parcela vence nesse mês.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {personList.map((p) => (
            <li
              key={p.debtorName.toLowerCase()}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {p.debtorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.debtorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.entries.reduce((s, e) => s + e.entryCount, 0)}{" "}
                    {p.entries.reduce((s, e) => s + e.entryCount, 0) === 1
                      ? "parcela"
                      : "parcelas"}
                    {p.paidAmount > 0
                      ? ` · ${formatBRL(p.paidAmount)} recebido`
                      : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {formatBRL(p.dueAmount)}
                </p>
              </div>
              {p.entries.length > 0 ? (
                <ul className="flex flex-col gap-1 pl-13">
                  {p.entries.map((e) => (
                    <li key={e.loanId}>
                      <Link
                        href={`/loans/${e.loanId}`}
                        className="flex items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="underline underline-offset-4">
                          Empréstimo · {e.entryCount}{" "}
                          {e.entryCount === 1 ? "parcela" : "parcelas"}
                          {e.paidCount > 0 ? ` (${e.paidCount} paga)` : ""}
                        </span>
                        <span className="tabular-nums">
                          {formatBRL(e.dueAmount)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
