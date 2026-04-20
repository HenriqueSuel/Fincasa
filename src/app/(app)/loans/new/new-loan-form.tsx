"use client";

import { useEffect, useState, useTransition, useRef } from "react";
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
import { formatBRL } from "@/lib/money";
import { loanSchema, type LoanInput } from "@/lib/validators";
import { createLoan } from "@/app/actions/loan";

export interface CardOption {
  id: string;
  name: string;
  closingDay: number;
}

interface Props {
  cards: CardOption[];
  debtorSuggestions: string[];
}

export function NewLoanForm({ cards, debtorSuggestions }: Props) {
  const [pending, startTransition] = useTransition();
  const [showDebtorList, setShowDebtorList] = useState(false);
  const debtorRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema) as Resolver<LoanInput>,
    defaultValues: {
      debtorName: "",
      totalAmount: 0,
      lendDate: new Date(),
      paymentMethod: "pix",
      cardId: undefined,
      installments: 1,
      description: undefined,
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const installments = form.watch("installments");
  const amount = form.watch("totalAmount") ?? 0;
  const debtorValue = form.watch("debtorName");

  const canInstall = paymentMethod === "credit";

  useEffect(() => {
    if (!canInstall) {
      if (installments > 1) form.setValue("installments", 1);
      form.setValue("cardId", undefined);
    }
  }, [canInstall, installments, form]);

  const filteredDebtors = debtorSuggestions.filter((s) =>
    s.toLowerCase().includes(debtorValue.trim().toLowerCase()),
  );

  const installmentAmount =
    installments > 1 && amount > 0
      ? Math.floor((amount * 100) / installments) / 100
      : 0;
  const installmentFirstAmount =
    installments > 1 && amount > 0
      ? Math.round(amount * 100 - installmentAmount * (installments - 1) * 100) /
        100
      : 0;

  function onSubmit(values: LoanInput) {
    const fd = new FormData();
    fd.set("debtorName", values.debtorName);
    fd.set("totalAmount", String(values.totalAmount));
    fd.set("lendDate", toLocalDateKey(values.lendDate));
    fd.set("paymentMethod", values.paymentMethod);
    if (values.cardId) fd.set("cardId", values.cardId);
    fd.set("installments", String(values.installments));
    if (values.description) fd.set("description", values.description);

    startTransition(async () => {
      const result = await createLoan(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof LoanInput, { message: msg });
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
          name="debtorName"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel htmlFor="debtorName">Quem pegou emprestado</FormLabel>
              <FormControl>
                <Input
                  id="debtorName"
                  type="text"
                  placeholder="Ex: Lucas"
                  autoComplete="off"
                  maxLength={60}
                  ref={debtorRef}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    setShowDebtorList(true);
                  }}
                  onFocus={() => setShowDebtorList(true)}
                  onBlur={() =>
                    setTimeout(() => setShowDebtorList(false), 120)
                  }
                />
              </FormControl>
              {showDebtorList && filteredDebtors.length > 0 ? (
                <div className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md">
                  {filteredDebtors.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        field.onChange(s);
                        setShowDebtorList(false);
                      }}
                      className="rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
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
                  className="h-11 text-lg font-semibold"
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
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
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="paymentMethod">Como paguei</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {canInstall && cards.length > 0 ? (
          <FormField
            control={form.control}
            name="cardId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cardId">Cartão</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? undefined : v)
                    }
                  >
                    <SelectTrigger id="cardId">
                      <SelectValue placeholder="Sem cartão específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Sem cartão específico
                      </SelectItem>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{" "}
                          <span className="text-muted-foreground">
                            (fecha dia {c.closingDay})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {canInstall ? (
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="installments">Parcelas</FormLabel>
                <FormControl>
                  <Select
                    value={String(field.value ?? 1)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="installments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? "1x (à vista)" : `${n}x`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {installments > 1 && amount > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-3 text-xs">
                    <p className="font-medium">
                      {installments}x de {formatBRL(installmentAmount)}
                    </p>
                    {installmentFirstAmount !== installmentAmount ? (
                      <p className="text-muted-foreground mt-1">
                        Primeira parcela:{" "}
                        {formatBRL(installmentFirstAmount)} (absorve
                        arredondamento)
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1">
                      Uma parcela por mês, começando em{" "}
                      {format(form.getValues("lendDate"), "dd/MM")}.
                    </p>
                  </div>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

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
                  placeholder="Ex: ingresso do show"
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
          Cada parcela vira uma despesa na categoria{" "}
          <span className="text-foreground">Empréstimos</span> — fica fora do
          40/15/45 e não conta como gasto pessoal.
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Registrando…" : "Registrar empréstimo"}
        </Button>
      </form>
    </FormProvider>
  );
}
