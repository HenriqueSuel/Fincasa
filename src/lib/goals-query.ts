import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export interface GoalItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "active" | "paused" | "completed";
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: Date;
  estimatedEndDate: Date;
  createdBy: string;
}

function mapDoc(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): GoalItem {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    icon: d.icon,
    color: d.color,
    category: d.category,
    priority: d.priority,
    status: d.status,
    targetAmount: d.targetAmount,
    currentAmount: d.currentAmount ?? 0,
    monthlyContribution: d.monthlyContribution ?? 0,
    startDate: (d.startDate as Timestamp).toDate(),
    estimatedEndDate: (d.estimatedEndDate as Timestamp).toDate(),
    createdBy: d.createdBy,
  };
}

export async function listGoals(
  householdId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<GoalItem[]> {
  let q = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .orderBy("createdAt", "desc");
  const snap = await q.get();
  const items = snap.docs.map(mapDoc);
  if (opts.activeOnly) return items.filter((g) => g.status === "active");
  return items;
}

export async function getGoal(
  householdId: string,
  goalId: string,
): Promise<GoalItem | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId)
    .get();
  if (!snap.exists) return null;
  return mapDoc(snap);
}
