"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { cn } from "@/lib/utils";

type CategoryFilter =
  | "all"
  | "essentials"
  | "qualityOfLife"
  | "goals"
  | "income";

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "essentials", label: "Essenciais" },
  { id: "qualityOfLife", label: "Qualidade" },
  { id: "goals", label: "Objetivos" },
  { id: "income", label: "Receitas" },
];

export function TransactionsFilters({
  currentCategory,
  currentSearch,
  currentValueCents,
}: {
  currentCategory: CategoryFilter;
  currentSearch: string;
  currentValueCents: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [valueReais, setValueReais] = useState(currentValueCents / 100);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  function applyCategory(cat: CategoryFilter) {
    const next = new URLSearchParams(params);
    if (cat === "all") next.delete("cat");
    else next.set("cat", cat);
    navigate(next);
  }

  useEffect(() => {
    // Sincroniza search local com URL quando o prop muda externamente
    // (ex: back button, link compartilhado). O debounce abaixo previne loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValueReais(currentValueCents / 100);
  }, [currentValueCents]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      const trimmed = search.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      if ((next.get("q") ?? "") !== (params.get("q") ?? "")) {
        navigate(next);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (valueDebounceRef.current) clearTimeout(valueDebounceRef.current);
    valueDebounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      const cents = Math.round(valueReais * 100);
      if (cents > 0) next.set("v", String(cents));
      else next.delete("v");
      if ((next.get("v") ?? "") !== (params.get("v") ?? "")) {
        navigate(next);
      }
    }, 1500);
    return () => {
      if (valueDebounceRef.current) clearTimeout(valueDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueReais]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_140px] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full hover:bg-accent transition-colors"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="relative">
          <MoneyInput
            value={valueReais}
            onValueChange={setValueReais}
            placeholder="Valor"
            className={valueReais > 0 ? "pr-9" : undefined}
          />
          {valueReais > 0 ? (
            <button
              type="button"
              onClick={() => setValueReais(0)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full hover:bg-accent transition-colors"
              aria-label="Limpar valor"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1">
        {CATEGORY_OPTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => applyCategory(c.id)}
            className={cn(
              "shrink-0 rounded-full border h-8 px-4 text-xs font-medium transition-colors",
              currentCategory === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
