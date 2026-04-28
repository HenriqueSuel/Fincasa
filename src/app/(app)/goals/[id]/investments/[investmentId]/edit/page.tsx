import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getInvestment } from "@/lib/investments-query";
import { EditInvestmentForm } from "./edit-investment-form";

export const metadata: Metadata = { title: "Editar investimento" };

export default async function EditInvestmentPage({
  params,
}: {
  params: Promise<{ id: string; investmentId: string }>;
}) {
  const { id: goalId, investmentId } = await params;
  const { householdId } = await requireHouseholdContext();
  const inv = await getInvestment(householdId, goalId, investmentId);
  if (!inv) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/goals/${goalId}/investments/${investmentId}`}
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Editar investimento</h1>
      </div>

      <EditInvestmentForm
        goalId={goalId}
        investmentId={investmentId}
        initial={{
          name: inv.name,
          type: inv.type,
          broker: inv.broker,
        }}
      />
    </main>
  );
}
