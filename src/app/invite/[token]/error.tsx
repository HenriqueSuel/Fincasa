"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invite] render error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/30">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold">Não foi possível carregar</h1>
        <p className="text-sm text-muted-foreground">
          O convite existe mas algo deu errado no servidor. Tente novamente em
          instantes.
        </p>
        {error.digest ? (
          <p className="text-[10px] font-mono text-muted-foreground">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-4 h-9 text-sm hover:bg-accent"
          >
            Tentar de novo
          </button>
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 h-9 flex items-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir pro login
          </Link>
        </div>
      </div>
    </main>
  );
}
