import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getHouseholdContextOrNull } from "@/lib/auth/guards";
import { listTransactions, monthRange } from "@/lib/transactions-query";
import { rowsToCsv } from "@/lib/csv";
import { CATEGORIES } from "@/lib/categories";

const CATEGORY_LABEL: Record<string, string> = {
  essentials: "Essenciais",
  qualityOfLife: "Qualidade de vida",
  goals: "Objetivos",
  income: "Receita",
  transfer: "Transferência",
};

const TYPE_LABEL: Record<string, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
};

const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

export async function GET(request: NextRequest) {
  const ctx = await getHouseholdContextOrNull();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const now = new Date();
  const year = Number(sp.get("y") ?? now.getFullYear());
  const monthIndex = Number(sp.get("m") ?? now.getMonth());
  const view = sp.get("view") ?? "family";

  const memberId =
    view === "mine"
      ? ctx.uid
      : view === "partner" && ctx.partnerId
        ? ctx.partnerId
        : undefined;

  const { from, to } = monthRange(year, monthIndex);
  const txs = await listTransactions({
    householdId: ctx.householdId,
    from,
    to,
    memberId,
  });

  const CATEGORY_ICON = new Map<string, string>();
  for (const c of CATEGORIES) {
    for (const s of c.subcategories) CATEGORY_ICON.set(s.name, s.icon);
  }

  const rows: (string | number | undefined | null)[][] = [
    [
      "Data",
      "Descrição",
      "Tipo",
      "Categoria",
      "Subcategoria",
      "Valor (R$)",
      "Lançado por",
      "Pagamento",
      "Parcela",
    ],
  ];

  for (const t of txs) {
    rows.push([
      format(t.date, "yyyy-MM-dd"),
      t.description,
      TYPE_LABEL[t.type] ?? t.type,
      CATEGORY_LABEL[t.category] ?? t.category,
      t.subcategory,
      t.amount.toFixed(2).replace(".", ","),
      t.createdByName,
      t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "",
      t.installment
        ? `${t.installment.number}/${t.installment.count}`
        : "",
    ]);
  }

  const csv = rowsToCsv(rows, ";");
  const bom = "\uFEFF";
  const body = bom + csv;

  const monthSlug = format(new Date(year, monthIndex, 1), "yyyy-MM");
  const viewSlug = view === "family" ? "familia" : view;
  const filename = `fincasa-${monthSlug}-${viewSlug}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
