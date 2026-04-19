import type { BudgetCategory } from "@/types/domain";

export interface CategoryDefinition {
  id: BudgetCategory;
  label: string;
  allocation: number;
  color: string;
  subcategories: { name: string; icon: string }[];
}

export const BUDGET_ALLOCATION = {
  essentials: 0.4,
  qualityOfLife: 0.15,
  goals: 0.45,
} as const;

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: "essentials",
    label: "Essenciais",
    allocation: 0.4,
    color: "#EF4444",
    subcategories: [
      { name: "Moradia", icon: "🏠" },
      { name: "Contas da casa", icon: "💡" },
      { name: "Mercado", icon: "🛒" },
      { name: "Transporte", icon: "🚗" },
      { name: "Saúde", icon: "⚕️" },
      { name: "Educação", icon: "🎓" },
      { name: "Pet", icon: "🐾" },
    ],
  },
  {
    id: "qualityOfLife",
    label: "Qualidade de vida",
    allocation: 0.15,
    color: "#F59E0B",
    subcategories: [
      { name: "Restaurantes/Delivery", icon: "🍽️" },
      { name: "Streaming/Entretenimento", icon: "🎬" },
      { name: "Lazer", icon: "🎮" },
      { name: "Cuidado pessoal", icon: "💇" },
      { name: "Vestuário", icon: "👕" },
      { name: "Presentes", icon: "🎁" },
    ],
  },
  {
    id: "goals",
    label: "Objetivos",
    allocation: 0.45,
    color: "#10B981",
    subcategories: [
      { name: "Reserva de Emergência", icon: "🛡️" },
      { name: "Viagens", icon: "✈️" },
      { name: "Carro", icon: "🚙" },
      { name: "Investimentos", icon: "📈" },
      { name: "Outras metas", icon: "🎯" },
    ],
  },
];

export const INCOME_SUBCATEGORIES = [
  "Salário",
  "Freelance",
  "Rendimentos",
  "Extras",
] as const;
