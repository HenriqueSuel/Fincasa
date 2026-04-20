"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pause, Play, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteGoal, toggleGoalStatus } from "@/app/actions/goal";

export function GoalActions({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused" | "completed";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    try {
      await deleteGoal(id);
      toast.success("Meta apagada.");
      router.replace("/goals");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível apagar.",
      );
    }
  }

  function handleToggle(next: "active" | "paused" | "completed") {
    startTransition(async () => {
      try {
        await toggleGoalStatus(id, next);
        toast.success(
          next === "completed"
            ? "Meta marcada como concluída 🎉"
            : next === "paused"
              ? "Meta pausada."
              : "Meta retomada.",
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Não foi possível atualizar.",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {status === "active" ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleToggle("paused")}
            disabled={isPending}
            aria-label="Pausar meta"
          >
            <Pause className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleToggle("completed")}
            disabled={isPending}
            aria-label="Concluir meta"
          >
            <Check className="size-4" />
          </Button>
        </>
      ) : null}
      {status === "paused" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleToggle("active")}
          disabled={isPending}
          aria-label="Retomar meta"
        >
          <Play className="size-4" />
        </Button>
      ) : null}
      <ConfirmDialog
        title="Apagar essa meta?"
        description="A meta será removida, mas os aportes já lançados permanecem nas suas transações."
        confirmLabel="Apagar"
        destructive
        onConfirm={handleDelete}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Apagar meta"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );
}
