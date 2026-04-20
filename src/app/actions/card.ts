"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { applyFieldErrors, type ActionState } from "@/lib/action-state";
import { creditCardSchema, type CreditCardInput } from "@/lib/validators";

export type CreditCardState = ActionState<keyof CreditCardInput>;

function parseFormData(formData: FormData) {
  return creditCardSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    closingDay: formData.get("closingDay"),
    dueDay: formData.get("dueDay"),
    color: String(formData.get("color") ?? "") || undefined,
  });
}

export async function createCard(
  _prev: CreditCardState | undefined,
  formData: FormData,
): Promise<CreditCardState> {
  const ctx = await requireHouseholdContext();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  await adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("creditCards")
    .add({
      name: parsed.data.name,
      closingDay: parsed.data.closingDay,
      dueDay: parsed.data.dueDay,
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      createdBy: ctx.uid,
      createdAt: Timestamp.now(),
    });

  revalidatePath("/settings/cards");
  return { success: true };
}

export async function updateCard(
  id: string,
  _prev: CreditCardState | undefined,
  formData: FormData,
): Promise<CreditCardState> {
  const ctx = await requireHouseholdContext();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  const ref = adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("creditCards")
    .doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Cartão não encontrado." };

  await ref.update({
    name: parsed.data.name,
    closingDay: parsed.data.closingDay,
    dueDay: parsed.data.dueDay,
    color: parsed.data.color ?? null,
  });

  revalidatePath("/settings/cards");
  return { success: true };
}

export async function deleteCard(id: string) {
  const ctx = await requireHouseholdContext();
  await adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("creditCards")
    .doc(id)
    .delete();
  revalidatePath("/settings/cards");
}
