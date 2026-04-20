import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { listCustomSubcategories } from "@/lib/subcategories-query";
import { CATEGORIES } from "@/lib/categories";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesSettingsPage() {
  const session = (await getSession())!;
  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data()!;
  const custom = await listCustomSubcategories(user.currentHouseholdId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            As 3 principais (40/15/45) são fixas. Adicione subcategorias
            próprias dentro de cada uma.
          </p>
        </div>
      </header>

      <CategoriesClient categories={CATEGORIES} custom={custom} />
    </main>
  );
}
