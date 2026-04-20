import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalForm } from "@/components/goals/goal-form";
import { createGoal } from "@/app/actions/goal";

export const metadata: Metadata = { title: "Nova meta" };

export default function NewGoalPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/goals"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Nova meta</h1>
      </div>

      <GoalForm action={createGoal} submitLabel="Criar meta" />
    </main>
  );
}
