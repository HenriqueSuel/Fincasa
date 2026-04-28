"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  MoreVertical,
  TrendingDown,
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
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  investmentContributionSchema,
  investmentRevaluationSchema,
  type InvestmentContributionInput,
  type InvestmentRevaluationInput,
} from "@/lib/validators";
import {
  deleteInvestmentEvent,
  updateInvestmentEvent,
} from "@/app/actions/investment";

export interface HistoryEvent {
  id: string;
  type: "contribution" | "revaluation" | "withdrawal";
  amount: number;
  previousValue?: number;
  newValue?: number;
  date: Date;
  note?: string;
  createdByName: string;
}

interface Props {
  goalId: string;
  investmentId: string;
  events: HistoryEvent[];
  canEdit: boolean;
}

export function EventHistoryList({
  goalId,
  investmentId,
  events,
  canEdit,
}: Props) {
  const [editing, setEditing] = useState<HistoryEvent | null>(null);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {events.map((e) => (
          <EventRow
            key={e.id}
            event={e}
            canEdit={canEdit}
            goalId={goalId}
            investmentId={investmentId}
            onEdit={() => setEditing(e)}
          />
        ))}
      </ul>

      {editing ? (
        <EditEventDialog
          key={editing.id}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          goalId={goalId}
          investmentId={investmentId}
          event={editing}
        />
      ) : null}
    </>
  );
}

function EventRow({
  event,
  canEdit,
  goalId,
  investmentId,
  onEdit,
}: {
  event: HistoryEvent;
  canEdit: boolean;
  goalId: string;
  investmentId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const isContribution = event.type === "contribution";
  const isWithdrawal = event.type === "withdrawal";
  const isRevaluation = event.type === "revaluation";
  const isPositiveEvent = event.amount >= 0;
  const label = isContribution
    ? "Aporte"
    : isWithdrawal
      ? "Resgate"
      : "Atualização de valor";

  const showMenu = canEdit && !isWithdrawal;

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteInvestmentEvent(goalId, investmentId, event.id);
        toast.success("Evento apagado.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao apagar.");
      }
    });
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isContribution
            ? "bg-primary/10 text-primary"
            : isWithdrawal
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : isPositiveEvent
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive",
        )}
      >
        {isContribution ? (
          <ArrowUp className="size-4" />
        ) : isWithdrawal ? (
          <ArrowDown className="size-4" />
        ) : isPositiveEvent ? (
          <TrendingUp className="size-4" />
        ) : (
          <TrendingDown className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {format(event.date, "dd 'de' MMM, yyyy", { locale: ptBR })}
          {" · "}
          {event.createdByName}
          {event.note ? ` · ${event.note}` : ""}
        </p>
        {(isRevaluation || isWithdrawal) &&
        typeof event.previousValue === "number" &&
        typeof event.newValue === "number" ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
            {formatBRL(event.previousValue)} → {formatBRL(event.newValue)}
          </p>
        ) : null}
      </div>
      <div className="flex items-start gap-2">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isContribution
              ? "text-foreground"
              : isWithdrawal
                ? "text-amber-600 dark:text-amber-400"
                : isPositiveEvent
                  ? "text-primary"
                  : "text-destructive",
          )}
        >
          {isContribution
            ? formatBRL(event.amount)
            : isWithdrawal
              ? `− ${formatBRL(event.amount)}`
              : `${isPositiveEvent ? "+" : ""}${formatBRL(event.amount)}`}
        </p>
        {showMenu ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
              className="flex size-7 items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Opções"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 flex flex-col rounded-md border border-border bg-popover p-1 shadow-md min-w-[140px]">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  Editar
                </button>
                <ConfirmDialog
                  title="Apagar este evento?"
                  description="O valor é revertido no investimento e na meta. Se for um aporte, a transação no caixa também é apagada."
                  confirmLabel="Apagar"
                  destructive
                  onConfirm={handleDelete}
                  trigger={
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={deletePending}
                      className="rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      Apagar
                    </button>
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function EditEventDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  investmentId: string;
  event: HistoryEvent;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isContribution = event.type === "contribution";

  if (isContribution) {
    return (
      <ContributionEditDialog
        open={open}
        onOpenChange={onOpenChange}
        goalId={goalId}
        investmentId={investmentId}
        event={event}
        pending={pending}
        startTransition={startTransition}
        router={router}
      />
    );
  }
  return (
    <RevaluationEditDialog
      open={open}
      onOpenChange={onOpenChange}
      goalId={goalId}
      investmentId={investmentId}
      event={event}
      pending={pending}
      startTransition={startTransition}
      router={router}
    />
  );
}

interface DialogChildProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  investmentId: string;
  event: HistoryEvent;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  router: ReturnType<typeof useRouter>;
}

function ContributionEditDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
  event,
  pending,
  startTransition,
  router,
}: DialogChildProps) {
  const form = useForm<InvestmentContributionInput>({
    resolver: zodResolver(
      investmentContributionSchema,
    ) as Resolver<InvestmentContributionInput>,
    defaultValues: {
      amount: event.amount,
      date: event.date,
      note: event.note,
    },
  });

  function onSubmit(values: InvestmentContributionInput) {
    const fd = new FormData();
    fd.set("amount", String(values.amount));
    fd.set("date", toLocalDateKey(values.date));
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await updateInvestmentEvent(
        goalId,
        investmentId,
        event.id,
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
      toast.success("Aporte atualizado.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar aporte</DialogTitle>
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
                  <FormLabel htmlFor="edit-amount">Valor</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="edit-amount"
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
                  <FormLabel htmlFor="edit-date">Data</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-date"
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
                  <FormLabel htmlFor="edit-note">Nota</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-note"
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
              A transação vinculada também é atualizada.
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
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function RevaluationEditDialog({
  open,
  onOpenChange,
  goalId,
  investmentId,
  event,
  pending,
  startTransition,
  router,
}: DialogChildProps) {
  const form = useForm<InvestmentRevaluationInput>({
    resolver: zodResolver(
      investmentRevaluationSchema,
    ) as Resolver<InvestmentRevaluationInput>,
    defaultValues: {
      newValue: event.newValue ?? 0,
      date: event.date,
      note: event.note,
    },
  });

  function onSubmit(values: InvestmentRevaluationInput) {
    const fd = new FormData();
    fd.set("newValue", String(values.newValue));
    fd.set("date", toLocalDateKey(values.date));
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await updateInvestmentEvent(
        goalId,
        investmentId,
        event.id,
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
      toast.success("Atualização salva.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar atualização de valor</DialogTitle>
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
                  <FormLabel htmlFor="edit-rev-value">
                    Valor da posição
                  </FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="edit-rev-value"
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
                  <FormLabel htmlFor="edit-rev-date">Data</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-rev-date"
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
                  <FormLabel htmlFor="edit-rev-note">Nota</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-rev-note"
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
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
