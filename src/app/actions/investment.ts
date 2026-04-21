"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { applyFieldErrors, type ActionState } from "@/lib/action-state";
import { parseLocalDate } from "@/lib/dates";
import {
  investmentSchema,
  investmentContributionSchema,
  investmentRevaluationSchema,
  type InvestmentContributionInput,
  type InvestmentInput,
  type InvestmentRevaluationInput,
} from "@/lib/validators";
import { INVESTMENT_TYPE_LABELS } from "@/types/enums";

export type InvestmentState = ActionState<keyof InvestmentInput>;
export type InvestmentContributionState = ActionState<
  keyof InvestmentContributionInput
>;
export type InvestmentRevaluationState = ActionState<
  keyof InvestmentRevaluationInput
>;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseInvestmentFormData(formData: FormData) {
  const rawDate = String(formData.get("startDate") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
    initialAmount: formData.get("initialAmount") ?? 0,
    startDate: parsedDate ?? rawDate,
  });
}

function parseContributionFormData(formData: FormData) {
  const rawDate = String(formData.get("date") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentContributionSchema.safeParse({
    amount: formData.get("amount"),
    date: parsedDate ?? rawDate,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

function parseRevaluationFormData(formData: FormData) {
  const rawDate = String(formData.get("date") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentRevaluationSchema.safeParse({
    newValue: formData.get("newValue"),
    date: parsedDate ?? rawDate,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

export async function createInvestment(
  goalId: string,
  _prev: InvestmentState | undefined,
  formData: FormData,
): Promise<InvestmentState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseInvestmentFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const goalSnap = await goalRef.get();
  if (!goalSnap.exists) return { error: "Meta não encontrada." };

  const investmentRef = goalRef.collection("investments").doc();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const now = Timestamp.now();

  const batch = db.batch();
  const initial = values.initialAmount;

  batch.set(investmentRef, {
    name: values.name,
    type: values.type,
    ...(values.broker ? { broker: values.broker } : {}),
    currentValue: initial,
    totalContributed: initial,
    archived: false,
    lastUpdatedAt: now,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });

  if (initial > 0) {
    const txRef = txCol.doc();
    const eventRef = investmentRef.collection("events").doc();
    batch.set(txRef, {
      type: "expense",
      amount: initial,
      description: `Aporte · ${values.name}`,
      category: "goals",
      subcategory: "Aporte",
      customSubcategory: INVESTMENT_TYPE_LABELS[values.type],
      goalId,
      investmentId: investmentRef.id,
      date: Timestamp.fromDate(values.startDate),
      createdBy: uid,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(eventRef, {
      type: "contribution",
      amount: initial,
      date: Timestamp.fromDate(values.startDate),
      transactionId: txRef.id,
      createdBy: uid,
      createdByName: user.name,
      createdAt: now,
    });
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(initial),
    });
  }

  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentRef.id}`);
  revalidatePath("/transactions");
  redirect(`/goals/${goalId}/investments/${investmentRef.id}?toast=inv-created`);
}

export async function contributeInvestment(
  goalId: string,
  investmentId: string,
  _prev: InvestmentContributionState | undefined,
  formData: FormData,
): Promise<InvestmentContributionState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseContributionFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (inv.archived) return { error: "Investimento arquivado." };

  const now = Timestamp.now();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txRef = txCol.doc();
  const eventRef = investmentRef.collection("events").doc();

  const batch = db.batch();
  batch.set(txRef, {
    type: "expense",
    amount: values.amount,
    description: `Aporte · ${inv.name}`,
    category: "goals",
    subcategory: "Aporte",
    customSubcategory:
      INVESTMENT_TYPE_LABELS[inv.type as keyof typeof INVESTMENT_TYPE_LABELS] ??
      "Investimento",
    goalId,
    investmentId,
    date: Timestamp.fromDate(values.date),
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(eventRef, {
    type: "contribution",
    amount: values.amount,
    date: Timestamp.fromDate(values.date),
    ...(values.note ? { note: values.note } : {}),
    transactionId: txRef.id,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  batch.update(investmentRef, {
    currentValue: FieldValue.increment(values.amount),
    totalContributed: FieldValue.increment(values.amount),
    lastUpdatedAt: now,
  });
  batch.update(goalRef, {
    currentAmount: FieldValue.increment(values.amount),
  });
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
  return { success: true };
}

export async function revalueInvestment(
  goalId: string,
  investmentId: string,
  _prev: InvestmentRevaluationState | undefined,
  formData: FormData,
): Promise<InvestmentRevaluationState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseRevaluationFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (inv.archived) return { error: "Investimento arquivado." };

  const previous = Number(inv.currentValue ?? 0);
  const delta = roundCents(values.newValue - previous);

  const now = Timestamp.now();
  const eventRef = investmentRef.collection("events").doc();
  const batch = db.batch();
  batch.set(eventRef, {
    type: "revaluation",
    amount: delta,
    previousValue: previous,
    newValue: values.newValue,
    date: Timestamp.fromDate(values.date),
    ...(values.note ? { note: values.note } : {}),
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  batch.update(investmentRef, {
    currentValue: values.newValue,
    lastUpdatedAt: now,
  });
  if (delta !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(delta),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  return { success: true };
}

export async function archiveInvestment(
  goalId: string,
  investmentId: string,
) {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return;
  if (inv.archived) return;

  const currentValue = Number(inv.currentValue ?? 0);

  const batch = db.batch();
  batch.update(investmentRef, {
    archived: true,
    lastUpdatedAt: Timestamp.now(),
  });
  if (currentValue !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(-currentValue),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
}

export async function unarchiveInvestment(
  goalId: string,
  investmentId: string,
) {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return;
  if (!inv.archived) return;

  const currentValue = Number(inv.currentValue ?? 0);

  const batch = db.batch();
  batch.update(investmentRef, {
    archived: false,
    lastUpdatedAt: Timestamp.now(),
  });
  if (currentValue !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(currentValue),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
}
