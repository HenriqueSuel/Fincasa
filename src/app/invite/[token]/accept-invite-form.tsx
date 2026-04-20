"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { acceptInvite } from "@/app/actions/invite";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptInvite.bind(null, token),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="monthlyIncome">Sua renda mensal</Label>
        <MoneyInput id="monthlyIncome" name="monthlyIncome" required />
        {state.fieldErrors?.monthlyIncome ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.monthlyIncome}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Somada à renda do outro membro pra calcular o orçamento da família.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? "Entrando…" : "Aceitar e entrar"}
      </Button>
    </form>
  );
}
