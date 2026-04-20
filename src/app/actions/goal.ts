"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/goals";

export interface GoalFormState {
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "targetAmount"
      | "monthlyContribution"
      | "startDate"
      | "estimatedEndDate"
      | "category"
      | "priority",
      string
    >
  >;
}

const CATEGORY_IDS = GOAL_CATEGORIES.map((c) => c.id) as readonly string[];
const PRIORITY_IDS = GOAL_PRIORITIES.map((p) => p.id) as readonly string[];

async function currentHousehold() {
  const ctx = await requireHouseholdContext();
  return {
    session: { uid: ctx.uid },
    user: ctx.user,
    householdId: ctx.householdId,
  };
}

function parse(formData: FormData) {
  const errors: GoalFormState["fieldErrors"] = {};

  const name = String(formData.get("name") ?? "").trim();
  if (!name) errors.name = "Nome obrigatório";

  const targetAmount = Number(formData.get("targetAmount") ?? 0);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    errors.targetAmount = "Meta deve ser positiva";
  }

  const monthlyContribution = Number(formData.get("monthlyContribution") ?? 0);
  if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) {
    errors.monthlyContribution = "Valor inválido";
  }

  const startStr = String(formData.get("startDate") ?? "");
  const endStr = String(formData.get("estimatedEndDate") ?? "");
  const startDate = startStr ? new Date(startStr) : null;
  const estimatedEndDate = endStr ? new Date(endStr) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    errors.startDate = "Data inicial inválida";
  }
  if (!estimatedEndDate || Number.isNaN(estimatedEndDate.getTime())) {
    errors.estimatedEndDate = "Data final inválida";
  }
  if (startDate && estimatedEndDate && estimatedEndDate <= startDate) {
    errors.estimatedEndDate = "Data final deve ser depois da inicial";
  }

  const category = String(formData.get("category") ?? "custom");
  if (!CATEGORY_IDS.includes(category)) errors.category = "Categoria inválida";

  const priority = String(formData.get("priority") ?? "medium");
  if (!PRIORITY_IDS.includes(priority)) errors.priority = "Prioridade inválida";

  const hasErrors = Object.keys(errors).length > 0;
  return {
    values: hasErrors
      ? null
      : {
          name,
          targetAmount,
          monthlyContribution,
          startDate: startDate!,
          estimatedEndDate: estimatedEndDate!,
          category,
          priority,
        },
    errors: hasErrors ? errors : undefined,
  };
}

export async function createGoal(
  _prev: GoalFormState | undefined,
  formData: FormData,
): Promise<GoalFormState> {
  const { session, householdId } = await currentHousehold();
  const { values, errors } = parse(formData);
  if (!values) return { fieldErrors: errors };

  const def = GOAL_CATEGORIES.find((c) => c.id === values.category)!;

  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .add({
      name: values.name,
      icon: def.icon,
      color: def.color,
      category: values.category,
      priority: values.priority,
      status: "active",
      targetAmount: values.targetAmount,
      currentAmount: 0,
      monthlyContribution: values.monthlyContribution,
      startDate: Timestamp.fromDate(values.startDate),
      estimatedEndDate: Timestamp.fromDate(values.estimatedEndDate),
      createdBy: session.uid,
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
  const { householdId } = await currentHousehold();
  const { values, errors } = parse(formData);
  if (!values) return { fieldErrors: errors };

  const def = GOAL_CATEGORIES.find((c) => c.id === values.category)!;

  const ref = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Meta não encontrada." };

  await ref.update({
    name: values.name,
    icon: def.icon,
    color: def.color,
    category: values.category,
    priority: values.priority,
    targetAmount: values.targetAmount,
    monthlyContribution: values.monthlyContribution,
    startDate: Timestamp.fromDate(values.startDate),
    estimatedEndDate: Timestamp.fromDate(values.estimatedEndDate),
  });

  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  revalidatePath("/");
  redirect(`/goals/${id}?toast=goal-updated`);
}

export async function deleteGoal(id: string) {
  const { householdId } = await currentHousehold();
  const ref = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id);
  await ref.delete();
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function toggleGoalStatus(id: string, next: "active" | "paused" | "completed") {
  const { householdId } = await currentHousehold();
  const ref = adminDb()
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(id);
  await ref.update({ status: next });
  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  revalidatePath("/");
}
