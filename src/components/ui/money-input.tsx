"use client";

import { forwardRef, useMemo, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface Props {
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  {
    id,
    value,
    onValueChange,
    onBlur,
    disabled,
    required,
    className,
    placeholder = "0,00",
    ...aria
  },
  ref,
) {
  const cents = useMemo(() => Math.round((value ?? 0) * 100), [value]);
  const display = cents === 0 ? "" : fmt.format(cents / 100);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const nextCents = digits === "" ? 0 : Number.parseInt(digits, 10);
    const safe = Number.isFinite(nextCents) ? nextCents : 0;
    onValueChange(safe / 100);
  }

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none"
      >
        R$
      </span>
      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={cn("pl-9 tabular-nums", className)}
        {...aria}
      />
    </div>
  );
});
