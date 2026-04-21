import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getLoan } from "@/lib/loans-query";
import { EditLoanForm } from "./edit-loan-form";

export const metadata: Metadata = { title: "Editar empréstimo" };

export default async function EditLoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uid, householdId } = await requireHouseholdContext();
  const loan = await getLoan(householdId, id);
  if (!loan) notFound();
  if (loan.createdBy !== uid) redirect(`/loans/${id}`);
  if (loan.status === "cancelled") redirect(`/loans/${id}`);

  const hasRepayments = loan.repaidAmount > 0;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/loans/${id}`}
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Editar empréstimo</h1>
      </div>

      <EditLoanForm
        loanId={loan.id}
        initial={{
          debtorName: loan.debtorName,
          totalAmount: loan.totalAmount,
          lendDate: loan.lendDate,
          description: loan.description,
        }}
        hasRepayments={hasRepayments}
      />
    </main>
  );
}
