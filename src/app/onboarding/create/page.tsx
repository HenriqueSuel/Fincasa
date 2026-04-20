import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { CreateHouseholdForm } from "./create-household-form";

export const metadata: Metadata = { title: "Criar família" };

export default async function CreateHouseholdPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();
  if (user?.currentHouseholdId) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <span className="text-2xl">🏠</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              Criar sua família
            </h1>
            <p className="text-sm text-muted-foreground">
              Defina o nome e sua renda mensal. Você poderá convidar sua
              esposa depois.
            </p>
          </div>
        </div>

        <CreateHouseholdForm />

        <Link
          href="/onboarding"
          className="text-xs text-muted-foreground text-center hover:text-foreground transition-colors"
        >
          ← Voltar
        </Link>
      </div>
    </main>
  );
}
