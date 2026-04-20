import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type {
  CustomSubcategory,
  Goal,
  Household,
  Invite,
  Transaction,
  User,
} from "@/types/domain";

type Snap = FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot;

function ts(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error("Invalid Firestore timestamp field");
}

function tsOpt(value: unknown): Date | undefined {
  if (value == null) return undefined;
  return ts(value);
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export function toUser(snap: Snap): User {
  const d = snap.data();
  if (!d) throw new Error("User doc missing");
  return {
    id: snap.id,
    name: d.name,
    email: d.email ?? "",
    photoURL: d.photoURL ?? null,
    currentHouseholdId: d.currentHouseholdId ?? null,
    householdIds: Array.isArray(d.householdIds) ? d.householdIds : [],
    preferences: {
      theme: d.preferences?.theme ?? "dark",
      defaultView: d.preferences?.defaultView ?? "family",
    },
    createdAt: ts(d.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export function toHousehold(snap: Snap): Household {
  const d = snap.data();
  if (!d) throw new Error("Household doc missing");
  const members: Household["members"] = {};
  for (const [uid, raw] of Object.entries(
    (d.members ?? {}) as Record<string, Record<string, unknown>>,
  )) {
    members[uid] = {
      role: (raw.role as Household["members"][string]["role"]) ?? "member",
      name: String(raw.name ?? ""),
      photoURL: (raw.photoURL as string | null | undefined) ?? null,
      monthlyIncome: Number(raw.monthlyIncome ?? 0),
      joinedAt: ts(raw.joinedAt),
    };
  }
  return {
    id: snap.id,
    name: d.name,
    createdBy: d.createdBy,
    members,
    memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
    combinedMonthlyIncome: Number(d.combinedMonthlyIncome ?? 0),
    budgetAllocation: {
      essentials: d.budgetAllocation?.essentials ?? 0.4,
      qualityOfLife: d.budgetAllocation?.qualityOfLife ?? 0.15,
      goals: d.budgetAllocation?.goals ?? 0.45,
    },
    currency: "BRL",
    createdAt: ts(d.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export function toTransaction(snap: Snap): Transaction {
  const d = snap.data();
  if (!d) throw new Error("Transaction doc missing");
  return {
    id: snap.id,
    type: d.type,
    amount: Number(d.amount ?? 0),
    description: d.description ?? "",
    category: d.category,
    subcategory: d.subcategory ?? "",
    customSubcategory: d.customSubcategory ?? undefined,
    goalId: d.goalId ?? undefined,
    date: ts(d.date),
    paymentMethod: d.paymentMethod ?? undefined,
    createdBy: d.createdBy,
    createdByName: d.createdByName ?? "",
    installment:
      d.installmentId && d.installmentNumber && d.installmentCount
        ? {
            id: d.installmentId,
            number: d.installmentNumber,
            count: d.installmentCount,
            total: Number(d.installmentTotal ?? d.amount ?? 0),
          }
        : undefined,
    recurring:
      d.recurringId && typeof d.recurringIndex === "number"
        ? {
            id: d.recurringId,
            frequency: d.recurringFrequency ?? "monthly",
            index: d.recurringIndex,
            total: d.recurringTotal ?? 12,
          }
        : undefined,
    createdAt: ts(d.createdAt),
    updatedAt: ts(d.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

export function toGoal(snap: Snap): Goal {
  const d = snap.data();
  if (!d) throw new Error("Goal doc missing");
  return {
    id: snap.id,
    name: d.name,
    icon: d.icon,
    color: d.color,
    category: d.category,
    priority: d.priority,
    status: d.status,
    targetAmount: Number(d.targetAmount ?? 0),
    currentAmount: Number(d.currentAmount ?? 0),
    monthlyContribution: Number(d.monthlyContribution ?? 0),
    startDate: ts(d.startDate),
    estimatedEndDate: ts(d.estimatedEndDate),
    createdBy: d.createdBy,
    createdAt: ts(d.createdAt ?? d.startDate),
  };
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export function toInvite(snap: Snap): Invite {
  const d = snap.data();
  if (!d) throw new Error("Invite doc missing");
  return {
    id: snap.id,
    token: d.token,
    invitedBy: d.invitedBy,
    invitedByName: d.invitedByName,
    householdName: d.householdName,
    status: d.status,
    createdAt: ts(d.createdAt),
    expiresAt: ts(d.expiresAt),
    usedBy: d.usedBy ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// CustomSubcategory
// ---------------------------------------------------------------------------

export function toCustomSubcategory(snap: Snap): CustomSubcategory {
  const d = snap.data();
  if (!d) throw new Error("CustomSubcategory doc missing");
  return {
    id: snap.id,
    category: d.category,
    name: d.name,
    icon: d.icon ?? undefined,
    createdBy: d.createdBy,
    createdAt: tsOpt(d.createdAt) ?? new Date(0),
  };
}
