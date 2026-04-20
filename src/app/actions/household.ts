"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/firebase/session";
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
  const session = await getSession();
  if (!session) redirect("/login");

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

  const userRef = adminDb().collection("users").doc(session.uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  if (!user) return { error: "Usuário não encontrado." };

  const householdRef = adminDb().collection("households").doc();
  const now = Timestamp.now();

  await adminDb().runTransaction(async (tx) => {
    tx.set(householdRef, {
      name: parsed.data.name,
      createdBy: session.uid,
      members: {
        [session.uid]: {
          role: "owner",
          name: user.name,
          photoURL: user.photoURL ?? null,
          monthlyIncome: parsed.data.monthlyIncome,
          joinedAt: now,
        },
      },
      memberIds: [session.uid],
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
