"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { applyFieldErrors, type ActionState } from "@/lib/action-state";
import { getCard } from "@/lib/cards-query";
import {
  computeInstallmentDates,
  firstInvoiceDueDate,
} from "@/lib/installments";
import { guessSection, normalizeName } from "@/lib/shopping/categorize";
import {
  addListItemSchema,
  linkListItemSchema,
  recordPurchaseSchema,
  toggleCheckSchema,
  updateListEntrySchema,
  updateShoppingItemSchema,
  type RecordPurchaseInput,
  type ToggleCheckInput,
  type UpdateListEntryInput,
  type UpdateShoppingItemInput,
} from "@/lib/validators";

export type ShoppingActionState = ActionState;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findOrCreateCatalogItem(
  householdId: string,
  name: string,
  uid: string,
): Promise<{ id: string; data: FirebaseFirestore.DocumentData }> {
  const db = adminDb();
  const col = db
    .collection("households")
    .doc(householdId)
    .collection("shoppingItems");

  const nameLower = name.trim().toLowerCase();
  const nameNormalized = normalizeName(name);

  const existing = await col
    .where("nameLower", "==", nameLower)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    return { id: doc.id, data: doc.data() };
  }

  const ref = col.doc();
  const data = {
    name: name.trim(),
    nameLower,
    nameNormalized,
    section: guessSection(name),
    purchaseCount: 0,
    createdBy: uid,
    createdAt: Timestamp.now(),
  };
  await ref.set(data);
  return { id: ref.id, data };
}

// ---------------------------------------------------------------------------
// Add / link to list
// ---------------------------------------------------------------------------

export async function addListItem(formData: FormData): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = addListItemSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
  });
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const db = adminDb();
  const listCol = db
    .collection("households")
    .doc(ctx.householdId)
    .collection("shoppingList");

  const item = await findOrCreateCatalogItem(
    ctx.householdId,
    parsed.data.name,
    ctx.uid,
  );

  const duplicate = await listCol
    .where("itemId", "==", item.id)
    .where("status", "in", ["pending", "checked"])
    .limit(1)
    .get();
  if (!duplicate.empty) {
    return { error: "Esse item já está na lista." };
  }

  await listCol.add({
    itemId: item.id,
    itemName: item.data.name,
    itemSection: item.data.section ?? "outros",
    desiredBrand: item.data.defaultBrand ?? null,
    desiredWeight: item.data.defaultWeight ?? null,
    desiredQuantity: item.data.defaultQuantity ?? 1,
    averagePrice90dSnapshot: item.data.averagePrice90d ?? null,
    lastPriceSnapshot: item.data.lastPrice ?? null,
    status: "pending",
    addedBy: ctx.uid,
    addedAt: Timestamp.now(),
  });

  revalidatePath("/shopping");
  revalidatePath("/");
  return { success: true };
}

export async function linkAndAddListItem(
  formData: FormData,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = linkListItemSchema.safeParse({
    itemId: String(formData.get("itemId") ?? "").trim(),
  });
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);
  const itemSnap = await householdRef
    .collection("shoppingItems")
    .doc(parsed.data.itemId)
    .get();
  if (!itemSnap.exists) return { error: "Item não encontrado." };

  const itemData = itemSnap.data()!;

  const listCol = householdRef.collection("shoppingList");
  const duplicate = await listCol
    .where("itemId", "==", parsed.data.itemId)
    .where("status", "in", ["pending", "checked"])
    .limit(1)
    .get();
  if (!duplicate.empty) {
    return { error: "Esse item já está na lista." };
  }

  await listCol.add({
    itemId: parsed.data.itemId,
    itemName: itemData.name,
    itemSection: itemData.section ?? "outros",
    desiredBrand: itemData.defaultBrand ?? null,
    desiredWeight: itemData.defaultWeight ?? null,
    desiredQuantity: itemData.defaultQuantity ?? 1,
    averagePrice90dSnapshot: itemData.averagePrice90d ?? null,
    lastPriceSnapshot: itemData.lastPrice ?? null,
    status: "pending",
    addedBy: ctx.uid,
    addedAt: Timestamp.now(),
  });

  revalidatePath("/shopping");
  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update entry (desired props)
// ---------------------------------------------------------------------------

export async function updateListEntry(
  entryId: string,
  input: UpdateListEntryInput,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = updateListEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const ref = adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("shoppingList")
    .doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Item não encontrado." };
  if (snap.data()?.status === "bought") {
    return { error: "Item já foi comprado." };
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.desiredBrand !== undefined)
    update.desiredBrand = parsed.data.desiredBrand || null;
  if (parsed.data.desiredWeight !== undefined)
    update.desiredWeight = parsed.data.desiredWeight ?? null;
  if (parsed.data.desiredQuantity !== undefined)
    update.desiredQuantity = parsed.data.desiredQuantity;

  if (Object.keys(update).length > 0) await ref.update(update);

  revalidatePath("/shopping");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Toggle check
// ---------------------------------------------------------------------------

export async function toggleCheck(
  entryId: string,
  input: ToggleCheckInput,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = toggleCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const ref = adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("shoppingList")
    .doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Item não encontrado." };
  const data = snap.data()!;
  if (data.status === "bought") {
    return { error: "Item já foi comprado." };
  }

  const toChecked = data.status === "pending";
  if (toChecked) {
    await ref.update({
      status: "checked",
      priceAtCheckout: parsed.data.price ?? null,
      brandAtCheckout: parsed.data.brand || null,
      weightAtCheckout: parsed.data.weight ?? null,
      quantityAtCheckout: parsed.data.quantity ?? data.desiredQuantity ?? 1,
      checkedAt: Timestamp.now(),
    });
  } else {
    await ref.update({
      status: "pending",
      priceAtCheckout: null,
      brandAtCheckout: null,
      weightAtCheckout: null,
      quantityAtCheckout: null,
      checkedAt: null,
    });
  }

  revalidatePath("/shopping");
  return { success: true };
}

export async function updateCheckedPrice(
  entryId: string,
  input: ToggleCheckInput,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = toggleCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const ref = adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("shoppingList")
    .doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Item não encontrado." };
  const current = snap.data();
  if (current?.status === "bought") {
    return { error: "Item já foi comprado." };
  }
  const update: Record<string, unknown> = {
    priceAtCheckout: parsed.data.price ?? null,
    brandAtCheckout: parsed.data.brand || null,
    weightAtCheckout: parsed.data.weight ?? null,
    quantityAtCheckout:
      parsed.data.quantity ?? current?.desiredQuantity ?? 1,
  };
  // Se ainda está pending (pode acontecer por corrida com toggleCheck
  // optimista no client), promove pra checked aqui.
  if (current?.status !== "checked") {
    update.status = "checked";
    update.checkedAt = Timestamp.now();
  }
  await ref.update(update);
  revalidatePath("/shopping");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

export async function removeListItem(
  entryId: string,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);

  try {
    await db.runTransaction(async (tx) => {
      // Fase 1: todos os reads (Firestore exige reads antes de writes)
      const listSnap = await tx.get(householdRef.collection("shoppingList"));
      const target = listSnap.docs.find((d) => d.id === entryId);
      if (!target) return;
      if (target.data().status === "bought") {
        throw new Error("Itens comprados são removidos ao finalizar a lista.");
      }

      // Sobra alguma entry ativa além da que vamos remover?
      const stillActive = listSnap.docs.some((d) => {
        if (d.id === entryId) return false;
        const s = d.data().status;
        return s === "pending" || s === "checked";
      });

      // Fase 2: writes
      tx.delete(target.ref);

      if (!stillActive) {
        // Auto-finalize: limpa também as bought existentes
        for (const d of listSnap.docs) {
          if (d.id === entryId) continue;
          if (d.data().status === "bought") tx.delete(d.ref);
        }
      }
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível remover.",
    };
  }

  revalidatePath("/shopping");
  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Record purchase (Comprei / Finalizar)
// ---------------------------------------------------------------------------

export async function recordPurchase(
  entryIds: string[],
  input: RecordPurchaseInput,
): Promise<
  | { success: true; tripId: string; transactionId: string; finalized: boolean }
  | (ShoppingActionState & { success?: false })
> {
  const ctx = await requireHouseholdContext();
  const parsed = recordPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return { error: "Nenhum item selecionado." };
  }

  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);

  // Busca o cartão (se selecionado) FORA da runTransaction — é config, não
  // precisa estar no snapshot atômico com as writes.
  const card =
    parsed.data.cardId && parsed.data.paymentMethod === "credit"
      ? await getCard(ctx.householdId, parsed.data.cardId)
      : null;

  try {
    const result = await db.runTransaction(async (tx) => {
      // =====================================================================
      // FASE 1 — TODOS OS READS (Firestore exige reads antes de writes)
      // =====================================================================

      // Ler TODA a lista de uma vez: serve pra validar entries selecionados,
      // saber quais outras entries existem (pra auto-finalize) e recuperar
      // as bought já existentes (pra limpar no fim).
      const listSnap = await tx.get(householdRef.collection("shoppingList"));

      const entryById = new Map(listSnap.docs.map((d) => [d.id, d]));
      const targetDocs = entryIds.map((id) => {
        const doc = entryById.get(id);
        if (!doc) throw new Error("Item da lista não encontrado.");
        const data = doc.data();
        if (data.status !== "checked") {
          throw new Error("Nem todos os itens estão marcados.");
        }
        if (!data.priceAtCheckout) {
          throw new Error(
            `Preço não preenchido em "${data.itemName}". Digite o preço antes de comprar.`,
          );
        }
        return doc;
      });

      // Ler ficha de catálogo de cada item-alvo
      const itemRefs = targetDocs.map((doc) =>
        householdRef.collection("shoppingItems").doc(doc.data().itemId),
      );
      const itemSnaps = await Promise.all(itemRefs.map((r) => tx.get(r)));

      // Determinar auto-finalize: sobra alguma entry ativa fora das que vamos comprar?
      const targetIdSet = new Set(entryIds);
      const stillActive = listSnap.docs.filter((d) => {
        if (targetIdSet.has(d.id)) return false;
        return d.data().status === "pending" || d.data().status === "checked";
      });
      const willFinalize = stillActive.length === 0;

      // Bought existentes (pra limpar no auto-finalize)
      const existingBought = listSnap.docs.filter(
        (d) => d.data().status === "bought" && !targetIdSet.has(d.id),
      );

      // =====================================================================
      // FASE 2 — TODOS OS WRITES
      // =====================================================================

      const tripRef = householdRef.collection("shoppingTrips").doc();
      const now = Timestamp.now();
      const dateTs = Timestamp.fromDate(parsed.data.date);
      const installments = parsed.data.installments;
      const isInstalled =
        installments > 1 && parsed.data.paymentMethod === "credit";

      // Cria transaction(s). Se parcelado: N docs com installmentId compartilhado,
      // cada um com amount proporcional e data +i meses. Se à vista: 1 doc.
      const txCol = householdRef.collection("transactions");
      const txRefs: FirebaseFirestore.DocumentReference[] = [];

      if (isInstalled) {
        const installmentId = randomUUID();
        const totalCents = Math.round(parsed.data.amount * 100);
        const baseCents = Math.floor(totalCents / installments);
        const remainderCents = totalCents - baseCents * installments;

        const dates = computeInstallmentDates(
          parsed.data.date,
          installments,
          card,
        );

        for (let i = 0; i < installments; i++) {
          const ref = txCol.doc();
          const cents = i === 0 ? baseCents + remainderCents : baseCents;
          const amount = cents / 100;
          const dueDate = Timestamp.fromDate(dates[i]!);
          tx.set(ref, {
            type: "expense",
            amount,
            description: parsed.data.description,
            category: "essentials",
            subcategory: "Mercado",
            date: dueDate,
            paymentMethod: "credit",
            ...(parsed.data.cardId ? { cardId: parsed.data.cardId } : {}),
            tripId: tripRef.id,
            installmentId,
            installmentNumber: i + 1,
            installmentCount: installments,
            installmentTotal: parsed.data.amount,
            createdBy: ctx.uid,
            createdByName: ctx.user.name,
            createdAt: now,
            updatedAt: now,
          });
          txRefs.push(ref);
        }
      } else {
        // À vista no crédito com cartão: data vira a data da fatura.
        const effectiveDate = card
          ? Timestamp.fromDate(firstInvoiceDueDate(parsed.data.date, card))
          : dateTs;
        const ref = txCol.doc();
        tx.set(ref, {
          type: "expense",
          amount: parsed.data.amount,
          description: parsed.data.description,
          category: "essentials",
          subcategory: "Mercado",
          date: effectiveDate,
          paymentMethod: parsed.data.paymentMethod,
          ...(parsed.data.cardId ? { cardId: parsed.data.cardId } : {}),
          tripId: tripRef.id,
          createdBy: ctx.uid,
          createdByName: ctx.user.name,
          createdAt: now,
          updatedAt: now,
        });
        txRefs.push(ref);
      }

      // Trip aponta pra primeira transaction (parcela 1/N ou a única à vista)
      tx.set(tripRef, {
        storeName: parsed.data.storeName,
        total: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        transactionId: txRefs[0]!.id,
        itemCount: targetDocs.length,
        purchasedBy: ctx.uid,
        purchasedByName: ctx.user.name,
        purchasedAt: dateTs,
        createdAt: now,
      });

      // Para cada entry: purchase + atualiza catálogo + remove ou vira bought
      for (let i = 0; i < targetDocs.length; i++) {
        const doc = targetDocs[i]!;
        const data = doc.data();
        const itemRef = itemRefs[i]!;
        const itemData = itemSnaps[i]!.data() ?? {};

        const price = Number(data.priceAtCheckout);
        const quantity = Number(
          data.quantityAtCheckout ?? data.desiredQuantity ?? 1,
        );
        const brand =
          (data.brandAtCheckout as string | null) ||
          (data.desiredBrand as string | null) ||
          null;
        const weight =
          data.weightAtCheckout ?? data.desiredWeight ?? null;

        const purchaseRef = itemRef.collection("purchases").doc();
        tx.set(purchaseRef, {
          price,
          brand: brand || null,
          store: parsed.data.storeName,
          weight,
          quantity,
          tripId: tripRef.id,
          purchasedBy: ctx.uid,
          purchasedByName: ctx.user.name,
          purchasedAt: dateTs,
        });

        // Catálogo — rolling average baseado no snapshot lido antes dos writes
        const oldAvg = Number(itemData.averagePrice90d ?? 0);
        const oldCount = Number(itemData.purchaseCount ?? 0);
        const rollingAvg =
          oldCount > 0 ? (oldAvg * oldCount + price) / (oldCount + 1) : price;

        const catalogUpdate: Record<string, unknown> = {
          lastPrice: price,
          lastPurchasedAt: dateTs,
          purchaseCount: FieldValue.increment(1),
          averagePrice90d: rollingAvg,
        };
        if (brand) catalogUpdate.defaultBrand = brand;
        if (weight) catalogUpdate.defaultWeight = weight;
        if (quantity) catalogUpdate.defaultQuantity = quantity;
        tx.update(itemRef, catalogUpdate);

        if (willFinalize) {
          // Auto-finalize: já apaga a entry direto (sem passar por bought)
          tx.delete(doc.ref);
        } else {
          tx.update(doc.ref, {
            status: "bought",
            priceAtCheckout: price,
            brandAtCheckout: brand || null,
            weightAtCheckout: weight,
            quantityAtCheckout: quantity,
            tripId: tripRef.id,
            purchaseId: purchaseRef.id,
            boughtAt: dateTs,
          });
        }
      }

      // Auto-finalize: limpa também as bought antigas
      if (willFinalize) {
        for (const d of existingBought) tx.delete(d.ref);
      }

      return {
        tripId: tripRef.id,
        transactionId: txRefs[0]!.id,
        finalized: willFinalize,
      };
    });

    revalidatePath("/shopping");
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath(`/shopping/trips/${result.tripId}`);
    return { success: true, ...result };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Não foi possível lançar a compra.",
    };
  }
}

// ---------------------------------------------------------------------------
// Catalog item edit
// ---------------------------------------------------------------------------

export async function updateShoppingItem(
  itemId: string,
  input: UpdateShoppingItemInput,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const parsed = updateShoppingItemSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);
  const itemRef = householdRef.collection("shoppingItems").doc(itemId);

  // Propaga nome/seção pras entries da lista (que guardam snapshots).
  // Sem isso, alterar o catálogo não reflete na lista atual até o usuário
  // remover e adicionar de novo.
  const entriesSnap = await householdRef
    .collection("shoppingList")
    .where("itemId", "==", itemId)
    .get();

  const batch = db.batch();
  batch.update(itemRef, {
    name: parsed.data.name,
    nameLower: parsed.data.name.toLowerCase(),
    nameNormalized: normalizeName(parsed.data.name),
    section: parsed.data.section,
    defaultBrand: parsed.data.defaultBrand || null,
  });
  for (const doc of entriesSnap.docs) {
    batch.update(doc.ref, {
      itemName: parsed.data.name,
      itemSection: parsed.data.section,
    });
  }
  await batch.commit();

  revalidatePath("/shopping");
  revalidatePath(`/shopping/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Archive (remove do catálogo mantendo histórico de compras)
// ---------------------------------------------------------------------------

export async function archiveShoppingItem(
  itemId: string,
): Promise<ShoppingActionState> {
  const ctx = await requireHouseholdContext();
  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);
  const itemRef = householdRef.collection("shoppingItems").doc(itemId);

  try {
    await db.runTransaction(async (tx) => {
      // Fase 1: reads
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists) throw new Error("Item não encontrado.");

      // Busca entries ativas (pending/checked) deste item — vamos remover também
      const listSnap = await tx.get(
        householdRef
          .collection("shoppingList")
          .where("itemId", "==", itemId),
      );

      // Fase 2: writes
      tx.update(itemRef, { archived: true });
      for (const d of listSnap.docs) {
        // Remove todas as entries (inclusive bought) — limpa a referência na lista
        tx.delete(d.ref);
      }
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível remover.",
    };
  }

  revalidatePath("/shopping");
  revalidatePath("/shopping/items");
  revalidatePath(`/shopping/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Purge (apaga definitivamente o produto + histórico de compras + entries
// da lista). As trips passadas mantêm o total da despesa, mas vão mostrar
// menos itens do que antes.
// ---------------------------------------------------------------------------

const PURGE_BATCH_SIZE = 400;

export async function purgeShoppingItem(
  itemId: string,
): Promise<ShoppingActionState & { purchasesDeleted?: number }> {
  const ctx = await requireHouseholdContext();
  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);
  const itemRef = householdRef.collection("shoppingItems").doc(itemId);

  try {
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) return { error: "Item não encontrado." };

    // Coleta tudo que precisa apagar
    const [purchasesSnap, listSnap] = await Promise.all([
      itemRef.collection("purchases").get(),
      householdRef
        .collection("shoppingList")
        .where("itemId", "==", itemId)
        .get(),
    ]);

    const docsToDelete: FirebaseFirestore.DocumentReference[] = [
      ...purchasesSnap.docs.map((d) => d.ref),
      ...listSnap.docs.map((d) => d.ref),
      itemRef,
    ];

    // Batches de até 400 writes (limite prático do Firestore é 500)
    for (let i = 0; i < docsToDelete.length; i += PURGE_BATCH_SIZE) {
      const chunk = docsToDelete.slice(i, i + PURGE_BATCH_SIZE);
      const batch = db.batch();
      for (const ref of chunk) batch.delete(ref);
      await batch.commit();
    }

    revalidatePath("/shopping");
    revalidatePath("/shopping/items");
    revalidatePath("/shopping/trips", "page");
    return { success: true, purchasesDeleted: purchasesSnap.size };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível apagar.",
    };
  }
}
