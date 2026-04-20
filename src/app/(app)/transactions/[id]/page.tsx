import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { toTransaction } from "@/lib/firebase/converters";
import { listGoals } from "@/lib/goals-query";
import { listCustomSubcategories } from "@/lib/subcategories-query";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { updateTransaction } from "@/app/actions/transaction";
import { formatBRL } from "@/lib/money";
import { DeleteTransactionButton } from "./delete-button";
import { DeleteInstallmentGroupButton } from "./delete-group-button";
import { DeleteRecurringGroupButton } from "./delete-recurring-button";

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
  const [goals, customSubcategories] = await Promise.all([
    listGoals(householdId, { activeOnly: true }),
    listCustomSubcategories(householdId),
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
        }}
      />
    </main>
  );
}
