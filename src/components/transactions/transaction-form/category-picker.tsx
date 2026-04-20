"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { TransactionInput } from "@/lib/validators";

export function CategoryPicker() {
  const form = useFormContext<TransactionInput>();

  return (
    <FormField
      control={form.control}
      name="category"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Categoria</FormLabel>
          <FormControl>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const selected = field.value === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      field.onChange(c.id);
                      form.setValue("subcategory", "");
                      if (c.id !== "goals") {
                        form.setValue("goalId", undefined);
                      }
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      {Math.round(c.allocation * 100)}%
                    </p>
                    <p className="text-sm font-medium mt-0.5">{c.label}</p>
                  </button>
                );
              })}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
