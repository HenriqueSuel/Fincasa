"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { TransactionInput } from "@/lib/validators";

export function TypeToggle() {
  const form = useFormContext<TransactionInput>();
  const type = form.watch("type");

  function setType(next: "expense" | "income") {
    form.setValue("type", next, { shouldDirty: true });
    form.setValue("subcategory", "");
    form.setValue("goalId", undefined);
    form.setValue("paymentMethod", undefined);
    form.setValue("installments", 1);
    form.setValue("recurring", false);
    form.setValue(
      "category",
      next === "income" ? "income" : "essentials",
      { shouldDirty: true },
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Tipo de lançamento"
      className="grid grid-cols-2 gap-2 rounded-full border border-border bg-card p-1"
    >
      <Tab
        active={type === "expense"}
        onClick={() => setType("expense")}
        color="text-destructive"
      >
        Despesa
      </Tab>
      <Tab
        active={type === "income"}
        onClick={() => setType("income")}
        color="text-primary"
      >
        Receita
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full text-sm font-medium transition-colors",
        active
          ? cn("bg-background shadow-sm", color)
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
