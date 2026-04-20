"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";
import {
  updateMyIncomeSchema,
  type UpdateMyIncomeInput,
} from "@/lib/validators";
import { updateMyIncome } from "@/app/actions/household";

export function EditIncomeDialog({ currentIncome }: { currentIncome: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateMyIncomeInput>({
    resolver: zodResolver(updateMyIncomeSchema) as Resolver<UpdateMyIncomeInput>,
    defaultValues: { monthlyIncome: currentIncome },
  });

  useEffect(() => {
    if (open) form.reset({ monthlyIncome: currentIncome });
  }, [open, currentIncome, form]);

  async function onSubmit(values: UpdateMyIncomeInput) {
    const fd = new FormData();
    fd.set("monthlyIncome", String(values.monthlyIncome));
    startTransition(async () => {
      const result = await updateMyIncome(undefined, fd);
      if (result?.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof UpdateMyIncomeInput, { message: msg });
        }
        return;
      }
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.success) {
        toast.success("Renda atualizada.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Editar minha renda"
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar renda</DialogTitle>
          <DialogDescription>
            A renda combinada da família e os cálculos de 40/15/45 são
            recalculados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="monthlyIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="monthlyIncome">
                    Sua renda mensal
                  </FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="monthlyIncome"
                      value={field.value ?? 0}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    Use 0 se estiver entre um trabalho e outro — o orçamento
                    ainda respeita o percentual do que sua parceira traz.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
