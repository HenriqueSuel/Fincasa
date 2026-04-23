import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getCard, listCardTransactions } from "@/lib/cards-query";
import { formatBRL, formatSignedBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/domain";

export const metadata: Metadata = { title: "Cartão" };

const INVOICES_AHEAD = 4;

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { householdId } = await requireHouseholdContext();
  const card = await getCard(householdId, id);
  if (!card) notFound();

  // Janela: do mês atual até INVOICES_AHEAD meses pra frente.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + INVOICES_AHEAD + 1,
    1,
  );
  const transactions = await listCardTransactions(householdId, id, from, to);

  // Agrupa por mês da `date` — que já é o mês de vencimento da fatura
  // (transaction.ts força effectiveDate = invoiceDate para crédito com cartão).
  const grouped = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = monthKey(t.date);
    const arr = grouped.get(key) ?? [];
    arr.push(t);
    grouped.set(key, arr);
  }

  const invoiceMonths = Array.from({ length: INVOICES_AHEAD + 1 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const items = grouped.get(monthKey(d)) ?? [];
    const total = items.reduce((s, t) => {
      return s + (t.type === "income" ? -t.amount : t.amount);
    }, 0);
    return { date: d, items, total };
  });

  const current = invoiceMonths[0]!;
  const upcoming = invoiceMonths.slice(1);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-32 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/settings/cards"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex items-center gap-3 flex-1">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
            style={
              card.color
                ? { backgroundColor: `${card.color}20`, color: card.color }
                : { backgroundColor: "var(--color-muted)" }
            }
          >
            <CreditCard className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Cartão</p>
            <h1 className="text-2xl font-semibold truncate">{card.name}</h1>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">
          Próxima fatura — {format(current.date, "MMMM yyyy", { locale: ptBR })}
        </p>
        <p className="text-3xl font-semibold mt-1 tabular-nums">
          {formatBRL(current.total)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {current.items.length === 0
            ? "Sem compras até agora."
            : `${current.items.length} ${current.items.length === 1 ? "lançamento" : "lançamentos"} · fecha dia ${card.closingDay} · vence dia ${card.dueDay}`}
        </p>
      </section>

      <InvoiceSection
        title={`Fatura atual · ${monthLabel(current.date)}`}
        items={current.items}
        total={current.total}
        empty="Nenhuma compra ainda nessa fatura."
        cardId={id}
        monthIndex={current.date.getMonth()}
        year={current.date.getFullYear()}
      />

      {upcoming.length > 0 && upcoming.some((i) => i.items.length > 0) ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Próximas faturas
          </h2>
          <div className="flex flex-col gap-4">
            {upcoming
              .filter((i) => i.items.length > 0)
              .map((invoice) => (
                <InvoiceSection
                  key={monthKey(invoice.date)}
                  title={monthLabel(invoice.date)}
                  items={invoice.items}
                  total={invoice.total}
                  empty="Sem lançamentos."
                  cardId={id}
                  monthIndex={invoice.date.getMonth()}
                  year={invoice.date.getFullYear()}
                  compact
                />
              ))}
          </div>
        </section>
      ) : null}

      <Link
        href={`/transactions?card=${id}`}
        className="text-center text-xs text-primary underline underline-offset-4"
      >
        Ver todas as transações do cartão
      </Link>
    </main>
  );
}

function InvoiceSection({
  title,
  items,
  total,
  empty,
  cardId,
  year,
  monthIndex,
  compact = false,
}: {
  title: string;
  items: Transaction[];
  total: number;
  empty: string;
  cardId: string;
  year: number;
  monthIndex: number;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2",
        compact ? "" : "",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground capitalize">
          {title}
        </h2>
        <Link
          href={`/transactions?card=${cardId}&y=${year}&m=${monthIndex}`}
          className="text-[11px] text-primary underline underline-offset-4"
        >
          abrir
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {t.description}
                  {t.installment ? (
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground align-middle">
                      {t.installment.number}/{t.installment.count}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(t.date, "dd 'de' MMM", { locale: ptBR })} ·{" "}
                  {t.subcategory}
                  {" · "}
                  {t.createdByName}
                </p>
              </div>
              <p
                className={
                  t.type === "income"
                    ? "text-sm font-semibold text-primary tabular-nums"
                    : "text-sm font-semibold text-foreground tabular-nums"
                }
              >
                {formatSignedBRL(t.amount, t.type)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 ? (
        <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold tabular-nums">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>
      ) : null}
    </section>
  );
}
