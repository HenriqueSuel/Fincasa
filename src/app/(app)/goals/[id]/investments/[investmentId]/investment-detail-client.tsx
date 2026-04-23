"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  investmentContributionSchema,
  investmentRevaluationSchema,
  investmentWithdrawalSchema,
  type InvestmentContributionInput,
  type InvestmentRevaluationInput,
  type InvestmentWithdrawalInput,
} from "@/lib/validators";
import {
  archiveInvestment,
  contributeInvestment,
  revalueInvestment,
  unarchiveInvestment,
  withdrawInvestment,
} from "@/app/actions/investment";
import { formatBRL } from "@/lib/money";

interface Props {
  goalId: string;
  investmentId: string;
  currentValue: number;
  archived: boolean;
}

export function InvestmentDetailClient({
  goalId,
  investmentId,
  currentValue,
  archived,
}: Props) {
  const router = useRouter();
  const [contribOpen, setContribOpen] = useState(false);
  const [revalueOpen, setRevalueOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [archivePending, startArchiveTransition] = useTransition();

  function handleArchive() {
    startArchiveTransition(async () => {
      await archiveInvestment(goalId, investmentId);
      toast.success("Investimento arquivado.");
      router.refresh();
    });
  }

  function handleUnarchive() {
    startArchiveTransition(async () => {
      await unarchiveInvestment(goalId, investmentId);
      toast.success("Investimento restaurado.");
      router.refresh();
    });
  }

  if (archived) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Este investimento está arquivado. O valor não conta mais na posição
          da meta, mas o histórico fica preservado.
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUnarchive}
          disabled={archivePending}
          className="self-start"
        >
          <ArchiveRestore className="size-4" />
          Restaurar investimento
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          onClick={() => setContribOpen(true)}
          className="h-12"
        >
          <Plus className="size-4" />
          Novo aporte
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setRevalueOpen(true)}
          className="h-12"
        >
          <TrendingUp className="size-4" />
          Atualizar valor
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setWithdrawOpen(true)}
        disabled={currentValue <= 0}
        className="self-start"
      >
        <Banknote className="size-4" />
        Resgatar
      </Button>

      <ConfirmDialog
        title="Arquivar este investimento?"
        description="O valor atual sai da posição da meta, mas todo o histórico fica preservado. Você pode restaurar depois."
        confirmLabel="Arquivar"
        destructive
        onConfirm={handleArchive}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={archivePending}
            className="self-start text-muted-foreground hover:text-destructive"
          >
            <Archive className="size-4" />
            Arquivar
          </Button>
        }
      />

      <ContributionDialog
        open={contribOpen}
        onOpenChange={setContribOpen}
        goalId={goalId}
        investmentId={investmentId}
      />

      <RevaluationDialog
        open={revalueOpen}
        onOpenChange={setRevalueOpen}
        goalId={goalId}
        investmentId={investmentId}
        currentValue={currentValue}
      />

      <WithdrawalDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        goalId={goalId}
        investmentId={investmentId}
        currentValue={currentValue}
      />
    </div>
  );
}

function ContributionDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  investmentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<InvestmentContributionInput>({
    resolver: zodResolver(
      investmentContributionSchema,
    ) as Resolver<InvestmentContributionInput>,
    defaultValues: {
      amount: 0,
      date: new Date(),
      note: undefined,
    },
  });

  function onSubmit(values: InvestmentContributionInput) {
    const fd = new FormData();
    fd.set("amount", String(values.amount));
    fd.set("date", toLocalDateKey(values.date));
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await contributeInvestment(
        goalId,
        investmentId,
        undefined,
        fd,
      );
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof InvestmentContributionInput, {
            message: msg,
          });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Aporte registrado.");
      form.reset({ amount: 0, date: new Date(), note: undefined });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo aporte</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contrib-amount">Valor aportado</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="contrib-amount"
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

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contrib-date">Data</FormLabel>
                  <FormControl>
                    <Input
                      id="contrib-date"
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contrib-note">Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      id="contrib-note"
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
              Vira despesa em Objetivos · Aporte. Ajusta a posição da meta.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Registrar aporte"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function RevaluationDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
  currentValue,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  investmentId: string;
  currentValue: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<InvestmentRevaluationInput>({
    resolver: zodResolver(
      investmentRevaluationSchema,
    ) as Resolver<InvestmentRevaluationInput>,
    defaultValues: {
      newValue: currentValue,
      date: new Date(),
      note: undefined,
    },
  });

  const newValue = form.watch("newValue") ?? 0;
  const delta = newValue - currentValue;

  function onSubmit(values: InvestmentRevaluationInput) {
    const fd = new FormData();
    fd.set("newValue", String(values.newValue));
    fd.set("date", toLocalDateKey(values.date));
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await revalueInvestment(
        goalId,
        investmentId,
        undefined,
        fd,
      );
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof InvestmentRevaluationInput, {
            message: msg,
          });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Valor atualizado.");
      form.reset({
        newValue: values.newValue,
        date: new Date(),
        note: undefined,
      });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar valor</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="newValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="rev-value">Valor atual</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="rev-value"
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

            {delta !== 0 ? (
              <p
                className={
                  delta > 0
                    ? "text-xs font-medium text-primary"
                    : "text-xs font-medium text-destructive"
                }
              >
                {delta > 0 ? "+" : ""}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(delta)}{" "}
                em relação ao valor anterior
              </p>
            ) : null}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="rev-date">Data</FormLabel>
                  <FormControl>
                    <Input
                      id="rev-date"
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="rev-note">Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      id="rev-note"
                      type="text"
                      placeholder="Ex: extrato da corretora"
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
              Só reflete a nova posição. Não cria despesa no caixa.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Atualizar"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
  currentValue,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  investmentId: string;
  currentValue: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<InvestmentWithdrawalInput>({
    resolver: zodResolver(
      investmentWithdrawalSchema,
    ) as Resolver<InvestmentWithdrawalInput>,
    defaultValues: {
      amount: currentValue,
      date: new Date(),
      note: undefined,
    },
  });

  const amount = form.watch("amount") ?? 0;
  const willSettle = amount > 0 && Math.abs(amount - currentValue) < 0.001;

  function onSubmit(values: InvestmentWithdrawalInput) {
    const fd = new FormData();
    fd.set("amount", String(values.amount));
    fd.set("date", toLocalDateKey(values.date));
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await withdrawInvestment(
        goalId,
        investmentId,
        undefined,
        fd,
      );
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof InvestmentWithdrawalInput, {
            message: msg,
          });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        willSettle ? "Resgate total registrado." : "Resgate registrado.",
      );
      form.reset({ amount: 0, date: new Date(), note: undefined });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resgatar</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="wd-amount">Valor resgatado</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="wd-amount"
                      value={field.value ?? 0}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      className="h-11 text-lg font-semibold"
                      required
                    />
                  </FormControl>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Posição atual: {formatBRL(currentValue)}
                    </span>
                    <button
                      type="button"
                      onClick={() => field.onChange(currentValue)}
                      className="text-primary underline underline-offset-4"
                    >
                      Resgatar tudo
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="wd-date">Data</FormLabel>
                  <FormControl>
                    <Input
                      id="wd-date"
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="wd-note">Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      id="wd-note"
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
              Vira receita em Objetivos · Resgate. A posição da meta diminui
              pelo valor resgatado.
              {willSettle
                ? " Como está resgatando tudo, o investimento será arquivado automaticamente."
                : ""}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Resgatar"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
