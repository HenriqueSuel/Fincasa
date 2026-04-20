"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { parseLocalDate } from "@/lib/dates";
import { GOAL_CATEGORIES } from "@/lib/goals";
import type { ActionState } from "@/lib/action-state";
import { applyFieldErrors } from "@/lib/action-state";
import { goalSchema, type GoalInput } from "@/lib/validators";

export type GoalFormState = ActionState<keyof GoalInput>;

function parseFormData(formData: FormData) {
  return goalSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    targetAmount: formData.get("targetAmount"),
    monthlyContribution: formData.get("monthlyContribution"),
    startDate:
      parseLocalDate(String(formData.get("startDate") ?? "")) ?? undefined,
    estimatedEndDate:
      parseLocalDate(String(formData.get("estimatedEndDate") ?? "")) ??
      undefined,
  });
}

export async function createGoal(
  _prev: GoalFormState | undefined,
  formData: FormData,
): Promise<GoalFormState> {
  const { uid, householdId } = await requireHouseholdContext();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const { data } = parsed;
  const def = GOAL_CATEGORIES.find((c) => c.id === data.category)!;

  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .add({
      name: data.name,
      icon: def.icon,
      color: def.color,
      category: data.category,
      priority: data.priority,
      status: "active",
      targetAmount: data.targetAmount,
      currentAmount: 0,
      monthlyContribution: data.monthlyContribution,
      startDate: Timestamp.fromDate(data.startDate),
      estimatedEndDate: Timestamp.fromDate(data.estimatedEndDate),
      createdBy: uid,
      createdAt: Timestamp.now(),
    });

  revalidatePath("/goals");
  revalidatePath("/");
  redirect("/goals?toast=goal-created");
}

export async function updateGoal(
  id: string,
  _prev: GoalFormState | undefined,
  formData: FormData,
): Promise<GoalFormState> {
  const { householdId } = await requireHouseholdContext();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const { data } = parsed;
  const def = GOAL_CATEGORIES.find((c) => c.id === data.category)!;

  const ref = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Meta não encontrada." };

  await ref.update({
    name: data.name,
    icon: def.icon,
    color: def.color,
    category: data.category,
    priority: data.priority,
    targetAmount: data.targetAmount,
    monthlyContribution: data.monthlyContribution,
    startDate: Timestamp.fromDate(data.startDate),
    estimatedEndDate: Timestamp.fromDate(data.estimatedEndDate),
  });

  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  revalidatePath("/");
  redirect(`/goals/${id}?toast=goal-updated`);
}

export async function deleteGoal(id: string) {
  const { householdId } = await requireHouseholdContext();
  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id)
    .delete();
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function toggleGoalStatus(
  id: string,
  next: "active" | "paused" | "completed",
) {
  const { householdId } = await requireHouseholdContext();
  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id)
    .update({ status: next });
  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  revalidatePath("/");
}
