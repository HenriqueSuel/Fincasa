"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/money";
import type { TransactionInput } from "@/lib/validators";

export function InstallmentsField() {
  const form = useFormContext<TransactionInput>();
  const installments = form.watch("installments");
  const amount = form.watch("amount") ?? 0;

  const { perInstallment, firstInstallment } = useMemo(() => {
    if (installments <= 1 || !amount) {
      return { perInstallment: 0, firstInstallment: 0 };
    }
    const totalCents = Math.round(amount * 100);
    const base = Math.floor(totalCents / installments);
    const remainder = totalCents - base * installments;
    return {
      perInstallment: base / 100,
      firstInstallment: (base + remainder) / 100,
    };
  }, [amount, installments]);

  return (
    <FormField
      control={form.control}
      name="installments"
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="installments">Parcelas</FormLabel>
          <FormControl>
            <Select
              value={String(field.value ?? 1)}
              onValueChange={(v) => {
                field.onChange(Number(v));
                if (Number(v) > 1) form.setValue("recurring", false);
              }}
            >
              <SelectTrigger id="installments">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 1 ? "À vista" : `${n}x`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {installments > 1 && amount > 0 ? (
            <div className="rounded-xl border border-border bg-card p-3 text-xs">
              <p className="font-medium">
                {installments}x de {formatBRL(perInstallment)}
              </p>
              {firstInstallment !== perInstallment ? (
                <p className="text-muted-foreground mt-1">
                  Primeira parcela: {formatBRL(firstInstallment)} (absorve o
                  arredondamento)
                </p>
              ) : null}
              <p className="text-muted-foreground mt-1">
                Uma parcela em cada mês, a partir da data escolhida.
              </p>
            </div>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
