"use client";

import { useActionState, useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/goals";
import { formatBRL } from "@/lib/money";
import type { GoalFormState } from "@/app/actions/goal";

interface InitialValues {
  name?: string;
  category?: string;
  priority?: string;
  targetAmount?: number;
  monthlyContribution?: number;
  startDate?: Date;
  estimatedEndDate?: Date;
}

interface Props {
  action: (
    prev: GoalFormState | undefined,
    formData: FormData,
  ) => Promise<GoalFormState>;
  initial?: InitialValues;
  submitLabel?: string;
}

export function GoalForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [category, setCategory] = useState(initial?.category ?? "emergency");
  const [targetAmount, setTargetAmount] = useState<number>(
    initial?.targetAmount ?? 0,
  );
  const [monthlyContribution, setMonthlyContribution] = useState<number>(
    initial?.monthlyContribution ?? 0,
  );

  const estimatedMonths = useMemo(() => {
    if (monthlyContribution <= 0 || targetAmount <= 0) return null;
    return Math.ceil(targetAmount / monthlyContribution);
  }, [targetAmount, monthlyContribution]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="category" value={category} />

      <div className="flex flex-col gap-2">
        <Label>Tipo</Label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {GOAL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-xl border p-3 flex flex-col items-center gap-1 transition-colors",
                category === c.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Viagem Japão 2027"
          defaultValue={initial?.name ?? ""}
          required
          maxLength={60}
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetAmount">Meta</Label>
          <MoneyInput
            id="targetAmount"
            name="targetAmount"
            defaultValue={initial?.targetAmount}
            onValueChange={setTargetAmount}
            required
          />
          {state.fieldErrors?.targetAmount ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.targetAmount}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="monthlyContribution">Aporte mensal</Label>
          <MoneyInput
            id="monthlyContribution"
            name="monthlyContribution"
            defaultValue={initial?.monthlyContribution}
            onValueChange={setMonthlyContribution}
          />
          {state.fieldErrors?.monthlyContribution ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.monthlyContribution}
            </p>
          ) : null}
        </div>
      </div>

      {estimatedMonths !== null ? (
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Aportando {formatBRL(monthlyContribution)}/mês você atinge{" "}
          <span className="text-foreground font-medium">
            {formatBRL(targetAmount)}
          </span>{" "}
          em{" "}
          <span className="text-foreground font-medium">
            {estimatedMonths} {estimatedMonths === 1 ? "mês" : "meses"}
          </span>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Início</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={format(initial?.startDate ?? new Date(), "yyyy-MM-dd")}
            required
          />
          {state.fieldErrors?.startDate ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.startDate}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimatedEndDate">Prazo</Label>
          <Input
            id="estimatedEndDate"
            name="estimatedEndDate"
            type="date"
            defaultValue={format(
              initial?.estimatedEndDate ?? addMonths(new Date(), 12),
              "yyyy-MM-dd",
            )}
            required
          />
          {state.fieldErrors?.estimatedEndDate ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.estimatedEndDate}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="priority">Prioridade</Label>
        <Select name="priority" defaultValue={initial?.priority ?? "medium"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_PRIORITIES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? "Salvando…" : (submitLabel ?? "Criar meta")}
      </Button>
    </form>
  );
}
