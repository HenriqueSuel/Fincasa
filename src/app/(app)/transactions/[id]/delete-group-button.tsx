"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteInstallmentGroup } from "@/app/actions/transaction";

export function DeleteInstallmentGroupButton({
  installmentId,
  installmentCount,
}: {
  installmentId: string;
  installmentCount: number;
}) {
  const router = useRouter();

  async function handleConfirm() {
    try {
      await deleteInstallmentGroup(installmentId);
      toast.success(`${installmentCount} parcelas apagadas.`);
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
      title={`Apagar as ${installmentCount} parcelas?`}
      description="Todas as parcelas dessa compra serão removidas (passadas e futuras). Essa ação não pode ser desfeita."
      confirmLabel="Apagar tudo"
      destructive
      onConfirm={handleConfirm}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Apagar todas as {installmentCount} parcelas
        </Button>
      }
    />
  );
}
