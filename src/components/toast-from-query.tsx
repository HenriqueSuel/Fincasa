"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { type: "success" | "info"; text: string }> = {
  "household-created": { type: "success", text: "Família criada!" },
  "invite-accepted": { type: "success", text: "Você entrou na família!" },
  "tx-created": { type: "success", text: "Lançamento salvo." },
  "tx-updated": { type: "success", text: "Lançamento atualizado." },
  "goal-created": { type: "success", text: "Meta criada." },
  "goal-updated": { type: "success", text: "Meta atualizada." },
  "loan-created": { type: "success", text: "Empréstimo registrado." },
  "loan-cancelled": { type: "success", text: "Empréstimo apagado." },
  "loan-updated": { type: "success", text: "Empréstimo atualizado." },
  "inv-created": { type: "success", text: "Investimento criado." },
};

export function ToastFromQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    const key = params.get("toast");
    if (!key) return;
    const msg = MESSAGES[key];
    if (msg) {
      toast[msg.type](msg.text);
    }
    const next = new URLSearchParams(params);
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}
