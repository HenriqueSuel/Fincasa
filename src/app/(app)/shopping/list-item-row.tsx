"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { removeListItem, toggleCheck } from "@/app/actions/shopping";
import type { ShoppingListEntry } from "@/types/domain";

type OptimisticStatus = ShoppingListEntry["status"];

function describeWeight(w?: ShoppingListEntry["desiredWeight"]) {
  if (!w) return "";
  return `${w.value} ${w.unit}`;
}

export function ListItemRow({ entry }: { entry: ShoppingListEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Optimistic uncheck — feedback instantâneo.
  // Derivado como "override se diferente do prop"; limpa sozinho quando
  // o prop chega alinhado (evita useEffect + setState).
  const [optimisticStatus, setOptimisticStatus] =
    useState<OptimisticStatus | null>(null);
  const effectiveStatus =
    optimisticStatus && optimisticStatus !== entry.status
      ? optimisticStatus
      : entry.status;
  const bought = effectiveStatus === "bought";
  const checked = effectiveStatus === "checked";

  function handleUncheck() {
    if (bought) return;
    setOptimisticStatus("pending");
    startTransition(async () => {
      const result = await toggleCheck(entry.id, {});
      if (result.error) {
        toast.error(result.error);
        setOptimisticStatus(null);
        return;
      }
      setOptimisticStatus(null);
      router.refresh();
    });
  }

  function handleCheckboxClick() {
    if (bought) return;
    if (checked) {
      handleUncheck();
    } else {
      router.push(`/shopping/items/${entry.itemId}`);
    }
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeListItem(entry.id);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  const weightText = describeWeight(entry.desiredWeight);
  const qtyText =
    entry.desiredQuantity > 1 ? `${entry.desiredQuantity} un` : "";
  const metaParts = [weightText, qtyText].filter(Boolean).join(" · ");

  if (bought) {
    const qty = entry.quantityAtCheckout ?? 1;
    const unit = entry.priceAtCheckout ?? 0;
    const total = unit * qty;
    return (
      <li className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 opacity-60">
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary/20 text-[10px] text-primary"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/shopping/items/${entry.itemId}`}
            className="text-sm font-medium line-through hover:underline"
          >
            {entry.itemName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {[
              entry.brandAtCheckout,
              entry.weightAtCheckout
                ? `${entry.weightAtCheckout.value}${entry.weightAtCheckout.unit}`
                : null,
              qty > 1 ? `${formatBRL(unit)} × ${qty}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {unit > 0 ? (
          <p className="text-sm font-semibold tabular-nums">
            {formatBRL(total)}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={pending}
        onClick={handleCheckboxClick}
        aria-label={
          checked
            ? `Desmarcar ${entry.itemName}`
            : `Marcar ${entry.itemName} como comprado`
        }
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary",
        )}
      >
        {checked ? <span className="text-[10px] font-bold">✓</span> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/shopping/items/${entry.itemId}`}
            className="text-sm font-medium hover:underline"
          >
            {entry.itemName}
          </Link>
          {checked && entry.priceAtCheckout ? (
            <Link
              href={`/shopping/items/${entry.itemId}`}
              className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-primary hover:underline"
            >
              {formatBRL(
                entry.priceAtCheckout * (entry.quantityAtCheckout ?? 1),
              )}
              <Pencil className="size-3" />
            </Link>
          ) : entry.averagePrice90dSnapshot ? (
            <p className="shrink-0 text-xs text-muted-foreground">
              média {formatBRL(entry.averagePrice90dSnapshot)}
            </p>
          ) : entry.lastPriceSnapshot ? (
            <p className="shrink-0 text-xs text-muted-foreground">
              última {formatBRL(entry.lastPriceSnapshot)}
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {checked
            ? [
                entry.brandAtCheckout ?? entry.desiredBrand,
                (entry.quantityAtCheckout ?? 1) > 1 && entry.priceAtCheckout
                  ? `${formatBRL(entry.priceAtCheckout)} × ${entry.quantityAtCheckout}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || ""
            : metaParts || "sem histórico"}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        disabled={pending}
        aria-label={`Remover ${entry.itemName}`}
        className="size-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
