import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listCards } from "@/lib/cards-query";
import { listDebtorSuggestions } from "@/lib/loans-query";
import { NewLoanForm } from "./new-loan-form";

export const metadata: Metadata = { title: "Novo empréstimo" };

export default async function NewLoanPage() {
  const { householdId } = await requireHouseholdContext();
  const [cards, debtorSuggestions] = await Promise.all([
    listCards(householdId),
    listDebtorSuggestions(householdId),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/loans"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Novo empréstimo</h1>
      </div>

      <NewLoanForm
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          closingDay: c.closingDay,
        }))}
        debtorSuggestions={debtorSuggestions}
      />
    </main>
  );
}
