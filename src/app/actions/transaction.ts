"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { parseLocalDate } from "@/lib/dates";
import {
  computeInstallmentDates,
  firstInvoiceDueDate,
} from "@/lib/installments";
import { getCard } from "@/lib/cards-query";
import type { ActionState } from "@/lib/action-state";

export type TransactionFormState = ActionState<
  | "amount"
  | "description"
  | "category"
  | "subcategory"
  | "date"
  | "goalId"
  | "installments"
  | "recurring"
>;

const MAX_INSTALLMENTS = 24;
const RECURRING_MONTHS_AHEAD = 12;

const ALLOWED_CATEGORIES = [
  "essentials",
  "qualityOfLife",
  "goals",
  "income",
  "transfer",
] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

const ALLOWED_PAYMENT = ["pix", "credit", "debit", "cash"] as const;

interface ParsedValues {
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  category: Category;
  subcategory: string;
  customSubcategory?: string;
  goalId?: string;
  date: Date;
  paymentMethod?: (typeof ALLOWED_PAYMENT)[number];
  installments: number;
  recurring: boolean;
  cardId?: string;
}

function parseFormData(formData: FormData): {
  values: ParsedValues;
  errors?: TransactionFormState["fieldErrors"];
} {
  const errors: TransactionFormState["fieldErrors"] = {};

  const rawType = String(formData.get("type") ?? "expense");
  const type =
    rawType === "income" || rawType === "transfer" ? rawType : "expense";

  const amount = Number(formData.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Valor inválido";

  const description = String(formData.get("description") ?? "").trim();
  if (!description) errors.description = "Descrição obrigatória";

  const rawCategory = String(formData.get("category") ?? "");
  if (!ALLOWED_CATEGORIES.includes(rawCategory as Category)) {
    errors.category = "Categoria inválida";
  }

  const subcategory = String(formData.get("subcategory") ?? "").trim();
  if (!subcategory) errors.subcategory = "Subcategoria obrigatória";

  const rawDate = String(formData.get("date") ?? "");
  const date = parseLocalDate(rawDate);
  if (!date) errors.date = "Data inválida";

  const customSubcategory =
    String(formData.get("customSubcategory") ?? "").trim() || undefined;

  const rawPayment = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = ALLOWED_PAYMENT.includes(
    rawPayment as (typeof ALLOWED_PAYMENT)[number],
  )
    ? (rawPayment as (typeof ALLOWED_PAYMENT)[number])
    : undefined;

  const goalId = String(formData.get("goalId") ?? "").trim() || undefined;

  const rawInstallments = Number(formData.get("installments") ?? 1);
  let installments = Number.isFinite(rawInstallments)
    ? Math.floor(rawInstallments)
    : 1;
  if (installments < 1) installments = 1;
  if (installments > MAX_INSTALLMENTS) {
    errors.installments = `Máximo ${MAX_INSTALLMENTS}x`;
    installments = MAX_INSTALLMENTS;
  }
  if (installments > 1 && (type !== "expense" || paymentMethod !== "credit")) {
    installments = 1;
  }

  const recurring = formData.get("recurring") === "on" && installments === 1;

  const cardId =
    paymentMethod === "credit"
      ? String(formData.get("cardId") ?? "").trim() || undefined
      : undefined;

  return {
    values: {
      type,
      amount,
      description,
      category: rawCategory as Category,
      subcategory,
      customSubcategory,
      goalId,
      date: date ?? new Date(),
      paymentMethod,
      cardId,
      installments,
      recurring,
    },
    errors: Object.keys(errors).length ? errors : undefined,
  };
}

function contributionAmount(v: Pick<ParsedValues, "type" | "category" | "goalId" | "amount">) {
  if (v.type === "expense" && v.category === "goals" && v.goalId) {
    return v.amount;
  }
  return 0;
}

export async function createTransaction(
  _prev: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const { values, errors } = parseFormData(formData);
  if (errors) return { fieldErrors: errors };

  const db = adminDb();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const now = Timestamp.now();

  const isInstalled = values.installments > 1;
  const isRecurring = values.recurring && !isInstalled;

  // Cartão: se a compra é no crédito com cartão selecionado, as parcelas
  // (inclusive a única, à vista) caem na fatura correspondente, não na
  // data da compra.
  const card =
    values.cardId && values.paymentMethod === "credit"
      ? await getCard(householdId, values.cardId)
      : null;
  const invoiceDate = card ? firstInvoiceDueDate(values.date, card) : null;

  if (isRecurring) {
    const recurringId = randomUUID();
    const batch = db.batch();
    for (let i = 0; i < RECURRING_MONTHS_AHEAD; i++) {
      const ref = txCol.doc();
      const date = addMonths(values.date, i);
      batch.set(ref, {
        type: values.type,
        amount: values.amount,
        description: values.description,
        category: values.category,
        subcategory: values.subcategory,
        ...(values.customSubcategory
          ? { customSubcategory: values.customSubcategory }
          : {}),
        date: Timestamp.fromDate(date),
        ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
        recurringId,
        recurringFrequency: "monthly",
        recurringIndex: i,
        recurringTotal: RECURRING_MONTHS_AHEAD,
        createdBy: uid,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();

    revalidatePath("/");
    revalidatePath("/transactions");
    redirect("/transactions?toast=tx-created");
  }

  if (isInstalled) {
    const installmentId = randomUUID();
    const totalCents = Math.round(values.amount * 100);
    const baseCents = Math.floor(totalCents / values.installments);
    const remainderCents = totalCents - baseCents * values.installments;

    const dates = computeInstallmentDates(
      values.date,
      values.installments,
      card,
    );

    const batch = db.batch();
    for (let i = 0; i < values.installments; i++) {
      const ref = txCol.doc();
      const cents = i === 0 ? baseCents + remainderCents : baseCents;
      const amount = cents / 100;
      const date = dates[i] ?? addMonths(values.date, i);
      batch.set(ref, {
        type: values.type,
        amount,
        description: values.description,
        category: values.category,
        subcategory: values.subcategory,
        ...(values.customSubcategory
          ? { customSubcategory: values.customSubcategory }
          : {}),
        date: Timestamp.fromDate(date),
        paymentMethod: "credit",
        ...(values.cardId ? { cardId: values.cardId } : {}),
        installmentId,
        installmentNumber: i + 1,
        installmentCount: values.installments,
        installmentTotal: values.amount,
        createdBy: uid,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();

    revalidatePath("/");
    revalidatePath("/transactions");
    redirect("/transactions?toast=tx-created");
  }

  const txRef = txCol.doc();
  const contrib = contributionAmount(values);

  // À vista no crédito com cartão: data passa a ser a fatura
  const effectiveDate = invoiceDate ?? values.date;

  await db.runTransaction(async (tx) => {
    tx.set(txRef, {
      type: values.type,
      amount: values.amount,
      description: values.description,
      category: values.category,
      subcategory: values.subcategory,
      ...(values.customSubcategory
        ? { customSubcategory: values.customSubcategory }
        : {}),
      ...(values.goalId ? { goalId: values.goalId } : {}),
      date: Timestamp.fromDate(effectiveDate),
      ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
      ...(values.cardId ? { cardId: values.cardId } : {}),
      createdBy: uid,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    if (contrib > 0 && values.goalId) {
      const goalRef = db
        .collection("households")
        .doc(householdId)
        .collection("goals")
        .doc(values.goalId);
      tx.update(goalRef, {
        currentAmount: FieldValue.increment(contrib),
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  if (values.goalId) {
    revalidatePath("/goals");
    revalidatePath(`/goals/${values.goalId}`);
  }
  redirect("/transactions?toast=tx-created");
}

export async function updateTransaction(
  id: string,
  _prev: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  const { uid, householdId } = await requireHouseholdContext();
  const { values, errors } = parseFormData(formData);
  if (errors) return { fieldErrors: errors };

  const db = adminDb();
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) return { error: "Transação não encontrada." };
  if (existing.createdBy !== uid) {
    return { error: "Você só pode editar transações que lançou." };
  }

  const oldContrib =
    existing.type === "expense" &&
    existing.category === "goals" &&
    existing.goalId
      ? (existing.amount as number)
      : 0;
  const oldGoalId = (existing.goalId as string | undefined) ?? null;
  const newContrib = contributionAmount(values);
  const newGoalId = values.goalId ?? null;

  await db.runTransaction(async (tx) => {
    tx.update(ref, {
      type: values.type,
      amount: values.amount,
      description: values.description,
      category: values.category,
      subcategory: values.subcategory,
      customSubcategory: values.customSubcategory ?? null,
      goalId: values.goalId ?? null,
      date: Timestamp.fromDate(values.date),
      paymentMethod: values.paymentMethod ?? null,
      updatedAt: Timestamp.now(),
    });

    if (oldGoalId && oldGoalId !== newGoalId && oldContrib > 0) {
      tx.update(
        db.collection("households").doc(householdId).collection("goals").doc(oldGoalId),
        { currentAmount: FieldValue.increment(-oldContrib) },
      );
    }
    if (newGoalId && newGoalId !== oldGoalId && newContrib > 0) {
      tx.update(
        db.collection("households").doc(householdId).collection("goals").doc(newGoalId),
        { currentAmount: FieldValue.increment(newContrib) },
      );
    }
    if (newGoalId && newGoalId === oldGoalId) {
      const delta = newContrib - oldContrib;
      if (delta !== 0) {
        tx.update(
          db.collection("households").doc(householdId).collection("goals").doc(newGoalId),
          { currentAmount: FieldValue.increment(delta) },
        );
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  if (oldGoalId) {
    revalidatePath("/goals");
    revalidatePath(`/goals/${oldGoalId}`);
  }
  if (newGoalId && newGoalId !== oldGoalId) {
    revalidatePath(`/goals/${newGoalId}`);
  }
  redirect("/transactions?toast=tx-updated");
}

export async function deleteRecurringGroup(recurringId: string) {
  const { uid, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const col = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");

  const snap = await col.where("recurringId", "==", recurringId).get();
  if (snap.empty) return;

  const owner = snap.docs[0]!.data().createdBy;
  if (owner !== uid) {
    throw new Error("Você só pode apagar transações que lançou.");
  }

  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteInstallmentGroup(installmentId: string) {
  const { uid, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const col = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");

  const snap = await col.where("installmentId", "==", installmentId).get();
  if (snap.empty) return;

  const owner = snap.docs[0]!.data().createdBy;
  if (owner !== uid) {
    throw new Error("Você só pode apagar transações que lançou.");
  }

  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const { uid, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) return;
  if (existing.createdBy !== uid) {
    throw new Error("Você só pode apagar transações que lançou.");
  }

  const contrib =
    existing.type === "expense" &&
    existing.category === "goals" &&
    existing.goalId
      ? (existing.amount as number)
      : 0;
  const goalId = existing.goalId as string | undefined;

  await db.runTransaction(async (tx) => {
    tx.delete(ref);
    if (contrib > 0 && goalId) {
      tx.update(
        db.collection("households").doc(householdId).collection("goals").doc(goalId),
        { currentAmount: FieldValue.increment(-contrib) },
      );
    }
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  if (goalId) {
    revalidatePath("/goals");
    revalidatePath(`/goals/${goalId}`);
  }
}
