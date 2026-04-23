"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  creditCardSchema,
  type CreditCardInput,
} from "@/lib/validators";
import type { CreditCard } from "@/types/domain";
import {
  createCard,
  deleteCard,
  updateCard,
} from "@/app/actions/card";

interface Props {
  cards: CreditCard[];
}

export function CardsClient({ cards }: Props) {
  const [editing, setEditing] = useState<CreditCard | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <CardForm
        key={editing?.id ?? "new"}
        card={editing}
        onDone={() => setEditing(null)}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Cartões cadastrados
        </h2>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cartão ainda. Cadastre o primeiro no formulário acima.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onEdit={() => setEditing(card)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CardForm({
  card,
  onDone,
}: {
  card: CreditCard | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CreditCardInput>({
    resolver: zodResolver(creditCardSchema) as Resolver<CreditCardInput>,
    defaultValues: {
      name: card?.name ?? "",
      closingDay: card?.closingDay ?? 25,
      dueDay: card?.dueDay ?? 5,
      color: card?.color ?? undefined,
    },
  });

  async function onSubmit(values: CreditCardInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("closingDay", String(values.closingDay));
    fd.set("dueDay", String(values.dueDay));
    if (values.color) fd.set("color", values.color);

    startTransition(async () => {
      const action = card
        ? updateCard.bind(null, card.id)
        : createCard;
      const result = await action(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof CreditCardInput, { message: msg });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(card ? "Cartão atualizado." : "Cartão cadastrado.");
      form.reset({ name: "", closingDay: 25, dueDay: 5, color: undefined });
      onDone();
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            {card ? `Editar "${card.name}"` : "Novo cartão"}
          </h2>
          {card ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                form.reset({
                  name: "",
                  closingDay: 25,
                  dueDay: 5,
                  color: undefined,
                });
                onDone();
              }}
            >
              Cancelar edição
            </Button>
          ) : null}
        </div>

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
                  maxLength={40}
                  placeholder="Ex: Nubank"
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
            name="closingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="closingDay">
                  Dia do fechamento
                </FormLabel>
                <FormControl>
                  <Input
                    id="closingDay"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(Number(e.target.value) || 1)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="dueDay">Dia do vencimento</FormLabel>
                <FormControl>
                  <Input
                    id="dueDay"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(Number(e.target.value) || 1)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Compras feitas até o dia do fechamento caem na próxima fatura.
          Depois do fechamento, pulam pra fatura seguinte.
        </p>

        <Button type="submit" disabled={pending} size="lg">
          <Plus className="size-4" />
          {pending ? "Salvando…" : card ? "Salvar" : "Cadastrar cartão"}
        </Button>
      </form>
    </FormProvider>
  );
}

function CardRow({
  card,
  onEdit,
}: {
  card: CreditCard;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteCard(card.id);
      toast.success("Cartão removido.");
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link
        href={`/cards/${card.id}`}
        className="flex items-center gap-3 flex-1 min-w-0 -m-3 p-3 rounded-xl hover:bg-accent transition-colors"
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary"
          style={
            card.color
              ? { backgroundColor: `${card.color}20`, color: card.color }
              : { backgroundColor: "var(--color-primary)", opacity: 0.1 }
          }
          aria-hidden
        >
          {card.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            Fecha dia {card.closingDay} · vence dia {card.dueDay}
          </p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onEdit}
        disabled={pending}
        aria-label={`Editar ${card.name}`}
        className="size-8 text-muted-foreground"
      >
        <Pencil className="size-4" />
      </Button>
      <ConfirmDialog
        title={`Apagar "${card.name}"?`}
        description="Transações já lançadas com esse cartão continuam existindo — só o cartão some da lista de opções."
        confirmLabel="Apagar"
        destructive
        onConfirm={handleDelete}
        trigger={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label={`Apagar ${card.name}`}
            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </li>
  );
}
