"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Target, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/transactions",
    label: "Lançar",
    icon: Receipt,
    match: (p: string) => p.startsWith("/transactions"),
  },
];

const rightItems = [
  {
    href: "/goals",
    label: "Metas",
    icon: Target,
    match: (p: string) => p.startsWith("/goals"),
  },
  {
    href: "/settings",
    label: "Ajustes",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings") || p.startsWith("/reports"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const hideOnForm =
    pathname.startsWith("/transactions/new") ||
    /^\/transactions\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/goals/new") ||
    /^\/goals\/[^/]+$/.test(pathname);
  if (hideOnForm) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 bg-linear-to-t from-background to-transparent"
        aria-hidden="true"
      />
      <nav className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="relative flex w-full max-w-md items-center justify-around rounded-full border border-border bg-card/95 px-2 h-14 shadow-lg backdrop-blur">
          {leftItems.map((item) => (
            <NavItem key={item.href} item={item} active={item.match(pathname)} />
          ))}
          <Link
            href="/transactions/new"
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label="Nova transação"
          >
            <Plus className="size-6" />
          </Link>
          {rightItems.map((item) => (
            <NavItem key={item.href} item={item} active={item.match(pathname)} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}
