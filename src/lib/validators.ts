import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição obrigatória").max(120),
  category: z.enum([
    "essentials",
    "qualityOfLife",
    "goals",
    "income",
    "transfer",
  ]),
  subcategory: z.string().min(1, "Subcategoria obrigatória"),
  customSubcategory: z.string().max(60).optional(),
  goalId: z.string().optional(),
  date: z.date(),
  paymentMethod: z.enum(["pix", "credit", "debit", "cash"]).optional(),
  tags: z.array(z.string()).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const goalSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(60),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex inválida"),
  targetAmount: z.number().positive(),
  monthlyContribution: z.number().nonnegative(),
  startDate: z.date(),
  estimatedEndDate: z.date(),
  priority: z.enum(["high", "medium", "low"]),
  category: z.enum([
    "emergency",
    "travel",
    "purchase",
    "investment",
    "custom",
  ]),
});

export type GoalInput = z.infer<typeof goalSchema>;

export const householdSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(60),
  monthlyIncome: z.number().nonnegative(),
});

export type HouseholdInput = z.infer<typeof householdSchema>;
