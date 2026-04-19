import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { SignOutButton } from "@/features/auth/sign-out-button";

export default async function Dashboard() {
  const session = (await getSession())!;
  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10 max-w-4xl w-full mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-semibold">{user?.name ?? "Usuário"}</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium mb-2">Dashboard em construção</h2>
        <p className="text-sm text-muted-foreground">
          Próxima entrega: criação de household, convite por link e lançamento
          de transações.
        </p>
      </section>
    </main>
  );
}
