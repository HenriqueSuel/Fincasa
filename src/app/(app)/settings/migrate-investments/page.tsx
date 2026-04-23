import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MigrateInvestmentsClient } from "./migrate-client";

export const metadata: Metadata = { title: "Migrar investimentos" };

export default function MigrateInvestmentsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Migrar investimentos</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-2">
        <p>
          Antes a gente registrava aportes como{" "}
          <span className="text-foreground">despesa</span> e resgates como{" "}
          <span className="text-foreground">receita</span>. Agora investimento
          tem um tipo próprio que não entra em saídas/entradas.
        </p>
        <p>
          Essa ação varre as transações já criadas que estão vinculadas a um
          investimento e converte pro novo formato. É <b>idempotente</b> — pode
          rodar várias vezes sem estragar nada.
        </p>
      </div>

      <MigrateInvestmentsClient />
    </main>
  );
}
