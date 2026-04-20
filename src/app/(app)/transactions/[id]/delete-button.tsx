"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransaction } from "@/app/actions/transaction";

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleConfirm() {
    try {
      await deleteTransaction(id);
      toast.success("Transação apagada.");
      router.replace("/transactions");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível apagar.",
      );
    }
  }

  return (
    <ConfirmDialog
      title="Apagar essa transação?"
      description="Essa ação não pode ser desfeita. Se essa for uma parcela de um parcelamento, as demais continuam registradas."
      confirmLabel="Apagar"
      destructive
      onConfirm={handleConfirm}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Apagar transação"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
        </Button>
      }
    />
  );
}
