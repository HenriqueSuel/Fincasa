"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/money";
import { WEIGHT_UNITS, type WeightUnit } from "@/types/enums";
import { toggleCheck, updateCheckedPrice } from "@/app/actions/shopping";
import type { ShoppingItem, ShoppingListEntry } from "@/types/domain";

interface Props {
  item: ShoppingItem;
  entry: ShoppingListEntry;
}

export function MarkAsBoughtForm({ item, entry }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialWeight =
    entry.weightAtCheckout ??
    entry.desiredWeight ??
    item.defaultWeight ??
    null;
  const initialQty =
    entry.quantityAtCheckout ??
    entry.desiredQuantity ??
    item.defaultQuantity ??
    1;

  const [price, setPrice] = useState<number>(
    entry.priceAtCheckout ?? item.lastPrice ?? 0,
  );
  const [brand, setBrand] = useState<string>(
    entry.brandAtCheckout ?? entry.desiredBrand ?? item.defaultBrand ?? "",
  );
  const [weightValue, setWeightValue] = useState<number>(
    initialWeight?.value ?? 0,
  );
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    initialWeight?.unit ?? "kg",
  );
  const weightDecimals = weightUnit === "kg" || weightUnit === "L" ? 2 : 0;
  const [quantity, setQuantity] = useState<number>(initialQty);

  const isChecked = entry.status === "checked";
  const title = isChecked ? "Atualizar compra" : "Marcar como comprado";
  const submitLabel = isChecked ? "Salvar alterações" : "Marcar como comprado";

  const hint =
    item.averagePrice90d != null
      ? `Média 90 dias: ${formatBRL(item.averagePrice90d)}`
      : item.lastPrice != null
        ? `Última compra: ${formatBRL(item.lastPrice)}`
        : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!price || price <= 0) {
      toast.error("Informe o preço pago.");
      return;
    }
    const parsedWeight =
      weightValue > 0
        ? { value: weightValue, unit: weightUnit }
        : undefined;
    const parsedQty =
      Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    startTransition(async () => {
      const action = isChecked ? updateCheckedPrice : toggleCheck;
      const result = await action(entry.id, {
        price,
        brand: brand.trim() || undefined,
        weight: parsedWeight,
        quantity: parsedQty,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isChecked ? "Compra atualizada." : "Marcado como comprado.",
      );
      router.push("/shopping");
      router.refresh();
    });
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
      aria-labelledby="mark-as-bought-title"
    >
      <header className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="size-4" />
        </div>
        <div className="flex-1">
          <h2 id="mark-as-bought-title" className="text-sm font-semibold">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">
            Esse item está na sua lista. {hint}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mark-price">Preço pago</Label>
          <MoneyInput
            id="mark-price"
            value={price}
            onValueChange={setPrice}
            className="h-11 text-lg font-semibold"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mark-brand">Marca (opcional)</Label>
          <Input
            id="mark-brand"
            type="text"
            maxLength={60}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Kitano"
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mark-weight">Peso / volume</Label>
            <DecimalInput
              id="mark-weight"
              value={weightValue}
              onValueChange={setWeightValue}
              decimals={weightDecimals}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mark-weight-unit" className="opacity-0">
              Unid.
            </Label>
            <Select
              value={weightUnit}
              onValueChange={(v) => setWeightUnit(v as WeightUnit)}
            >
              <SelectTrigger id="mark-weight-unit" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mark-quantity">Qtd</Label>
            <Input
              id="mark-quantity"
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="w-20"
            />
          </div>
        </div>

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Salvando…" : submitLabel}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </section>
  );
}
