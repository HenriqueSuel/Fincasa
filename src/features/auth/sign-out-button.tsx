"use client";

import { useTransition } from "react";
import { signOut as clientSignOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { signOut } from "@/app/actions/auth";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await clientSignOut(auth);
      await signOut();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-2 rounded-full border border-border px-4 h-10 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
    >
      <LogOut className="size-4" />
      {isPending ? "Saindo…" : "Sair"}
    </button>
  );
}
