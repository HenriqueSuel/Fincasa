import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import {
  listCatalog,
  listShoppingList,
  listStoreNames,
} from "@/lib/shopping-query";
import { ShoppingPageClient } from "./shopping-page-client";

export const metadata: Metadata = { title: "Lista de mercado" };

export default async function ShoppingPage() {
  const { householdId } = await requireHouseholdContext();

  const [catalog, entries, storeSuggestions] = await Promise.all([
    listCatalog(householdId),
    listShoppingList(householdId),
    listStoreNames(householdId),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8 pb-32 max-w-2xl w-full mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Lista de mercado</h1>
        </div>
        <Link
          href="/shopping/items"
          className="text-xs text-primary underline underline-offset-4"
        >
          Catálogo
        </Link>
      </header>

      <ShoppingPageClient
        catalog={catalog}
        entries={entries}
        storeSuggestions={storeSuggestions}
      />
    </main>
  );
}
