import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { SignOutButton } from "@/features/auth/sign-out-button";

export default async function OnboardingPage() {
  const { user } = await requireSession();
  if (user.currentHouseholdId) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
          <span className="text-3xl">🏠</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pra começar, crie sua família ou aceite um convite.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/onboarding/create"
            className="flex h-12 items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Criar minha família
          </Link>
          <p className="text-xs text-muted-foreground">
            Recebeu um convite? Abra o link que te enviaram.
          </p>
        </div>

        <div className="pt-4">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
