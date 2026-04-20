"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, INCOME_SUBCATEGORIES } from "@/lib/categories";
import { toLocalDateKey } from "@/lib/dates";
import { transactionSchema, type TransactionInput } from "@/lib/validators";
import type { TransactionFormState } from "@/app/actions/transaction";
import { TypeToggle } from "./type-toggle";
import { CategoryPicker } from "./category-picker";
import { InstallmentsField } from "./installments-field";
import { RecurringToggle } from "./recurring-toggle";

export interface GoalOption {
  id: string;
  name: string;
  icon: string;
}

export interface CustomSubcategoryOption {
  category: "essentials" | "qualityOfLife" | "goals";
  name: string;
  icon?: string;
}

interface Initial {
  type?: "expense" | "income";
  amount?: number;
  description?: string;
  category?: string;
  subcategory?: string;
  customSubcategory?: string;
  goalId?: string;
  date?: Date;
  paymentMethod?: string;
  installments?: number;
}

interface Props {
  action: (
    prev: TransactionFormState | undefined,
    formData: FormData,
  ) => Promise<TransactionFormState>;
  initial?: Initial;
  submitLabel?: string;
  goals?: GoalOption[];
  customSubcategories?: CustomSubcategoryOption[];
  allowInstallments?: boolean;
}

function buildFormData(values: TransactionInput): FormData {
  const fd = new FormData();
  fd.set("type", values.type);
  fd.set("amount", String(values.amount));
  fd.set("description", values.description);
  fd.set("category", values.category);
  fd.set("subcategory", values.subcategory);
  if (values.customSubcategory) fd.set("customSubcategory", values.customSubcategory);
  if (values.goalId) fd.set("goalId", values.goalId);
  fd.set("date", toLocalDateKey(values.date));
  if (values.paymentMethod) fd.set("paymentMethod", values.paymentMethod);
  fd.set("installments", String(values.installments));
  if (values.recurring) fd.set("recurring", "on");
  return fd;
}

export function TransactionForm({
  action,
  initial,
  submitLabel,
  goals = [],
  customSubcategories = [],
  allowInstallments = true,
}: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionInput>,
    defaultValues: {
      type: initial?.type ?? "expense",
      amount: initial?.amount ?? 0,
      description: initial?.description ?? "",
      category:
        (initial?.category as TransactionInput["category"]) ??
        (initial?.type === "income" ? "income" : "essentials"),
      subcategory: initial?.subcategory ?? "",
      customSubcategory: initial?.customSubcategory,
      goalId: initial?.goalId,
      date: initial?.date ?? new Date(),
      paymentMethod:
        (initial?.paymentMethod as TransactionInput["paymentMethod"]) ??
        undefined,
      installments: initial?.installments ?? 1,
      recurring: false,
    },
  });

  const type = form.watch("type");
  const category = form.watch("category");
  const paymentMethod = form.watch("paymentMethod");
  const installments = form.watch("installments");

  const showGoalPicker = type === "expense" && category === "goals";
  const canInstall =
    allowInstallments && type === "expense" && paymentMethod === "credit";
  const canRecur = allowInstallments && installments === 1;

  const subcategoryOptions = useMemo(() => {
    if (type === "income") {
      return INCOME_SUBCATEGORIES.map((name) => ({ name, icon: "💰" }));
    }
    const def = CATEGORIES.find((c) => c.id === category);
    const defaults = def?.subcategories ?? [];
    const extras = customSubcategories
      .filter((s) => s.category === category)
      .map((s) => ({ name: s.name, icon: s.icon ?? "🏷️" }));
    const seen = new Set<string>();
    return [...defaults, ...extras].filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [type, category, customSubcategories]);

  async function onSubmit(values: TransactionInput) {
    const fd = buildFormData(values);
    startTransition(async () => {
      const result = await action(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof TransactionInput, { message: msg });
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
        <TypeToggle />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="amount">
                {canInstall && installments > 1 ? "Valor total" : "Valor"}
              </FormLabel>
              <FormControl>
                <MoneyInput
                  id="amount"
                  value={field.value ?? 0}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  required
                  className="h-12 text-lg font-semibold"
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
              <FormLabel htmlFor="description">Descrição</FormLabel>
              <FormControl>
                <Input
                  id="description"
                  type="text"
                  maxLength={120}
                  placeholder={
                    type === "income"
                      ? "Salário de março"
                      : "Mercado Carrefour"
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "expense" ? <CategoryPicker /> : null}

        {showGoalPicker ? (
          <FormField
            control={form.control}
            name="goalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vincular a uma meta (opcional)</FormLabel>
                {goals.length === 0 ? (
                  <FormDescription>
                    Você ainda não tem metas ativas.{" "}
                    <Link
                      href="/goals/new"
                      className="text-primary underline underline-offset-4"
                    >
                      Criar uma meta
                    </Link>
                    .
                  </FormDescription>
                ) : (
                  <FormControl>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? undefined : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem meta vinculada" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Sem meta vinculada
                        </SelectItem>
                        {goals.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            <span className="mr-2">{g.icon}</span>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                )}
                <FormDescription>
                  Se vincular, o valor soma ao progresso da meta automaticamente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="subcategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subcategoria</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategoryOptions.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        <span className="mr-2">{s.icon}</span>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="date">Data</FormLabel>
                <FormControl>
                  <Input
                    id="date"
                    type="date"
                    value={
                      field.value ? format(field.value, "yyyy-MM-dd") : ""
                    }
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      if (y && m && d)
                        field.onChange(new Date(y, m - 1, d));
                    }}
                    onBlur={field.onBlur}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {type === "expense" ? (
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="paymentMethod">Pagamento</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) => {
                        const next = v === "__none__" ? undefined : v;
                        field.onChange(next);
                        if (next !== "credit") {
                          form.setValue("installments", 1);
                        }
                      }}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
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
          ) : null}
        </div>

        {canInstall ? <InstallmentsField /> : null}
        {canRecur ? <RecurringToggle /> : null}

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Salvando…" : (submitLabel ?? "Salvar")}
        </Button>
      </form>
    </FormProvider>
  );
}
