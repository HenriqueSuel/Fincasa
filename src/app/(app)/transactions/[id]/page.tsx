import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
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

  const ref = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(id);
  const snap = await ref.get();
  const tx = snap.data();
  if (!tx) notFound();
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

      {tx.installmentNumber && tx.installmentCount && tx.installmentId ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">
            Parcela {tx.installmentNumber} de {tx.installmentCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Compra parcelada no crédito · total{" "}
            {formatBRL(tx.installmentTotal ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Editar aqui altera só esta parcela.
          </p>
          <DeleteInstallmentGroupButton
            installmentId={tx.installmentId as string}
            installmentCount={tx.installmentCount as number}
          />
        </div>
      ) : null}

      {tx.recurringId ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">
            Ocorrência {(tx.recurringIndex ?? 0) + 1} de{" "}
            {tx.recurringTotal ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Transação recorrente (mensal).
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Editar aqui altera só esta ocorrência.
          </p>
          <DeleteRecurringGroupButton
            recurringId={tx.recurringId as string}
            total={(tx.recurringTotal as number) ?? 0}
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
          date: (tx.date as Timestamp).toDate(),
          paymentMethod: tx.paymentMethod,
        }}
      />
    </main>
  );
}
