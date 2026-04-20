"use client";

import { forwardRef, useMemo, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  /** Casas decimais fixas. 2 = "1,50". 0 = "150". Default: 2. */
  decimals?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Input numérico com máscara pt-BR. Segue o mesmo padrão do MoneyInput —
 * usuário digita só dígitos, a formatação "desce" da direita.
 * Decimais configuráveis (0 pra inteiros tipo gramas, 2 pra kg/L, etc).
 */
export const DecimalInput = forwardRef<HTMLInputElement, Props>(
  function DecimalInput(
    {
      id,
      value,
      onValueChange,
      onBlur,
      disabled,
      required,
      className,
      placeholder,
      decimals = 2,
      ...aria
    },
    ref,
  ) {
    const fmt = useMemo(
      () =>
        new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      [decimals],
    );
    const multiplier = useMemo(
      () => Math.pow(10, decimals),
      [decimals],
    );

    const units = Math.round((value ?? 0) * multiplier);
    const display = units === 0 ? "" : fmt.format(units / multiplier);
    const defaultPlaceholder = decimals === 0 ? "0" : `0,${"0".repeat(decimals)}`;

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, "");
      const nextUnits = digits === "" ? 0 : Number.parseInt(digits, 10);
      const safe = Number.isFinite(nextUnits) ? nextUnits : 0;
      onValueChange(safe / multiplier);
    }

    return (
      <Input
        {...aria}
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
        placeholder={placeholder ?? defaultPlaceholder}
        className={cn("tabular-nums", className)}
      />
    );
  },
);
