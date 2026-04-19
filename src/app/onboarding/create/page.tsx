import Link from "next/link";

export default function CreateHouseholdPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <h1 className="text-xl font-semibold">Criar família</h1>
        <p className="text-sm text-muted-foreground">
          Em breve — formulário de criação do household com nome e sua renda
          mensal. (Entrega da Semana 2)
        </p>
        <Link
          href="/onboarding"
          className="text-sm text-primary underline underline-offset-4"
        >
          Voltar
        </Link>
      </div>
    </main>
  );
}
