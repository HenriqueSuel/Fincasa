import { addMonths } from "date-fns";

export interface CardRef {
  closingDay: number;
  dueDay: number;
}

/**
 * Ajusta o `day` pra um mês específico respeitando o último dia do mês
 * (ex: "vencimento dia 31" em fevereiro vira 28/29).
 */
function clampDayToMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

/**
 * Data da fatura em que uma compra cai, dado o dia de fechamento do cartão.
 *
 * - Se a compra foi feita **até** o fechamento desse mês → fatura do mês corrente
 *   (vence no mês seguinte)
 * - Se foi **depois** do fechamento → fatura do mês seguinte
 *   (vence daqui a 2 meses)
 *
 * Retorna a data de **vencimento** (dueDay no respectivo mês).
 */
export function firstInvoiceDueDate(
  purchaseDate: Date,
  card: CardRef,
): Date {
  const year = purchaseDate.getFullYear();
  const monthIndex = purchaseDate.getMonth();
  const day = purchaseDate.getDate();

  // Se comprou até o fechamento → fatura fecha neste mês.
  // A fatura vence no próximo mês (se dueDay > closingDay) ou 2 meses depois.
  // Convenção comum: se dueDay > closingDay → due = mês(closing)+1
  //                  senão (due <= closing) → due = mês(closing)+2 (fatura vira)
  const boughtAfterClosing = day > card.closingDay;
  const closingMonthOffset = boughtAfterClosing ? 1 : 0;

  // Quantos meses entre fechamento e vencimento
  const dueMonthOffsetFromClosing =
    card.dueDay > card.closingDay ? 1 : card.dueDay < card.closingDay ? 1 : 0;

  const totalOffset = closingMonthOffset + dueMonthOffsetFromClosing;
  return clampDayToMonth(year, monthIndex + totalOffset, card.dueDay);
}

/**
 * Gera as datas de todas as N parcelas. Primeira parcela via `firstInvoiceDueDate`,
 * as seguintes em intervalos mensais preservando o `dueDay`.
 */
export function computeInstallmentDates(
  purchaseDate: Date,
  installments: number,
  card: CardRef | null,
): Date[] {
  if (installments < 1) return [];

  if (!card) {
    // Sem cartão configurado: mantém comportamento anterior
    // (parcela 1 = data da compra, demais = +i meses)
    return Array.from({ length: installments }, (_, i) =>
      addMonths(purchaseDate, i),
    );
  }

  const firstDue = firstInvoiceDueDate(purchaseDate, card);
  const year = firstDue.getFullYear();
  const monthIndex = firstDue.getMonth();
  return Array.from({ length: installments }, (_, i) =>
    clampDayToMonth(year, monthIndex + i, card.dueDay),
  );
}
