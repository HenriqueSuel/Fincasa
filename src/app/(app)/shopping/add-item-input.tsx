"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { normalizeName } from "@/lib/shopping/categorize";
import type { ShoppingItem } from "@/types/domain";
import { addListItem, linkAndAddListItem } from "@/app/actions/shopping";

interface Props {
  catalog: ShoppingItem[];
}

export function AddItemInput({ catalog }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = normalizeName(value);
    if (!q) return [];
    return catalog
      .filter((item) => item.nameNormalized.startsWith(q))
      .slice(0, 6);
  }, [value, catalog]);

  function submitNew() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("name", trimmed);
    startTransition(async () => {
      const result = await addListItem(fd);
      if (result.error) toast.error(result.error);
      else if (result.success) {
        toast.success("Adicionado à lista.");
        setValue("");
        setOpen(false);
        inputRef.current?.focus();
        router.refresh();
      }
    });
  }

  function submitLink(itemId: string) {
    const fd = new FormData();
    fd.set("itemId", itemId);
    startTransition(async () => {
      const result = await linkAndAddListItem(fd);
      if (result.error) toast.error(result.error);
      else if (result.success) {
        toast.success("Adicionado à lista.");
        setValue("");
        setOpen(false);
        inputRef.current?.focus();
        router.refresh();
      }
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) submitLink(suggestions[0]!.id);
      else submitNew();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKey}
          placeholder="Adicionar item (ex: arroz)"
          disabled={pending}
          className="h-12 pl-9 pr-4"
          autoComplete="off"
        />
      </div>

      {open && (value.trim() || suggestions.length > 0) ? (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              disabled={pending}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submitLink(item.id)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60",
              )}
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                {item.defaultBrand ? (
                  <p className="text-[10px] text-muted-foreground">
                    {item.defaultBrand}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                {item.averagePrice90d ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    média {formatBRL(item.averagePrice90d)}
                  </p>
                ) : item.lastPrice ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    última {formatBRL(item.lastPrice)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">novo</p>
                )}
              </div>
            </button>
          ))}

          {value.trim() && suggestions.length === 0 ? (
            <button
              type="button"
              disabled={pending}
              onMouseDown={(e) => e.preventDefault()}
              onClick={submitNew}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Plus className="size-4 text-primary" />
              <span>
                Cadastrar{" "}
                <span className="font-medium">&ldquo;{value.trim()}&rdquo;</span>{" "}
                como novo
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
