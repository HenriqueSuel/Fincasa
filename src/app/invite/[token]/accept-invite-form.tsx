"use client";

import { useTransition } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";
import {
  acceptInviteSchema,
  type AcceptInviteInput,
} from "@/lib/validators";
import { acceptInvite } from "@/app/actions/invite";

export function AcceptInviteForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema) as Resolver<AcceptInviteInput>,
    defaultValues: { monthlyIncome: 0 },
  });

  async function onSubmit(values: AcceptInviteInput) {
    const fd = new FormData();
    fd.set("monthlyIncome", String(values.monthlyIncome));
    startTransition(async () => {
      const result = await acceptInvite(token, undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof AcceptInviteInput, { message: msg });
        }
      }
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="monthlyIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="monthlyIncome">Sua renda mensal</FormLabel>
              <FormControl>
                <MoneyInput
                  id="monthlyIncome"
                  value={field.value ?? 0}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  required
                />
              </FormControl>
              <FormDescription>
                Somada à renda do outro membro pra calcular o orçamento da
                família.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Entrando…" : "Aceitar e entrar"}
        </Button>
      </form>
    </FormProvider>
  );
}
