"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/firebase/session";

const ALLOWED_CATEGORIES = ["essentials", "qualityOfLife", "goals"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

export interface SubcategoryState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "category", string>>;
}

async function currentHousehold() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();
  if (!user?.currentHouseholdId) redirect("/onboarding");
  return { session, user, householdId: user.currentHouseholdId as string };
}

export async function addCustomSubcategory(
  _prev: SubcategoryState | undefined,
  formData: FormData,
): Promise<SubcategoryState> {
  const { session, householdId } = await currentHousehold();
  const errors: SubcategoryState["fieldErrors"] = {};

  const name = String(formData.get("name") ?? "").trim();
  if (!name) errors.name = "Nome obrigatório";
  if (name.length > 40) errors.name = "Máximo 40 caracteres";

  const category = String(formData.get("category") ?? "");
  if (!ALLOWED_CATEGORIES.includes(category as Category)) {
    errors.category = "Categoria inválida";
  }

  const icon = String(formData.get("icon") ?? "").trim() || undefined;
  if (Object.keys(errors).length) return { fieldErrors: errors };

  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .add({
      category,
      name,
      ...(icon ? { icon } : {}),
      createdBy: session.uid,
      createdAt: Timestamp.now(),
    });

  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteCustomSubcategory(id: string) {
  const { householdId } = await currentHousehold();
  await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .doc(id)
    .delete();
  revalidatePath("/settings/categories");
}
