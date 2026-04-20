"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext, requireSession } from "@/lib/auth/guards";
import { householdSchema, updateMyIncomeSchema } from "@/lib/validators";
import { BUDGET_ALLOCATION } from "@/lib/categories";

export interface CreateHouseholdState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "monthlyIncome", string>>;
}

export async function createHousehold(
  _prev: CreateHouseholdState | undefined,
  formData: FormData,
): Promise<CreateHouseholdState> {
  const ctx = await requireSession();
  if (ctx.user.currentHouseholdId) {
    redirect("/");
  }

  const parsed = householdSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    monthlyIncome: Number(formData.get("monthlyIncome") ?? 0),
  });

  if (!parsed.success) {
    const fieldErrors: CreateHouseholdState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "monthlyIncome";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const userRef = adminDb().collection("users").doc(ctx.uid);
  const householdRef = adminDb().collection("households").doc();
  const now = Timestamp.now();

  await adminDb().runTransaction(async (tx) => {
    tx.set(householdRef, {
      name: parsed.data.name,
      createdBy: ctx.uid,
      members: {
        [ctx.uid]: {
          role: "owner",
          name: ctx.user.name,
          photoURL: ctx.user.photoURL ?? null,
          monthlyIncome: parsed.data.monthlyIncome,
          joinedAt: now,
        },
      },
      memberIds: [ctx.uid],
      combinedMonthlyIncome: parsed.data.monthlyIncome,
      budgetAllocation: BUDGET_ALLOCATION,
      currency: "BRL",
      createdAt: now,
    });

    tx.update(userRef, {
      currentHouseholdId: householdRef.id,
      householdIds: FieldValue.arrayUnion(householdRef.id),
    });
  });

  revalidatePath("/", "layout");
  redirect("/?toast=household-created");
}

export interface UpdateMyIncomeState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"monthlyIncome", string>>;
}

export async function updateMyIncome(
  _prev: UpdateMyIncomeState | undefined,
  formData: FormData,
): Promise<UpdateMyIncomeState> {
  const ctx = await requireHouseholdContext();

  const parsed = updateMyIncomeSchema.safeParse({
    monthlyIncome: Number(formData.get("monthlyIncome") ?? 0),
  });

  if (!parsed.success) {
    const fieldErrors: UpdateMyIncomeState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "monthlyIncome";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const db = adminDb();
  const householdRef = db.collection("households").doc(ctx.householdId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(householdRef);
    const data = snap.data();
    if (!data) throw new Error("Família não encontrada.");

    const members = (data.members ?? {}) as Record<
      string,
      { monthlyIncome?: number }
    >;
    if (!members[ctx.uid]) {
      throw new Error("Você não faz parte dessa família.");
    }

    const combined = Object.entries(members).reduce((sum, [uid, m]) => {
      const value = uid === ctx.uid ? parsed.data.monthlyIncome : (m.monthlyIncome ?? 0);
      return sum + value;
    }, 0);

    tx.update(householdRef, {
      [`members.${ctx.uid}.monthlyIncome`]: parsed.data.monthlyIncome,
      combinedMonthlyIncome: combined,
    });
  });

  revalidatePath("/");
  revalidatePath("/settings/household");
  revalidatePath("/reports");
  return { success: true };
}
