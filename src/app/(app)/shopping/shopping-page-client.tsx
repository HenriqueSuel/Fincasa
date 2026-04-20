"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/money";
import { SHOPPING_SECTION_LABELS, type ShoppingSection } from "@/types/enums";
import type { ShoppingItem, ShoppingListEntry } from "@/types/domain";
import { AddItemInput } from "./add-item-input";
import { ListItemRow } from "./list-item-row";
import { RecordPurchaseDialog } from "./record-purchase-dialog";

const SECTION_ORDER: ShoppingSection[] = [
  "frutas_verduras",
  "padaria",
  "carnes_peixes",
  "frios_laticinios",
  "mercearia",
  "bebidas",
  "congelados",
  "limpeza",
  "higiene",
  "outros",
];

interface Props {
  catalog: ShoppingItem[];
  entries: ShoppingListEntry[];
  storeSuggestions: string[];
}

export function ShoppingPageClient({
  catalog,
  entries,
  storeSuggestions,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { pending, checked, bought, checkedTotal } = useMemo(() => {
    const pending: ShoppingListEntry[] = [];
    const checked: ShoppingListEntry[] = [];
    const bought: ShoppingListEntry[] = [];
    for (const e of entries) {
      if (e.status === "pending") pending.push(e);
      else if (e.status === "checked") checked.push(e);
      else bought.push(e);
    }
    const checkedTotal = checked.reduce(
      (s, e) => s + (e.priceAtCheckout ?? 0) * (e.quantityAtCheckout ?? 1),
      0,
    );
    return { pending, checked, bought, checkedTotal };
  }, [entries]);

  const grouped = useMemo(() => {
    const map = new Map<ShoppingSection, ShoppingListEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.itemSection) ?? [];
      arr.push(e);
      map.set(e.itemSection, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const order = { pending: 0, checked: 1, bought: 2 } as const;
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return a.addedAt.getTime() - b.addedAt.getTime();
      });
    }
    return SECTION_ORDER.flatMap((section) => {
      const items = map.get(section);
      return items && items.length > 0
        ? [{ section, items } as const]
        : [];
    });
  }, [entries]);

  const isEmpty = entries.length === 0;
  const hasCheckedOnly = checked.length > 0 && pending.length === 0;
  const hasBothStates = checked.length > 0 && pending.length > 0;
  const canAct = hasCheckedOnly || hasBothStates;
  const isFinal = hasCheckedOnly;

  return (
    <>
      <AddItemInput catalog={catalog} />

      {isEmpty ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sua lista está vazia. Digite o primeiro item acima pra começar.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {grouped.map(({ section, items }) => (
            <section key={section} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {SHOPPING_SECTION_LABELS[section]}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {items.map((entry) => (
                  <ListItemRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canAct ? (
        <div className="sticky bottom-24 z-30 mt-6">
          <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-card/95 p-2 pl-4 shadow-lg backdrop-blur">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {checked.length}{" "}
                {checked.length === 1 ? "marcado" : "marcados"}
                {pending.length > 0
                  ? ` · ${pending.length} pendente${pending.length === 1 ? "" : "s"}`
                  : ""}
              </p>
              <p className="truncate text-sm font-semibold tabular-nums">
                {formatBRL(checkedTotal)}
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="lg">
              {isFinal ? "Finalizar" : `Comprei ${checked.length}`}
            </Button>
          </div>
        </div>
      ) : null}

      {bought.length > 0 && pending.length === 0 && checked.length === 0 ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Todos os itens foram comprados. A lista será limpa automaticamente.
        </p>
      ) : null}

      <RecordPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entries={checked}
        storeSuggestions={storeSuggestions}
        isFinal={isFinal}
      />
    </>
  );
}
