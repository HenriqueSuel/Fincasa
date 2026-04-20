import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listCards } from "@/lib/cards-query";
import { CardsClient } from "./cards-client";

export const metadata: Metadata = { title: "Cartões" };

export default async function CardsPage() {
  const { householdId } = await requireHouseholdContext();
  const cards = await listCards(householdId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre os cartões que usa pra compras parceladas. As parcelas
            vão respeitar o dia de fechamento e cair na fatura certa.
          </p>
        </div>
      </header>

      <CardsClient cards={cards} />
    </main>
  );
}
