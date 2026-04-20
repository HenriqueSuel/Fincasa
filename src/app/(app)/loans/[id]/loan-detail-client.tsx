"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { repaymentSchema, type RepaymentInput } from "@/lib/validators";
import { cancelLoan, recordRepayment } from "@/app/actions/loan";
import type { LoanStatus } from "@/types/enums";

interface Props {
  loanId: string;
  outstanding: number;
  isOwner: boolean;
  status: LoanStatus;
}

export function LoanDetailClient({
  loanId,
  outstanding,
  isOwner,
  status,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelPending, startCancelTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const form = useForm<RepaymentInput>({
    resolver: zodResolver(repaymentSchema) as Resolver<RepaymentInput>,
    defaultValues: {
      amount: outstanding,
      paidAt: new Date(),
      paymentMethod: undefined,
      note: undefined,
    },
  });

  function onSubmit(values: RepaymentInput) {
    const fd = new FormData();
    fd.set("amount", String(values.amount));
    fd.set("paidAt", toLocalDateKey(values.paidAt));
    if (values.paymentMethod) fd.set("paymentMethod", values.paymentMethod);
    if (values.note) fd.set("note", values.note);

    startTransition(async () => {
      const result = await recordRepayment(loanId, undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof RepaymentInput, { message: msg });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pagamento registrado.");
      form.reset({
        amount: 0,
        paidAt: new Date(),
        paymentMethod: undefined,
        note: undefined,
      });
      setShowForm(false);
      router.refresh();
    });
  }

  function handleCancel() {
    startCancelTransition(async () => {
      await cancelLoan(loanId);
    });
  }

  if (!isOwner) {
    return (
      <p className="text-xs text-muted-foreground">
        Só quem lançou pode registrar pagamentos ou apagar esse empréstimo.
      </p>
    );
  }

  if (status === "cancelled") {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "active" ? (
        showForm ? (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Registrar pagamento</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="repay-amount">Valor recebido</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="repay-amount"
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
                  name="paidAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="repay-date">Data</FormLabel>
                      <FormControl>
                        <Input
                          id="repay-date"
                          type="date"
                          value={
                            field.value ? format(field.value, "yyyy-MM-dd") : ""
                          }
                          onChange={(e) => {
                            const [y, m, d] = e.target.value
                              .split("-")
                              .map(Number);
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
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="repay-method">Como recebi</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ?? "__none__"}
                          onValueChange={(v) =>
                            field.onChange(v === "__none__" ? undefined : v)
                          }
                        >
                          <SelectTrigger id="repay-method">
                            <SelectValue placeholder="Não informar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              Não informar
                            </SelectItem>
                            <SelectItem value="pix">Pix</SelectItem>
                            <SelectItem value="cash">Dinheiro</SelectItem>
                            <SelectItem value="debit">Débito</SelectItem>
                            <SelectItem value="credit">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="repay-note">
                      Observação (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="repay-note"
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

              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Salvando…" : "Registrar pagamento"}
              </Button>
            </form>
          </FormProvider>
        ) : (
          <div className="sticky bottom-24 z-30 mt-2">
            <Button
              onClick={() => {
                form.reset({
                  amount: outstanding,
                  paidAt: new Date(),
                  paymentMethod: undefined,
                  note: undefined,
                });
                setShowForm(true);
              }}
              size="lg"
              className="w-full"
            >
              Registrar pagamento
            </Button>
          </div>
        )
      ) : null}

      <ConfirmDialog
        title="Apagar este empréstimo?"
        description="Todas as cobranças e pagamentos vinculados serão removidos."
        confirmLabel="Apagar empréstimo"
        destructive
        onConfirm={handleCancel}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={cancelPending}
            className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Apagar empréstimo
          </Button>
        }
      />
    </div>
  );
}
