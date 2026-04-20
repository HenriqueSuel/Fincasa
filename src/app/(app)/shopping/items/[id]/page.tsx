import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import {
  getActiveEntryForItem,
  getShoppingItem,
  listItemPurchases,
} from "@/lib/shopping-query";
import { formatBRL } from "@/lib/money";
import { SHOPPING_SECTION_LABELS } from "@/types/enums";
import { ArchiveItemButton } from "./archive-item-button";
import { EditItemForm } from "./edit-item-form";
import { MarkAsBoughtForm } from "./mark-as-bought-form";

export const metadata: Metadata = { title: "Produto" };

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { householdId } = await requireHouseholdContext();
  const [item, purchases, activeEntry] = await Promise.all([
    getShoppingItem(householdId, id),
    listItemPurchases(householdId, id),
    getActiveEntryForItem(householdId, id),
  ]);
  if (!item) notFound();

  const backHref = activeEntry ? "/shopping" : "/shopping/items";

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="text-xs text-muted-foreground">
            {SHOPPING_SECTION_LABELS[item.section]} · {item.purchaseCount}{" "}
            compra{item.purchaseCount === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat
          label="Última"
          value={item.lastPrice ? formatBRL(item.lastPrice) : "—"}
        />
        <Stat
          label="Média 90d"
          value={
            item.averagePrice90d ? formatBRL(item.averagePrice90d) : "—"
          }
        />
        <Stat label="Compras" value={String(item.purchaseCount)} />
      </section>

      {activeEntry ? (
        <MarkAsBoughtForm item={item} entry={activeEntry} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Histórico
        </h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem compras registradas ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatBRL(p.price)}
                    {p.weight
                      ? ` · ${p.weight.value}${p.weight.unit}`
                      : ""}
                    {p.quantity > 1 ? ` × ${p.quantity}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {BR_DATE.format(p.purchasedAt)}
                    {p.brand ? ` · ${p.brand}` : ""}
                    {p.store ? ` · ${p.store}` : ""}
                    {" · "}
                    {p.purchasedByName}
                  </p>
                </div>
                {p.tripId ? (
                  <Link
                    href={`/shopping/trips/${p.tripId}`}
                    className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent"
                    aria-label="Ver compra"
                  >
                    <Receipt className="size-4" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Editar produto
        </h2>
        <EditItemForm item={item} />
      </section>

      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Zona de perigo
        </h2>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          {item.archived ? (
            <>
              <p className="text-sm font-medium">Produto arquivado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Não aparece no catálogo nem no autocomplete. O histórico
                continua visível. Se quiser remover definitivamente, use{" "}
                <strong>Apagar permanentemente</strong> abaixo.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Remover do catálogo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <strong>Arquivar</strong> esconde o produto do autocomplete e
                do catálogo, mas preserva as compras nas trips.{" "}
                <strong>Apagar permanentemente</strong> remove o produto e
                todo o histórico dele — as trips passadas vão mostrar menos
                itens do que antes.
              </p>
            </>
          )}
          <div className="mt-3">
            <ArchiveItemButton
              itemId={item.id}
              itemName={item.name}
              purchaseCount={item.purchaseCount}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
