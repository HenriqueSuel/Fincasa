import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type {
  CreditCard,
  CustomSubcategory,
  Goal,
  Household,
  Invite,
  ShoppingItem,
  ShoppingListEntry,
  ShoppingPurchase,
  ShoppingTrip,
  Transaction,
  User,
  WeightSpec,
} from "@/types/domain";
import type { WeightUnit } from "@/types/enums";

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
    tripId: d.tripId ?? undefined,
    cardId: d.cardId ?? undefined,
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

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

function toWeight(raw: unknown): WeightSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as { value?: unknown; unit?: unknown };
  if (typeof r.value !== "number" || typeof r.unit !== "string") return undefined;
  return { value: r.value, unit: r.unit as WeightUnit };
}

export function toShoppingItem(snap: Snap): ShoppingItem {
  const d = snap.data();
  if (!d) throw new Error("ShoppingItem doc missing");
  return {
    id: snap.id,
    name: d.name,
    nameLower: d.nameLower ?? (d.name as string).toLowerCase(),
    nameNormalized: d.nameNormalized ?? d.nameLower ?? "",
    section: d.section ?? "outros",
    defaultBrand: d.defaultBrand ?? undefined,
    defaultWeight: toWeight(d.defaultWeight),
    defaultQuantity: d.defaultQuantity ?? undefined,
    lastPrice: d.lastPrice ?? undefined,
    averagePrice90d: d.averagePrice90d ?? undefined,
    purchaseCount: Number(d.purchaseCount ?? 0),
    lastPurchasedAt: tsOpt(d.lastPurchasedAt),
    archived: d.archived === true ? true : undefined,
    createdBy: d.createdBy,
    createdAt: ts(d.createdAt),
  };
}

export function toShoppingPurchase(snap: Snap): ShoppingPurchase {
  const d = snap.data();
  if (!d) throw new Error("ShoppingPurchase doc missing");
  return {
    id: snap.id,
    price: Number(d.price ?? 0),
    brand: d.brand ?? undefined,
    store: d.store ?? undefined,
    weight: toWeight(d.weight),
    quantity: Number(d.quantity ?? 1),
    tripId: d.tripId,
    purchasedBy: d.purchasedBy,
    purchasedByName: d.purchasedByName ?? "",
    purchasedAt: ts(d.purchasedAt),
  };
}

export function toShoppingListEntry(snap: Snap): ShoppingListEntry {
  const d = snap.data();
  if (!d) throw new Error("ShoppingListEntry doc missing");
  return {
    id: snap.id,
    itemId: d.itemId,
    itemName: d.itemName,
    itemSection: d.itemSection ?? "outros",
    desiredBrand: d.desiredBrand ?? undefined,
    desiredWeight: toWeight(d.desiredWeight),
    desiredQuantity: Number(d.desiredQuantity ?? 1),
    averagePrice90dSnapshot: d.averagePrice90dSnapshot ?? undefined,
    lastPriceSnapshot: d.lastPriceSnapshot ?? undefined,
    status: d.status ?? "pending",
    priceAtCheckout: d.priceAtCheckout ?? undefined,
    brandAtCheckout: d.brandAtCheckout ?? undefined,
    weightAtCheckout: toWeight(d.weightAtCheckout),
    quantityAtCheckout: d.quantityAtCheckout ?? undefined,
    tripId: d.tripId ?? undefined,
    purchaseId: d.purchaseId ?? undefined,
    addedBy: d.addedBy,
    addedAt: ts(d.addedAt),
    checkedAt: tsOpt(d.checkedAt),
    boughtAt: tsOpt(d.boughtAt),
  };
}

export function toCreditCard(snap: Snap): CreditCard {
  const d = snap.data();
  if (!d) throw new Error("CreditCard doc missing");
  return {
    id: snap.id,
    name: d.name,
    closingDay: Number(d.closingDay ?? 1),
    dueDay: Number(d.dueDay ?? 10),
    color: d.color ?? undefined,
    createdBy: d.createdBy,
    createdAt: ts(d.createdAt),
  };
}

export function toShoppingTrip(snap: Snap): ShoppingTrip {
  const d = snap.data();
  if (!d) throw new Error("ShoppingTrip doc missing");
  return {
    id: snap.id,
    storeName: d.storeName,
    total: Number(d.total ?? 0),
    paymentMethod: d.paymentMethod ?? undefined,
    transactionId: d.transactionId,
    itemCount: Number(d.itemCount ?? 0),
    purchasedBy: d.purchasedBy,
    purchasedByName: d.purchasedByName ?? "",
    purchasedAt: ts(d.purchasedAt),
    createdAt: ts(d.createdAt),
  };
}
