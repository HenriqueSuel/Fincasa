"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHOPPING_SECTIONS,
  SHOPPING_SECTION_LABELS,
} from "@/types/enums";
import {
  updateShoppingItemSchema,
  type UpdateShoppingItemInput,
} from "@/lib/validators";
import { updateShoppingItem } from "@/app/actions/shopping";
import type { ShoppingItem } from "@/types/domain";

export function EditItemForm({ item }: { item: ShoppingItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateShoppingItemInput>({
    resolver: zodResolver(
      updateShoppingItemSchema,
    ) as Resolver<UpdateShoppingItemInput>,
    defaultValues: {
      name: item.name,
      section: item.section,
      defaultBrand: item.defaultBrand ?? "",
    },
  });

  async function onSubmit(values: UpdateShoppingItemInput) {
    startTransition(async () => {
      const result = await updateShoppingItem(item.id, values);
      if (result.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof UpdateShoppingItemInput, {
            message: msg,
          });
        }
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success) {
        toast.success("Produto atualizado.");
        router.refresh();
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="name">Nome</FormLabel>
              <FormControl>
                <Input id="name" type="text" maxLength={80} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="section"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seção</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOPPING_SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SHOPPING_SECTION_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultBrand"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="defaultBrand">Marca padrão</FormLabel>
              <FormControl>
                <Input
                  id="defaultBrand"
                  type="text"
                  maxLength={60}
                  placeholder="Opcional"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </FormProvider>
  );
}
