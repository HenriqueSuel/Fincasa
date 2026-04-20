import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { toCustomSubcategory } from "@/lib/firebase/converters";
import type { CustomSubcategory } from "@/types/domain";

export async function listCustomSubcategories(
  householdId: string,
): Promise<CustomSubcategory[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .orderBy("name")
    .get();
  return snap.docs.map(toCustomSubcategory);
}
