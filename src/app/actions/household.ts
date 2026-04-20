"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireSession } from "@/lib/auth/guards";
import { householdSchema } from "@/lib/validators";
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
