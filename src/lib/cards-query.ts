import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { toCreditCard } from "@/lib/firebase/converters";
import type { CreditCard } from "@/types/domain";

export async function listCards(householdId: string): Promise<CreditCard[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("creditCards")
    .orderBy("name")
    .get();
  return snap.docs.map(toCreditCard);
}

export async function getCard(
  householdId: string,
  cardId: string,
): Promise<CreditCard | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("creditCards")
    .doc(cardId)
    .get();
  if (!snap.exists) return null;
  return toCreditCard(snap);
}
