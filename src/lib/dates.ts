/**
 * Converte uma string "YYYY-MM-DD" (vinda de <input type="date">) em um
 * Date em timezone local, evitando o bug do `new Date("2026-04-19")` que
 * interpreta como UTC 00:00 e "volta" um dia em fusos negativos (ex: BR).
 *
 * Retorna null se a string for inválida.
 */
export function parseLocalDate(input: string | undefined | null): Date | null {
  if (!input) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const monthIndex = Number(m) - 1;
  const day = Number(d);
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Formata um Date como "YYYY-MM-DD" em timezone local (para agrupamento,
 * input[type=date] value, etc). Não use toISOString() — cai em UTC.
 */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
