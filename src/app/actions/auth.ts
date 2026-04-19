"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  createSessionCookie,
  destroySessionCookie,
} from "@/lib/firebase/session";

export async function signInWithIdToken(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decoded;

  const userRef = adminDb().collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await userRef.set({
      name: name ?? email?.split("@")[0] ?? "Usuário",
      email: email ?? "",
      photoURL: picture ?? null,
      currentHouseholdId: null,
      householdIds: [],
      preferences: { theme: "dark", defaultView: "family" },
      createdAt: Timestamp.now(),
    });
  }

  await createSessionCookie(idToken);
  revalidatePath("/", "layout");
}

export async function signOut() {
  await destroySessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
