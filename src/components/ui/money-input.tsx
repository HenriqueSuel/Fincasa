"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function centsToDisplay(cents: number) {
  return fmt.format(cents / 100);
}

interface Props {
  name: string;
  id?: string;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

export function MoneyInput({
  name,
  id,
  defaultValue = 0,
  onValueChange,
  required,
  className,
  placeholder = "0,00",
  ...rest
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [cents, setCents] = useState<number>(() =>
    Math.round((defaultValue ?? 0) * 100),
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const next = digits === "" ? 0 : Number.parseInt(digits, 10);
    const safe = Number.isFinite(next) ? next : 0;
    setCents(safe);
    onValueChange?.(safe / 100);
  }

  const display = cents === 0 ? "" : centsToDisplay(cents);
  const value = cents / 100;

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
        R$
      </span>
      <Input
        {...rest}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={cn("pl-9 tabular-nums", className)}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
