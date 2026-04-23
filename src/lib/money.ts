export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number) {
  return BRL.format(value);
}

export function formatSignedBRL(value: number, type: "income" | "expense" | "transfer") {
  const abs = Math.abs(value);
  if (type === "income") return `+ ${BRL.format(abs)}`;
  if (type === "expense") return `− ${BRL.format(abs)}`;
  return BRL.format(abs);
}

/**
 * Classifica uma transação pra UI: ícone de sinal (+/−) e cor.
 *
 * - income → + verde
 * - expense → − vermelho
 * - transfer → neutro
 * - investment + direction=out → − âmbar (aporte, sai do caixa mas não é gasto)
 * - investment + direction=in → + âmbar (resgate, volta pro caixa mas não é receita)
 */
export function signedAmountPresentation(
  type: "income" | "expense" | "transfer" | "investment",
  amount: number,
  direction?: "in" | "out",
): { signed: string; toneClass: string } {
  const abs = Math.abs(amount);
  if (type === "income") {
    return { signed: `+ ${BRL.format(abs)}`, toneClass: "text-primary" };
  }
  if (type === "expense") {
    return { signed: `− ${BRL.format(abs)}`, toneClass: "text-destructive" };
  }
  if (type === "investment") {
    const sign = direction === "in" ? "+" : "−";
    return {
      signed: `${sign} ${BRL.format(abs)}`,
      toneClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return { signed: BRL.format(abs), toneClass: "text-foreground" };
}
