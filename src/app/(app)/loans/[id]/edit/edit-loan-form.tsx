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
import { toLocalDateKey } from "@/lib/dates";
import { updateLoanSchema, type UpdateLoanInput } from "@/lib/validators";
import { updateLoan } from "@/app/actions/loan";

interface Props {
  loanId: string;
  initial: {
    debtorName: string;
    totalAmount: number;
    lendDate: Date;
    description?: string;
  };
  hasRepayments: boolean;
}

export function EditLoanForm({ loanId, initial, hasRepayments }: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateLoanInput>({
    resolver: zodResolver(updateLoanSchema) as Resolver<UpdateLoanInput>,
    defaultValues: {
      debtorName: initial.debtorName,
      totalAmount: initial.totalAmount,
      lendDate: initial.lendDate,
      description: initial.description,
    },
  });

  function onSubmit(values: UpdateLoanInput) {
    const fd = new FormData();
    fd.set("debtorName", values.debtorName);
    fd.set("totalAmount", String(values.totalAmount));
    fd.set("lendDate", toLocalDateKey(values.lendDate));
    if (values.description) fd.set("description", values.description);

    startTransition(async () => {
      const result = await updateLoan(loanId, undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof UpdateLoanInput, { message: msg });
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
        {hasRepayments ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Este empréstimo já tem pagamentos registrados. Só dá pra mudar
            nome e descrição — pra editar valor ou data, apague os pagamentos
            primeiro.
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="debtorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="debtorName">Quem pegou emprestado</FormLabel>
              <FormControl>
                <Input
                  id="debtorName"
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

        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="totalAmount">Valor emprestado</FormLabel>
              <FormControl>
                <MoneyInput
                  id="totalAmount"
                  value={field.value ?? 0}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={hasRepayments}
                  className="h-11 text-lg font-semibold"
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lendDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="lendDate">Data</FormLabel>
              <FormControl>
                <Input
                  id="lendDate"
                  type="date"
                  disabled={hasRepayments}
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="description">Descrição (opcional)</FormLabel>
              <FormControl>
                <Input
                  id="description"
                  type="text"
                  maxLength={120}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          Pagamento, parcelas e cartão não podem ser editados. Pra mudar
          esses, apague e crie de novo.
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </FormProvider>
  );
}
