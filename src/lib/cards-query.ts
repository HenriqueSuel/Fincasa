import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toCreditCard, toTransaction } from "@/lib/firebase/converters";
import type { CreditCard, Transaction } from "@/types/domain";

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

/**
 * Transações de um cartão entre duas datas (inclusive/exclusive).
 * Use pra montar fatura agregada ou visões por período.
 */
export async function listCardTransactions(
  householdId: string,
  cardId: string,
  from: Date,
  to: Date,
): Promise<Transaction[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .where("cardId", "==", cardId)
    .where("date", ">=", Timestamp.fromDate(from))
    .where("date", "<", Timestamp.fromDate(to))
    .orderBy("date", "asc")
    .get();
  return snap.docs.map(toTransaction);
}
