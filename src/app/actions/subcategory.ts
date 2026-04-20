"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";
import { applyFieldErrors } from "@/lib/action-state";
import { customSubcategorySchema } from "@/lib/validators";

export type SubcategoryState = ActionState<"name" | "category">;

export async function addCustomSubcategory(
  _prev: SubcategoryState | undefined,
  formData: FormData,
): Promise<SubcategoryState> {
  const { uid, householdId } = await requireHouseholdContext();

  const parsed = customSubcategorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    icon: String(formData.get("icon") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }

  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .add({
      category: parsed.data.category,
      name: parsed.data.name,
      ...(parsed.data.icon ? { icon: parsed.data.icon } : {}),
      createdBy: uid,
      createdAt: Timestamp.now(),
    });

  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteCustomSubcategory(id: string) {
  const { householdId } = await requireHouseholdContext();
  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .doc(id)
    .delete();
  revalidatePath("/settings/categories");
}
