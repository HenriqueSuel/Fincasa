"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithIdToken } from "@/app/actions/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.64 12.27c0-.82-.07-1.61-.2-2.37H12v4.49h6.52a5.58 5.58 0 0 1-2.42 3.66v3.04h3.92c2.29-2.11 3.62-5.22 3.62-8.82z" />
      <path fill="#34A853" d="M12 24c3.26 0 6-1.08 8-2.92l-3.92-3.04c-1.08.73-2.47 1.17-4.08 1.17-3.13 0-5.79-2.11-6.73-4.96H1.22v3.12A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.25a7.19 7.19 0 0 1 0-4.5V6.63H1.22a12 12 0 0 0 0 10.74l4.05-3.12z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C18 .99 15.26 0 12 0 7.32 0 3.27 2.67 1.22 6.63l4.05 3.12C6.21 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

export function LoginCTA({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      startTransition(async () => {
        await signInWithIdToken(idToken);
        router.replace(`/invite/${token}`);
        router.refresh();
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") return;
      setError("Não foi possível entrar. Tente novamente.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground text-center">
        Entre com sua conta Google pra aceitar.
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isPending}
        className="flex h-12 items-center justify-center gap-3 rounded-full border border-border bg-card px-5 font-medium transition-colors hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {isPending ? "Entrando…" : "Entrar com Google"}
      </button>
      {error ? (
        <p className="text-sm text-destructive text-center">{error}</p>
      ) : null}
    </div>
  );
}
