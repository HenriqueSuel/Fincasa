import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { toGoal } from "@/lib/firebase/converters";
import type { Goal } from "@/types/domain";

export async function listGoals(
  householdId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Goal[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .orderBy("createdAt", "desc")
    .get();
  const items = snap.docs.map(toGoal);
  if (opts.activeOnly) return items.filter((g) => g.status === "active");
  return items;
}

export async function getGoal(
  householdId: string,
  goalId: string,
): Promise<Goal | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId)
    .get();
  if (!snap.exists) return null;
  return toGoal(snap);
}
