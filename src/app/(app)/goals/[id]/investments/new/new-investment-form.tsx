"use client";

import { useTransition } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toLocalDateKey } from "@/lib/dates";
import { investmentSchema, type InvestmentInput } from "@/lib/validators";
import { createInvestment } from "@/app/actions/investment";
import {
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_LABELS,
} from "@/types/enums";

export function NewInvestmentForm({ goalId }: { goalId: string }) {
  const [pending, startTransition] = useTransition();

  const form = useForm<InvestmentInput>({
    resolver: zodResolver(investmentSchema) as Resolver<InvestmentInput>,
    defaultValues: {
      name: "",
      type: "cdb",
      broker: undefined,
      initialAmount: 0,
      startDate: new Date(),
    },
  });

  function onSubmit(values: InvestmentInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("type", values.type);
    if (values.broker) fd.set("broker", values.broker);
    fd.set("initialAmount", String(values.initialAmount));
    fd.set("startDate", toLocalDateKey(values.startDate));

    startTransition(async () => {
      const result = await createInvestment(goalId, undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof InvestmentInput, { message: msg });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
      }
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
              <FormLabel htmlFor="name">Nome</FormLabel>
              <FormControl>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: CDB Nubank 110%"
                  maxLength={60}
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="type">Tipo</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {INVESTMENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="broker"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="broker">Corretora (opcional)</FormLabel>
                <FormControl>
                  <Input
                    id="broker"
                    type="text"
                    placeholder="XP, Clear…"
                    maxLength={40}
                    autoComplete="off"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="initialAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="initialAmount">Aporte inicial</FormLabel>
              <FormControl>
                <MoneyInput
                  id="initialAmount"
                  value={field.value ?? 0}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  className="h-11 text-lg font-semibold"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="startDate">Data do aporte</FormLabel>
              <FormControl>
                <Input
                  id="startDate"
                  type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    if (y && m && d) field.onChange(new Date(y, m - 1, d));
                  }}
                  onBlur={field.onBlur}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          O aporte inicial vira despesa em{" "}
          <span className="text-foreground">Objetivos · Aporte</span> e entra
          na posição da meta. Você pode registrar novos aportes e atualizar o
          valor depois.
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Criando…" : "Criar investimento"}
        </Button>
      </form>
    </FormProvider>
  );
}
