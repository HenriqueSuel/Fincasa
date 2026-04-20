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
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { householdSchema, type HouseholdInput } from "@/lib/validators";
import { createHousehold } from "@/app/actions/household";

export function CreateHouseholdForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<HouseholdInput>({
    resolver: zodResolver(householdSchema) as Resolver<HouseholdInput>,
    defaultValues: { name: "", monthlyIncome: 0 },
  });

  async function onSubmit(values: HouseholdInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("monthlyIncome", String(values.monthlyIncome));
    startTransition(async () => {
      const result = await createHousehold(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof HouseholdInput, { message: msg });
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="name">Nome da família</FormLabel>
              <FormControl>
                <Input
                  id="name"
                  type="text"
                  placeholder="Casa Silva"
                  maxLength={60}
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Usada pra calcular o orçamento 40/15/45. Pode editar depois.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Criando…" : "Criar família"}
        </Button>
      </form>
    </FormProvider>
  );
}
