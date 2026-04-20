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
