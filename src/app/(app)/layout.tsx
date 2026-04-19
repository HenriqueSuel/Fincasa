import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();

  if (!user?.currentHouseholdId) {
    redirect("/onboarding");
  }

  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
