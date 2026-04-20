"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import type { TransactionInput } from "@/lib/validators";

export function RecurringToggle() {
  const form = useFormContext<TransactionInput>();

  return (
    <FormField
      control={form.control}
      name="recurring"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                field.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-5 items-center justify-center rounded border text-xs font-bold",
                  field.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
                aria-hidden
              >
                {field.value ? "✓" : ""}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Repetir todo mês</p>
                <p className="text-xs text-muted-foreground">
                  {field.value
                    ? "Serão criadas 12 ocorrências futuras. Você pode apagar todas depois."
                    : "Útil pra Netflix, aluguel, salário — tudo que cai mensalmente."}
                </p>
              </div>
            </button>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
