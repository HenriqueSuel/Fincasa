export const GOAL_CATEGORIES = [
  { id: "emergency", label: "Reserva de Emergência", icon: "🛡️", color: "#10B981" },
  { id: "travel", label: "Viagem", icon: "✈️", color: "#6366F1" },
  { id: "purchase", label: "Compra", icon: "🚙", color: "#F59E0B" },
  { id: "investment", label: "Investimentos", icon: "📈", color: "#8B5CF6" },
  { id: "custom", label: "Outra meta", icon: "🎯", color: "#EC4899" },
] as const;

export const GOAL_PRIORITIES = [
  { id: "high", label: "Alta" },
  { id: "medium", label: "Média" },
  { id: "low", label: "Baixa" },
] as const;

export type GoalCategoryId = (typeof GOAL_CATEGORIES)[number]["id"];
export type GoalPriorityId = (typeof GOAL_PRIORITIES)[number]["id"];

export function goalCategoryDef(id: string) {
  return GOAL_CATEGORIES.find((c) => c.id === id) ?? GOAL_CATEGORIES[4];
}

export function estimateMonthsRemaining(
  current: number,
  target: number,
  monthlyContribution: number,
): number | null {
  if (monthlyContribution <= 0) return null;
  const remaining = Math.max(0, target - current);
  if (remaining === 0) return 0;
  return Math.ceil(remaining / monthlyContribution);
}
