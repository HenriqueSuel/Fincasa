import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toTransaction } from "@/lib/firebase/converters";
import type { Transaction } from "@/types/domain";

const MAX_TRANSACTIONS_PER_QUERY = 500;

export async function listTransactions(params: {
  householdId: string;
  from: Date;
  to: Date;
  memberId?: string;
  limit?: number;
}): Promise<Transaction[]> {
  let q = adminDb()
    .collection("households")
    .doc(params.householdId)
    .collection("transactions")
    .where("date", ">=", Timestamp.fromDate(params.from))
    .where("date", "<", Timestamp.fromDate(params.to));

  if (params.memberId) {
    q = q.where("createdBy", "==", params.memberId);
  }

  const snap = await q
    .orderBy("date", "desc")
    .limit(params.limit ?? MAX_TRANSACTIONS_PER_QUERY)
    .get();

  return snap.docs.map(toTransaction);
}

export function monthRange(year: number, monthIndex: number) {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { from, to };
}
