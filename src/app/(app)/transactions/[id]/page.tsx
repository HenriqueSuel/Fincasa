import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { toTransaction } from "@/lib/firebase/converters";
import { listGoals } from "@/lib/goals-query";
import { listCustomSubcategories } from "@/lib/subcategories-query";
import { listCards } from "@/lib/cards-query";
import { getTrip } from "@/lib/shopping-query";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { updateTransaction } from "@/app/actions/transaction";
import { formatBRL } from "@/lib/money";
import { DeleteTransactionButton } from "./delete-button";
import { DeleteInstallmentGroupButton } from "./delete-group-button";
import { DeleteRecurringGroupButton } from "./delete-recurring-button";

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const metadata: Metadata = { title: "Editar transação" };

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uid, householdId } = await requireHouseholdContext();

  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(id)
    .get();
  if (!snap.exists) notFound();

  const tx = toTransaction(snap);
  if (tx.createdBy !== uid) redirect("/transactions");

  const boundUpdate = updateTransaction.bind(null, id);
  const [goals, customSubcategories, cards, trip] = await Promise.all([
    listGoals(householdId, { activeOnly: true }),
    listCustomSubcategories(householdId),
    listCards(householdId),
    tx.tripId ? getTrip(householdId, tx.tripId) : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold">Editar transação</h1>
        </div>
        <DeleteTransactionButton id={id} />
      </div>

      {trip ? (
        <Link
          href={`/shopping/trips/${trip.id}`}
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingCart className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              Veio da lista de mercado
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {trip.storeName} · {trip.itemCount}{" "}
              {trip.itemCount === 1 ? "item" : "itens"} ·{" "}
              {BR_DATE.format(trip.purchasedAt)}
            </p>
          </div>
        </Link>
      ) : null}

      {tx.installment ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">
            Parcela {tx.installment.number} de {tx.installment.count}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Compra parcelada no crédito · total {formatBRL(tx.installment.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Editar aqui altera só esta parcela.
          </p>
          <DeleteInstallmentGroupButton
            installmentId={tx.installment.id}
            installmentCount={tx.installment.count}
          />
        </div>
      ) : null}

      {tx.recurring ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">
            Ocorrência {tx.recurring.index + 1} de {tx.recurring.total}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Transação recorrente (mensal).
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Editar aqui altera só esta ocorrência.
          </p>
          <DeleteRecurringGroupButton
            recurringId={tx.recurring.id}
            total={tx.recurring.total}
          />
        </div>
      ) : null}

      <TransactionForm
        action={boundUpdate}
        submitLabel="Salvar alterações"
        goals={goals.map((g) => ({ id: g.id, name: g.name, icon: g.icon }))}
        customSubcategories={customSubcategories}
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          closingDay: c.closingDay,
        }))}
        allowInstallments={false}
        initial={{
          type: tx.type === "income" ? "income" : "expense",
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          subcategory: tx.subcategory,
          customSubcategory: tx.customSubcategory,
          goalId: tx.goalId,
          date: tx.date,
          paymentMethod: tx.paymentMethod,
          cardId: tx.cardId,
        }}
      />
    </main>
  );
}
