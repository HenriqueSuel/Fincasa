import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { listTransactions, monthRange } from "@/lib/transactions-query";

export interface CategorySlice {
  category: "essentials" | "qualityOfLife" | "goals";
  label: string;
  color: string;
  spent: number;
  budget: number;
}

export interface MemberSlice {
  memberId: string;
  name: string;
  income: number;
  expense: number;
  byCategory: { essentials: number; qualityOfLife: number; goals: number };
}

export interface MonthPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
}

export interface SubcategoryPoint {
  name: string;
  category: "essentials" | "qualityOfLife" | "goals";
  color: string;
  spent: number;
}

const CATEGORY_META: {
  id: CategorySlice["category"];
  label: string;
  color: string;
  allocation: number;
}[] = [
  { id: "essentials", label: "Essenciais", color: "#EF4444", allocation: 0.4 },
  {
    id: "qualityOfLife",
    label: "Qualidade de vida",
    color: "#F59E0B",
    allocation: 0.15,
  },
  { id: "goals", label: "Objetivos", color: "#10B981", allocation: 0.45 },
];

async function sumByBudgetCategory(
  householdId: string,
  year: number,
  month: number,
) {
  const { from, to } = monthRange(year, month);
  const txs = await listTransactions({ householdId, from, to });
  const totals = { essentials: 0, qualityOfLife: 0, goals: 0 };
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (t.category === "essentials") totals.essentials += t.amount;
    else if (t.category === "qualityOfLife") totals.qualityOfLife += t.amount;
    else if (t.category === "goals") totals.goals += t.amount;
  }
  return totals;
}

export async function categoryBreakdown(
  householdId: string,
  year: number,
  month: number,
  baseIncome: number,
): Promise<CategorySlice[]> {
  const totals = await sumByBudgetCategory(householdId, year, month);
  return CATEGORY_META.map((m) => ({
    category: m.id,
    label: m.label,
    color: m.color,
    spent: totals[m.id],
    budget: baseIncome * m.allocation,
  }));
}

export interface CategoryComparison {
  category: CategorySlice["category"];
  previousSpent: number;
  changeAbs: number;
  changePct: number | null;
  previousLabel: string;
}

export interface InvestmentSummary {
  contributions: number;
  withdrawals: number;
  net: number;
}

export async function investmentSummary(
  householdId: string,
  year: number,
  month: number,
): Promise<InvestmentSummary> {
  const { from, to } = monthRange(year, month);
  const txs = await listTransactions({ householdId, from, to });
  let contributions = 0;
  let withdrawals = 0;
  for (const t of txs) {
    if (t.type !== "investment") continue;
    if (t.investmentDirection === "in") withdrawals += t.amount;
    else contributions += t.amount;
  }
  return {
    contributions,
    withdrawals,
    net: contributions - withdrawals,
  };
}

export async function categoryComparison(
  householdId: string,
  year: number,
  month: number,
  current: CategorySlice[],
): Promise<CategoryComparison[]> {
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const previous = await sumByBudgetCategory(
    householdId,
    prevYear,
    prevMonthIndex,
  );
  const previousLabel = new Date(prevYear, prevMonthIndex, 1).toLocaleDateString(
    "pt-BR",
    { month: "short", year: "2-digit" },
  );
  return current.map((c) => {
    const prev = previous[c.category];
    const changeAbs = c.spent - prev;
    const changePct = prev > 0 ? (changeAbs / prev) * 100 : null;
    return {
      category: c.category,
      previousSpent: prev,
      changeAbs,
      changePct,
      previousLabel,
    };
  });
}

export async function memberBreakdown(
  householdId: string,
  year: number,
  month: number,
  members: Array<{ id: string; name: string }>,
): Promise<MemberSlice[]> {
  const { from, to } = monthRange(year, month);
  const txs = await listTransactions({ householdId, from, to });
  return members.map((m) => {
    const own = txs.filter(
      (t) => t.createdBy === m.id && t.category !== "loans",
    );
    const income = own
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = own
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const byCategory = { essentials: 0, qualityOfLife: 0, goals: 0 };
    for (const t of own) {
      if (t.type !== "expense") continue;
      if (t.category === "essentials") byCategory.essentials += t.amount;
      else if (t.category === "qualityOfLife") byCategory.qualityOfLife += t.amount;
      else if (t.category === "goals") byCategory.goals += t.amount;
    }
    return { memberId: m.id, name: m.name, income, expense, byCategory };
  });
}

export async function subcategoryBreakdown(
  householdId: string,
  year: number,
  month: number,
  limit = 5,
): Promise<SubcategoryPoint[]> {
  const { from, to } = monthRange(year, month);
  const txs = await listTransactions({ householdId, from, to });
  const colorByCategory: Record<string, string> = {
    essentials: "#EF4444",
    qualityOfLife: "#F59E0B",
    goals: "#10B981",
  };
  const map = new Map<string, SubcategoryPoint>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (
      t.category !== "essentials" &&
      t.category !== "qualityOfLife" &&
      t.category !== "goals"
    ) {
      continue;
    }
    const key = `${t.category}::${t.subcategory}`;
    const existing = map.get(key);
    if (existing) {
      existing.spent += t.amount;
    } else {
      map.set(key, {
        name: t.subcategory,
        category: t.category,
        color: colorByCategory[t.category] ?? "#6B7280",
        spent: t.amount,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit);
}

export async function monthlyTrend(
  householdId: string,
  anchorYear: number,
  anchorMonth: number,
  monthsBack: number,
): Promise<MonthPoint[]> {
  const points: MonthPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = anchorMonth - i;
    let y = anchorYear;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const { from, to } = monthRange(y, m);
    const snap = await adminDb()
      .collection("households")
      .doc(householdId)
      .collection("transactions")
      .where("date", ">=", Timestamp.fromDate(from))
      .where("date", "<", Timestamp.fromDate(to))
      .get();

    let income = 0;
    let expense = 0;
    for (const d of snap.docs) {
      const t = d.data();
      if (t.category === "loans") continue;
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
    }
    const label = new Date(y, m, 1).toLocaleDateString("pt-BR", {
      month: "short",
    });
    points.push({ year: y, month: m, label, income, expense });
  }
  return points;
}
