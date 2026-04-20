import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export interface TransactionItem {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  category: string;
  subcategory: string;
  date: Date;
  createdBy: string;
  createdByName: string;
  paymentMethod?: string;
  installmentId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  installmentTotal?: number;
  recurringId?: string;
  recurringFrequency?: "monthly" | "weekly";
  recurringIndex?: number;
  recurringTotal?: number;
}

export async function listTransactions(params: {
  householdId: string;
  from: Date;
  to: Date;
  memberId?: string;
}): Promise<TransactionItem[]> {
  let q = adminDb()
    .collection("households")
    .doc(params.householdId)
    .collection("transactions")
    .where("date", ">=", Timestamp.fromDate(params.from))
    .where("date", "<", Timestamp.fromDate(params.to));

  if (params.memberId) {
    q = q.where("createdBy", "==", params.memberId);
  }

  const snap = await q.orderBy("date", "desc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      date: (data.date as Timestamp).toDate(),
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      paymentMethod: data.paymentMethod,
      installmentId: data.installmentId,
      installmentNumber: data.installmentNumber,
      installmentCount: data.installmentCount,
      installmentTotal: data.installmentTotal,
      recurringId: data.recurringId,
      recurringFrequency: data.recurringFrequency,
      recurringIndex: data.recurringIndex,
      recurringTotal: data.recurringTotal,
    };
  });
}

export function monthRange(year: number, monthIndex: number) {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { from, to };
}
