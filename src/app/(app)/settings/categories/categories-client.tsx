"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryDefinition } from "@/lib/categories";
import type { CustomSubcategory } from "@/types/domain";
import {
  addCustomSubcategory,
  deleteCustomSubcategory,
} from "@/app/actions/subcategory";

type CatId = "essentials" | "qualityOfLife" | "goals";

export function CategoriesClient({
  categories,
  custom,
}: {
  categories: CategoryDefinition[];
  custom: CustomSubcategory[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    addCustomSubcategory,
    {},
  );
  const [category, setCategory] = useState<CatId>("essentials");
  const [lastSubmitKey, setLastSubmitKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success("Subcategoria criada.");
      setLastSubmitKey((k) => k + 1);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  function bindReset(fd: FormData) {
    formAction(fd);
  }

  const customByCategory = custom.reduce<Record<CatId, CustomSubcategory[]>>(
    (acc, s) => {
      (acc[s.category as CatId] ||= []).push(s);
      return acc;
    },
    { essentials: [], qualityOfLife: [], goals: [] },
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Nova subcategoria
        </h2>
        <form
          key={lastSubmitKey}
          action={bindReset}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <input type="hidden" name="category" value={category} />
          <div className="flex flex-col gap-2">
            <Label>Categoria principal</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as CatId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label} ({Math.round(c.allocation * 100)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.category ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.category}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="icon">Emoji</Label>
              <Input
                id="icon"
                name="icon"
                type="text"
                maxLength={4}
                placeholder="🏷️"
                className="w-16 text-center"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Farmácia Araújo"
                required
                maxLength={40}
              />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button type="submit" disabled={isPending} className="self-start">
            <Plus className="size-4" />
            {isPending ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>
      </section>

      {categories.map((cat) => {
        const list = customByCategory[cat.id as CatId] ?? [];
        return (
          <section key={cat.id} className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium">
                {cat.label}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  · {Math.round(cat.allocation * 100)}%
                </span>
              </h2>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Padrão</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.subcategories.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 h-7 text-xs"
                  >
                    <span>{s.icon}</span>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Customizadas ({list.length})
              </p>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nenhuma ainda.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {list.map((s) => (
                    <DeletableItem key={s.id} item={s} onDeleted={() => router.refresh()} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DeletableItem({
  item,
  onDeleted,
}: {
  item: CustomSubcategory;
  onDeleted: () => void;
}) {
  async function handleConfirm() {
    try {
      await deleteCustomSubcategory(item.id);
      toast.success("Subcategoria apagada.");
      onDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível apagar.",
      );
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11">
      <span className="text-base">{item.icon ?? "🏷️"}</span>
      <span className="flex-1 text-sm">{item.name}</span>
      <ConfirmDialog
        title={`Apagar "${item.name}"?`}
        description="Transações já lançadas com essa subcategoria continuam existindo."
        confirmLabel="Apagar"
        destructive
        onConfirm={handleConfirm}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Apagar ${item.name}`}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </li>
  );
}
