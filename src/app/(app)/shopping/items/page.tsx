import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { listCatalog } from "@/lib/shopping-query";
import { formatBRL } from "@/lib/money";
import { SHOPPING_SECTION_LABELS } from "@/types/enums";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogPage() {
  const { householdId } = await requireHouseholdContext();
  const items = await listCatalog(householdId);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/shopping"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Catálogo</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} produto{items.length === 1 ? "" : "s"} já comprados
            pela família
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Quando você finalizar compras, os itens aparecem aqui com histórico
            de preço.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/shopping/items/${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SHOPPING_SECTION_LABELS[item.section]}
                    {item.defaultBrand ? ` · ${item.defaultBrand}` : ""}
                    {" · "}
                    {item.purchaseCount} compra
                    {item.purchaseCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  {item.averagePrice90d ? (
                    <p className="text-sm font-semibold tabular-nums">
                      {formatBRL(item.averagePrice90d)}
                    </p>
                  ) : item.lastPrice ? (
                    <p className="text-sm font-semibold tabular-nums">
                      {formatBRL(item.lastPrice)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {item.averagePrice90d ? "média 90d" : "última"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
