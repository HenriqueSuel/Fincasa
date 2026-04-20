"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORIES, INCOME_SUBCATEGORIES } from "@/lib/categories";
import type { TransactionFormState } from "@/app/actions/transaction";

type TxType = "expense" | "income";

interface InitialValues {
  type?: TxType;
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

interface Props {
  action: (
    prev: TransactionFormState | undefined,
    formData: FormData,
  ) => Promise<TransactionFormState>;
  initial?: InitialValues;
  submitLabel?: string;
  goals?: GoalOption[];
  customSubcategories?: CustomSubcategoryOption[];
  allowInstallments?: boolean;
}

export function TransactionForm({
  action,
  initial,
  submitLabel,
  goals = [],
  customSubcategories = [],
  allowInstallments = true,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [category, setCategory] = useState<string>(
    initial?.category ?? (type === "income" ? "income" : "essentials"),
  );
  const [subcategory, setSubcategory] = useState<string>(
    initial?.subcategory ?? "",
  );
  const [goalId, setGoalId] = useState<string>(initial?.goalId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initial?.paymentMethod ?? "",
  );
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [installments, setInstallments] = useState<number>(
    initial?.installments && initial.installments > 1 ? initial.installments : 1,
  );
  const [recurring, setRecurring] = useState<boolean>(false);

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

  function handleTypeChange(next: TxType) {
    setType(next);
    setPaymentMethod("");
    setInstallments(1);
    setRecurring(false);
    if (next === "income") {
      setCategory("income");
      setSubcategory("");
      setGoalId("");
    } else {
      setCategory("essentials");
      setSubcategory("");
      setGoalId("");
    }
  }

  const showGoalPicker = type === "expense" && category === "goals";
  const canInstall =
    allowInstallments && type === "expense" && paymentMethod === "credit";
  const canRecur =
    allowInstallments &&
    installments === 1 &&
    !(showGoalPicker && goalId && goalId !== "__none__");
  const installmentAmount =
    installments > 1 && amount > 0
      ? Math.floor((amount * 100) / installments) / 100
      : 0;
  const installmentFirstAmount =
    installments > 1 && amount > 0
      ? Math.round(amount * 100 - installmentAmount * (installments - 1) * 100) /
        100
      : 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="subcategory" value={subcategory} />
      <input
        type="hidden"
        name="goalId"
        value={
          showGoalPicker && goalId && goalId !== "__none__" ? goalId : ""
        }
      />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input
        type="hidden"
        name="installments"
        value={canInstall ? installments : 1}
      />
      <input
        type="hidden"
        name="recurring"
        value={canRecur && recurring ? "on" : ""}
      />

      <div className="grid grid-cols-2 gap-2 rounded-full border border-border bg-card p-1">
        <TypeTab
          active={type === "expense"}
          onClick={() => handleTypeChange("expense")}
          color="text-destructive"
        >
          Despesa
        </TypeTab>
        <TypeTab
          active={type === "income"}
          onClick={() => handleTypeChange("income")}
          color="text-primary"
        >
          Receita
        </TypeTab>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">
          {canInstall && installments > 1 ? "Valor total" : "Valor"}
        </Label>
        <MoneyInput
          id="amount"
          name="amount"
          defaultValue={initial?.amount}
          onValueChange={setAmount}
          required
          className="h-12 text-lg font-semibold"
        />
        {state.fieldErrors?.amount ? (
          <p className="text-xs text-destructive">{state.fieldErrors.amount}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          type="text"
          placeholder={
            type === "income" ? "Salário de março" : "Mercado Carrefour"
          }
          defaultValue={initial?.description ?? ""}
          required
          maxLength={120}
        />
        {state.fieldErrors?.description ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      {type === "expense" ? (
        <div className="flex flex-col gap-2">
          <Label>Categoria</Label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setSubcategory("");
                  if (c.id !== "goals") setGoalId("");
                }}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  category === c.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {Math.round(c.allocation * 100)}%
                </p>
                <p className="text-sm font-medium mt-0.5">{c.label}</p>
              </button>
            ))}
          </div>
          {state.fieldErrors?.category ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.category}
            </p>
          ) : null}
        </div>
      ) : null}

      {showGoalPicker ? (
        <div className="flex flex-col gap-2">
          <Label>Vincular a uma meta (opcional)</Label>
          {goals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              Você ainda não tem metas ativas.{" "}
              <Link
                href="/goals/new"
                className="text-primary underline underline-offset-4"
              >
                Criar uma meta
              </Link>
              .
            </div>
          ) : (
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem meta vinculada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem meta vinculada</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="mr-2">{g.icon}</span>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Se vincular, o valor soma ao progresso da meta automaticamente.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>Subcategoria</Label>
        <Select value={subcategory} onValueChange={setSubcategory}>
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
        {state.fieldErrors?.subcategory ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.subcategory}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={format(initial?.date ?? new Date(), "yyyy-MM-dd")}
            required
          />
          {state.fieldErrors?.date ? (
            <p className="text-xs text-destructive">{state.fieldErrors.date}</p>
          ) : null}
        </div>

        {type === "expense" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentMethod">Pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v);
                if (v !== "credit") setInstallments(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {canRecur ? (
        <button
          type="button"
          onClick={() => setRecurring((r) => !r)}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
            recurring
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:bg-accent",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex size-5 items-center justify-center rounded border",
              recurring
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
            aria-hidden
          >
            {recurring ? "✓" : ""}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Repetir todo mês</p>
            <p className="text-xs text-muted-foreground">
              {recurring
                ? "Serão criadas 12 ocorrências futuras. Você pode apagar todas depois."
                : "Útil pra Netflix, aluguel, salário — tudo que cai mensalmente."}
            </p>
          </div>
        </button>
      ) : null}

      {canInstall ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="installments">Parcelas</Label>
          <Select
            value={String(installments)}
            onValueChange={(v) => setInstallments(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n === 1 ? "À vista" : `${n}x`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {installments > 1 && amount > 0 ? (
            <div className="rounded-xl border border-border bg-card p-3 text-xs">
              <p className="font-medium">
                {installments}x de{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(installmentAmount)}
              </p>
              {installmentFirstAmount !== installmentAmount ? (
                <p className="text-muted-foreground mt-1">
                  Primeira parcela:{" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(installmentFirstAmount)}{" "}
                  (absorve o arredondamento)
                </p>
              ) : null}
              <p className="text-muted-foreground mt-1">
                Uma parcela em cada mês, a partir da data escolhida.
              </p>
            </div>
          ) : null}
          {state.fieldErrors?.installments ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.installments}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? "Salvando…" : (submitLabel ?? "Salvar")}
      </Button>
    </form>
  );
}

function TypeTab({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full text-sm font-medium transition-colors",
        active
          ? cn("bg-background shadow-sm", color)
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
