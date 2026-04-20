import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { toLoan, toLoanRepayment } from "@/lib/firebase/converters";
import type { Loan, LoanRepayment } from "@/types/domain";

export async function listLoans(
  householdId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Loan[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .orderBy("createdAt", "desc")
    .get();
  const items = snap.docs.map(toLoan);
  if (opts.activeOnly) return items.filter((l) => l.status === "active");
  return items;
}

export async function getLoan(
  householdId: string,
  loanId: string,
): Promise<Loan | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId)
    .get();
  if (!snap.exists) return null;
  return toLoan(snap);
}

export async function listRepayments(
  householdId: string,
  loanId: string,
): Promise<LoanRepayment[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId)
    .collection("repayments")
    .orderBy("paidAt", "desc")
    .get();
  return snap.docs.map(toLoanRepayment);
}

export async function listDebtorSuggestions(
  householdId: string,
): Promise<string[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .get();
  const seen = new Map<string, string>();
  for (const doc of snap.docs) {
    const d = doc.data();
    const name = String(d.debtorName ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
