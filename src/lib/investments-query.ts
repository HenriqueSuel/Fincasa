import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { toInvestment, toInvestmentEvent } from "@/lib/firebase/converters";
import type { Investment, InvestmentEvent } from "@/types/domain";

export async function listInvestments(
  householdId: string,
  goalId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Investment[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId)
    .collection("investments")
    .orderBy("createdAt", "desc")
    .get();
  const items = snap.docs.map(toInvestment);
  if (opts.includeArchived) return items;
  return items.filter((i) => !i.archived);
}

export async function getInvestment(
  householdId: string,
  goalId: string,
  investmentId: string,
): Promise<Investment | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId)
    .collection("investments")
    .doc(investmentId)
    .get();
  if (!snap.exists) return null;
  return toInvestment(snap);
}

export async function listInvestmentEvents(
  householdId: string,
  goalId: string,
  investmentId: string,
): Promise<InvestmentEvent[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId)
    .collection("investments")
    .doc(investmentId)
    .collection("events")
    .orderBy("date", "desc")
    .get();
  return snap.docs.map(toInvestmentEvent);
}
