import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Tag,
  BarChart3,
  ShoppingCart,
  CreditCard,
  HandCoins,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { SignOutButton } from "@/features/auth/sign-out-button";

export const metadata: Metadata = { title: "Configurações" };

const sections = [
  {
    href: "/settings/household",
    label: "Família",
    description: "Membros, renda e convites",
    icon: Users,
  },
  {
    href: "/settings/categories",
    label: "Categorias",
    description: "Subcategorias customizadas",
    icon: Tag,
  },
  {
    href: "/reports",
    label: "Relatórios",
    description: "Gráficos e análises",
    icon: BarChart3,
  },
  {
    href: "/shopping",
    label: "Lista de mercado",
    description: "Histórico e ficha dos produtos",
    icon: ShoppingCart,
  },
  {
    href: "/settings/cards",
    label: "Cartões de crédito",
    description: "Dia de fechamento e vencimento por cartão",
    icon: CreditCard,
  },
  {
    href: "/loans",
    label: "Empréstimos",
    description: "Dinheiro que te devem",
    icon: HandCoins,
  },
  {
    href: "/settings/migrate-investments",
    label: "Migrar investimentos",
    description: "Converte aportes antigos pro novo tipo",
    icon: TrendingUp,
  },
];

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </header>

      <nav className="flex flex-col gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 flex justify-center">
        <SignOutButton />
      </div>
    </main>
  );
}
