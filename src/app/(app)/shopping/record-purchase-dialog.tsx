"use client";

import { useEffect, useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/money";
import { toLocalDateKey } from "@/lib/dates";
import {
  recordPurchaseSchema,
  type RecordPurchaseInput,
} from "@/lib/validators";
import { recordPurchase } from "@/app/actions/shopping";
import type { ShoppingListEntry } from "@/types/domain";

export interface CardOption {
  id: string;
  name: string;
  closingDay: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ShoppingListEntry[];
  storeSuggestions: string[];
  cards?: CardOption[];
  isFinal: boolean;
}

export function RecordPurchaseDialog({
  open,
  onOpenChange,
  entries,
  storeSuggestions,
  cards = [],
  isFinal,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showStoreList, setShowStoreList] = useState(false);
  const storeInputRef = useRef<HTMLInputElement | null>(null);

  const total = entries.reduce(
    (s, e) => s + (e.priceAtCheckout ?? 0) * (e.quantityAtCheckout ?? 1),
    0,
  );

  const form = useForm<RecordPurchaseInput>({
    resolver: zodResolver(recordPurchaseSchema) as Resolver<RecordPurchaseInput>,
    defaultValues: {
      amount: total,
      description: "Mercado",
      storeName: "",
      paymentMethod: "credit",
      date: new Date(),
      installments: 1,
      cardId: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: total,
        description: "Mercado",
        storeName: "",
        paymentMethod: "credit",
        date: new Date(),
        installments: 1,
        cardId: undefined,
      });
    }
  }, [open, total, form]);

  const storeValue = form.watch("storeName");
  const paymentMethod = form.watch("paymentMethod");
  const installments = form.watch("installments");
  const amount = form.watch("amount") ?? 0;
  const filteredStores = storeSuggestions.filter((s) =>
    s.toLowerCase().includes(storeValue.trim().toLowerCase()),
  );

  const canInstall = paymentMethod === "credit";
  const installmentAmount =
    installments > 1 && amount > 0
      ? Math.floor((amount * 100) / installments) / 100
      : 0;
  const installmentFirstAmount =
    installments > 1 && amount > 0
      ? Math.round(amount * 100 - installmentAmount * (installments - 1) * 100) /
        100
      : 0;

  useEffect(() => {
    if (!canInstall) {
      if (installments > 1) form.setValue("installments", 1);
      form.setValue("cardId", undefined);
    }
  }, [canInstall, installments, form]);

  async function onSubmit(values: RecordPurchaseInput) {
    const desc =
      values.description.trim() === "Mercado" && values.storeName
        ? `Mercado — ${values.storeName.trim()}`
        : values.description;
    const entryIds = entries.map((e) => e.id);
    startTransition(async () => {
      const result = await recordPurchase(entryIds, {
        ...values,
        description: desc,
      });
      if ("fieldErrors" in result && result.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof RecordPurchaseInput, { message: msg });
        }
        return;
      }
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("success" in result && result.success) {
        toast.success(
          result.finalized
            ? "Compra lançada e lista finalizada."
            : "Compra parcial lançada.",
        );
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isFinal ? "Finalizar compra" : "Lançar compra parcial"}
          </DialogTitle>
          <DialogDescription>
            Essa compra vira uma despesa em{" "}
            <span className="text-foreground">Essenciais / Mercado</span>{" "}
            automaticamente.
          </DialogDescription>
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
                  <FormLabel htmlFor="amount">Valor total</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="amount"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="description">Descrição</FormLabel>
                  <FormControl>
                    <Input
                      id="description"
                      type="text"
                      maxLength={120}
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
                name="storeName"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel htmlFor="storeName">Mercado</FormLabel>
                    <FormControl>
                      <Input
                        id="storeName"
                        type="text"
                        placeholder="Atacadão"
                        autoComplete="off"
                        ref={storeInputRef}
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          setShowStoreList(true);
                        }}
                        onFocus={() => setShowStoreList(true)}
                        onBlur={() =>
                          setTimeout(() => setShowStoreList(false), 120)
                        }
                        maxLength={80}
                      />
                    </FormControl>
                    {showStoreList && filteredStores.length > 0 ? (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md">
                        {filteredStores.slice(0, 5).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              field.onChange(s);
                              setShowStoreList(false);
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
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="paymentMethod">Pagamento</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(
                            (n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 1 ? "À vista" : `${n}x`}
                              </SelectItem>
                            ),
                          )}
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
                            {formatBRL(installmentFirstAmount)} (absorve o
                            arredondamento)
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-1">
                          Uma parcela em cada mês, a partir de{" "}
                          {format(form.getValues("date"), "dd/MM")}.
                        </p>
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {entries.length}{" "}
                {entries.length === 1 ? "item" : "itens"} · {formatBRL(total)}
              </p>
              <ul className="flex flex-col gap-1 text-xs">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {e.itemName}
                      {e.brandAtCheckout ? ` · ${e.brandAtCheckout}` : ""}
                      {(e.quantityAtCheckout ?? 1) > 1 ? (
                        <span className="ml-1">
                          · {formatBRL(e.priceAtCheckout ?? 0)} ×{" "}
                          {e.quantityAtCheckout}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatBRL(
                        (e.priceAtCheckout ?? 0) *
                          (e.quantityAtCheckout ?? 1),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

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
                {pending ? "Lançando…" : "Lançar compra"}
              </Button>
            </DialogFooter>

            <p className="text-[10px] text-muted-foreground">
              Ao salvar criamos: 1 despesa + histórico nos itens + trip{" "}
              {toLocalDateKey(form.getValues("date"))}.
            </p>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
