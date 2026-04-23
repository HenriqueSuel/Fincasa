"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { migrateInvestmentTransactions } from "@/app/actions/investment";

export function MigrateInvestmentsClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    migrated: number;
    skipped: number;
  } | null>(null);

  function handleRun() {
    startTransition(async () => {
      try {
        const r = await migrateInvestmentTransactions();
        setResult(r);
        if (r.migrated > 0) {
          toast.success(
            `${r.migrated} ${r.migrated === 1 ? "transação convertida" : "transações convertidas"}.`,
          );
        } else {
          toast.info("Nada pra migrar.");
        }
        router.refresh();
      } catch (e) {
        toast.error("Falha ao migrar.");
        console.error(e);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        onClick={handleRun}
        disabled={pending}
      >
        {pending ? "Migrando…" : "Rodar migração"}
      </Button>

      {result ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p>
            <b>{result.migrated}</b>{" "}
            {result.migrated === 1 ? "transação migrada" : "transações migradas"}.
          </p>
          <p className="text-muted-foreground mt-1">
            {result.skipped}{" "}
            {result.skipped === 1
              ? "já estava no novo formato"
              : "já estavam no novo formato"}
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
