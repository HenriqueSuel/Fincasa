"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  archiveShoppingItem,
  purgeShoppingItem,
} from "@/app/actions/shopping";

interface Props {
  itemId: string;
  itemName: string;
  purchaseCount: number;
}

export function ArchiveItemButton({ itemId, itemName, purchaseCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveShoppingItem(itemId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Produto arquivado.");
      router.replace("/shopping/items");
      router.refresh();
    });
  }

  function handlePurge() {
    startTransition(async () => {
      const result = await purgeShoppingItem(itemId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const deleted = result.purchasesDeleted ?? 0;
      toast.success(
        deleted > 0
          ? `Produto e ${deleted} compra${deleted === 1 ? "" : "s"} apagadas.`
          : "Produto apagado.",
      );
      router.replace("/shopping/items");
      router.refresh();
    });
  }

  const archiveDesc =
    purchaseCount > 0
      ? `Some do catálogo e do autocomplete. O histórico de ${purchaseCount} compra${purchaseCount === 1 ? "" : "s"} fica preservado nas trips já registradas.`
      : "Esse produto nunca foi comprado. Vai sumir do catálogo de vez.";

  const purgeDesc =
    purchaseCount > 0
      ? `Apaga o produto e as ${purchaseCount} compra${purchaseCount === 1 ? "" : "s"} registradas dele. As trips que continham esse item vão mostrar menos itens do que antes. Essa ação NÃO pode ser desfeita.`
      : "Apaga o produto permanentemente. Essa ação não pode ser desfeita.";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <ConfirmDialog
        title={`Arquivar "${itemName}"?`}
        description={archiveDesc}
        confirmLabel="Arquivar"
        destructive
        onConfirm={handleArchive}
        trigger={
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="text-muted-foreground border-border hover:bg-accent"
          >
            <Archive className="size-4" />
            Arquivar
          </Button>
        }
      />

      <ConfirmDialog
        title={`Apagar "${itemName}" permanentemente?`}
        description={purgeDesc}
        confirmLabel="Apagar tudo"
        destructive
        onConfirm={handlePurge}
        trigger={
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Apagar permanentemente
          </Button>
        }
      />
    </div>
  );
}
