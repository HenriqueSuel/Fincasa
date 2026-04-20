export function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  const needsQuote = /[",\n\r;]/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function rowsToCsv(
  rows: (string | number | undefined | null)[][],
  separator = ",",
): string {
  return rows
    .map((row) => row.map(escapeCsvCell).join(separator))
    .join("\r\n");
}
