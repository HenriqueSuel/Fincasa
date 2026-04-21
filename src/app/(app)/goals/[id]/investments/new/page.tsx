import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getGoal } from "@/lib/goals-query";
import { NewInvestmentForm } from "./new-investment-form";

export const metadata: Metadata = { title: "Novo investimento" };

export default async function NewInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { householdId } = await requireHouseholdContext();
  const goal = await getGoal(householdId, id);
  if (!goal) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/goals/${id}`}
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{goal.name}</p>
          <h1 className="text-xl font-semibold">Novo investimento</h1>
        </div>
      </div>

      <NewInvestmentForm goalId={id} />
    </main>
  );
}
