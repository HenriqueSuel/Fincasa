import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export interface CustomSubcategoryItem {
  id: string;
  category: "essentials" | "qualityOfLife" | "goals";
  name: string;
  icon?: string;
}

export async function listCustomSubcategories(
  householdId: string,
): Promise<CustomSubcategoryItem[]> {
  const snap = await adminDb()
    .collection("households")
    .doc(householdId)
    .collection("customSubcategories")
    .orderBy("name")
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      category: data.category,
      name: data.name,
      icon: data.icon,
    };
  });
}
