"use client";

import { useTransition } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format } from "date-fns";
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
import { cn } from "@/lib/utils";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/goals";
import { toLocalDateKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { goalSchema, type GoalInput } from "@/lib/validators";
import type { GoalFormState } from "@/app/actions/goal";

interface Initial {
  name?: string;
  category?: GoalInput["category"];
  priority?: GoalInput["priority"];
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
  initial?: Initial;
  submitLabel?: string;
}

function buildFormData(values: GoalInput): FormData {
  const fd = new FormData();
  fd.set("name", values.name);
  fd.set("category", values.category);
  fd.set("priority", values.priority);
  fd.set("targetAmount", String(values.targetAmount));
  fd.set("monthlyContribution", String(values.monthlyContribution));
  fd.set("startDate", toLocalDateKey(values.startDate));
  fd.set("estimatedEndDate", toLocalDateKey(values.estimatedEndDate));
  return fd;
}

export function GoalForm({ action, initial, submitLabel }: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema) as Resolver<GoalInput>,
    defaultValues: {
      name: initial?.name ?? "",
      category: initial?.category ?? "emergency",
      priority: initial?.priority ?? "medium",
      targetAmount: initial?.targetAmount ?? 0,
      monthlyContribution: initial?.monthlyContribution ?? 0,
      startDate: initial?.startDate ?? new Date(),
      estimatedEndDate:
        initial?.estimatedEndDate ?? addMonths(new Date(), 12),
    },
  });

  const target = form.watch("targetAmount") ?? 0;
  const contribution = form.watch("monthlyContribution") ?? 0;
  const estimatedMonths =
    contribution > 0 && target > 0 ? Math.ceil(target / contribution) : null;

  async function onSubmit(values: GoalInput) {
    const fd = buildFormData(values);
    startTransition(async () => {
      const result = await action(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof GoalInput, { message: msg });
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <div
                  role="radiogroup"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                >
                  {GOAL_CATEGORIES.map((c) => {
                    const selected = field.value === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.onChange(c.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-accent",
                        )}
                      >
                        <span className="text-xl" aria-hidden>
                          {c.icon}
                        </span>
                        <span className="text-center text-[10px] leading-tight text-muted-foreground">
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  placeholder="Viagem Japão 2027"
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
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="targetAmount">Meta</FormLabel>
                <FormControl>
                  <MoneyInput
                    id="targetAmount"
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
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
            name="monthlyContribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="monthlyContribution">
                  Aporte mensal
                </FormLabel>
                <FormControl>
                  <MoneyInput
                    id="monthlyContribution"
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {estimatedMonths !== null ? (
          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Aportando {formatBRL(contribution)}/mês você atinge{" "}
            <span className="font-medium text-foreground">
              {formatBRL(target)}
            </span>{" "}
            em{" "}
            <span className="font-medium text-foreground">
              {estimatedMonths} {estimatedMonths === 1 ? "mês" : "meses"}
            </span>
            .
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="startDate">Início</FormLabel>
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
          <FormField
            control={form.control}
            name="estimatedEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="estimatedEndDate">Prazo</FormLabel>
                <FormControl>
                  <Input
                    id="estimatedEndDate"
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
        </div>

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="priority">Prioridade</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Salvando…" : (submitLabel ?? "Criar meta")}
        </Button>
      </form>
    </FormProvider>
  );
}
