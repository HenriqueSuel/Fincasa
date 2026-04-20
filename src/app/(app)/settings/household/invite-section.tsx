"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInvite } from "@/app/actions/invite";

interface PendingInvite {
  id: string;
  token: string;
  url: string;
  expiresAt: number;
}

export function InviteSection({
  pendingInvites,
}: {
  pendingInvites: PendingInvite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const { url, token } = await createInvite();
        setJustCreated(url);
        setCopiedToken(null);
        const copied = await navigator.clipboard
          .writeText(url)
          .then(() => true)
          .catch(() => false);
        setCopiedToken(token);
        toast.success(
          copied ? "Link gerado e copiado." : "Link gerado.",
        );
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao gerar convite.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  async function handleCopy(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast.success("Link copiado.");
      setTimeout(() => setCopiedToken((c) => (c === token ? null : c)), 2000);
    } catch {
      setError("Não foi possível copiar.");
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Convites ativos
        </h2>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          size="sm"
          variant="outline"
        >
          <Plus className="size-4" />
          {isPending ? "Gerando…" : "Novo convite"}
        </Button>
      </div>

      {pendingInvites.length === 0 && !justCreated ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum convite pendente. Clique em <strong>Novo convite</strong>{" "}
            pra gerar um link.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendingInvites.map((inv) => {
            const daysLeft = Math.max(
              0,
              Math.floor((inv.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
            );
            return (
              <li
                key={inv.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs text-muted-foreground break-all">
                    {inv.url}
                  </code>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(inv.url, inv.token)}
                    aria-label="Copiar link"
                  >
                    {copiedToken === inv.token ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expira em {daysLeft} dia{daysLeft === 1 ? "" : "s"}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        Compartilhe o link pelo WhatsApp. Expira em 7 dias. Depois que a
        pessoa aceitar, o convite é consumido.
      </p>
    </section>
  );
}
