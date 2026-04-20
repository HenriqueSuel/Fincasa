"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { createHousehold } from "@/app/actions/household";

export function CreateHouseholdForm() {
  const [state, formAction, isPending] = useActionState(createHousehold, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da família</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Casa Silva"
          required
          maxLength={60}
          autoComplete="off"
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="monthlyIncome">Sua renda mensal</Label>
        <MoneyInput id="monthlyIncome" name="monthlyIncome" required />
        {state.fieldErrors?.monthlyIncome ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.monthlyIncome}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Usada pra calcular o orçamento 40/15/45. Pode editar depois.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? "Criando…" : "Criar família"}
      </Button>
    </form>
  );
}
