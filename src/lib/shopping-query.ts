import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  toShoppingItem,
  toShoppingListEntry,
  toShoppingPurchase,
  toShoppingTrip,
} from "@/lib/firebase/converters";
import type {
  ShoppingItem,
  ShoppingListEntry,
  ShoppingPurchase,
  ShoppingTrip,
} from "@/types/domain";

const MAX_CATALOG = 500;
const MAX_PURCHASES = 30;

export async function listCatalog(
  householdId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<ShoppingItem[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingItems")
    .orderBy("lastPurchasedAt", "desc")
    .limit(MAX_CATALOG)
    .get();
  const items = snap.docs.map(toShoppingItem);
  return opts.includeArchived ? items : items.filter((i) => !i.archived);
}

export async function getShoppingItem(
  householdId: string,
  itemId: string,
): Promise<ShoppingItem | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingItems")
    .doc(itemId)
    .get();
  if (!snap.exists) return null;
  return toShoppingItem(snap);
}

export async function listItemPurchases(
  householdId: string,
  itemId: string,
  limit = MAX_PURCHASES,
): Promise<ShoppingPurchase[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingItems")
    .doc(itemId)
    .collection("purchases")
    .orderBy("purchasedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(toShoppingPurchase);
}

export async function listShoppingList(
  householdId: string,
): Promise<ShoppingListEntry[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingList")
    .orderBy("addedAt", "asc")
    .get();
  return snap.docs.map(toShoppingListEntry);
}

export async function getActiveEntryForItem(
  householdId: string,
  itemId: string,
): Promise<ShoppingListEntry | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingList")
    .where("itemId", "==", itemId)
    .where("status", "in", ["pending", "checked"])
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toShoppingListEntry(snap.docs[0]!);
}

export async function getTrip(
  householdId: string,
  tripId: string,
): Promise<ShoppingTrip | null> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingTrips")
    .doc(tripId)
    .get();
  if (!snap.exists) return null;
  return toShoppingTrip(snap);
}

export async function listTripPurchases(
  householdId: string,
  tripId: string,
): Promise<Array<ShoppingPurchase & { itemId: string; itemName: string }>> {
  const snap = await adminDb()
    .collectionGroup("purchases")
    .where("tripId", "==", tripId)
    .get();
  const rows: Array<ShoppingPurchase & { itemId: string; itemName: string }> = [];
  for (const d of snap.docs) {
    const itemRef = d.ref.parent.parent;
    if (!itemRef) continue;
    const itemSnap = await itemRef.get();
    const itemName = itemSnap.data()?.name ?? "";
    rows.push({ ...toShoppingPurchase(d), itemId: itemRef.id, itemName });
  }
  rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
  return rows;
}

export async function listStoreNames(
  householdId: string,
  limit = 20,
): Promise<string[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("shoppingTrips")
    .orderBy("purchasedAt", "desc")
    .limit(50)
    .get();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of snap.docs) {
    const name = d.data().storeName as string | undefined;
    if (!name) continue;
    const key = name.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}
