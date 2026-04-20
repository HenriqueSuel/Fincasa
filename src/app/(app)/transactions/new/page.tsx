import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { listGoals } from "@/lib/goals-query";
import { listCustomSubcategories } from "@/lib/subcategories-query";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { createTransaction } from "@/app/actions/transaction";

export const metadata: Metadata = { title: "Nova transação" };

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ goalId?: string }>;
}) {
  const { goalId } = await searchParams;
  const session = (await getSession())!;
  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data()!;
  const goals = await listGoals(user.currentHouseholdId, { activeOnly: true });
  const customSubcategories = await listCustomSubcategories(
    user.currentHouseholdId,
  );

  const preselectedGoal = goalId
    ? goals.find((g) => g.id === goalId)
    : undefined;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={preselectedGoal ? `/goals/${preselectedGoal.id}` : "/transactions"}
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">
          {preselectedGoal ? `Aporte — ${preselectedGoal.name}` : "Nova transação"}
        </h1>
      </div>

      <TransactionForm
        action={createTransaction}
        submitLabel={preselectedGoal ? "Lançar aporte" : "Lançar"}
        goals={goals.map((g) => ({ id: g.id, name: g.name, icon: g.icon }))}
        customSubcategories={customSubcategories}
        initial={
          preselectedGoal
            ? {
                type: "expense",
                category: "goals",
                subcategory: "Outras metas",
                goalId: preselectedGoal.id,
                description: `Aporte ${preselectedGoal.name}`,
              }
            : undefined
        }
      />
    </main>
  );
}
