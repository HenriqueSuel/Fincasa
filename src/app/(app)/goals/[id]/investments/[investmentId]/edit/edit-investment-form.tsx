"use client";

import { useTransition } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateInvestmentMetaSchema,
  type UpdateInvestmentMetaInput,
} from "@/lib/validators";
import { updateInvestment } from "@/app/actions/investment";
import {
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_LABELS,
  type InvestmentType,
} from "@/types/enums";

interface Props {
  goalId: string;
  investmentId: string;
  initial: {
    name: string;
    type: InvestmentType;
    broker?: string;
  };
}

export function EditInvestmentForm({ goalId, investmentId, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateInvestmentMetaInput>({
    resolver: zodResolver(
      updateInvestmentMetaSchema,
    ) as Resolver<UpdateInvestmentMetaInput>,
    defaultValues: {
      name: initial.name,
      type: initial.type,
      broker: initial.broker,
    },
  });

  function onSubmit(values: UpdateInvestmentMetaInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("type", values.type);
    if (values.broker) fd.set("broker", values.broker);

    startTransition(async () => {
      const result = await updateInvestment(
        goalId,
        investmentId,
        undefined,
        fd,
      );
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof UpdateInvestmentMetaInput, {
            message: msg,
          });
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
                <FormLabel htmlFor="broker">Corretora</FormLabel>
                <FormControl>
                  <Input
                    id="broker"
                    type="text"
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

        <p className="text-xs text-muted-foreground">
          Pra editar valores cadastrados (aporte, atualização), volte e use o
          menu &quot;⋯&quot; do evento no histórico.
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </FormProvider>
  );
}
