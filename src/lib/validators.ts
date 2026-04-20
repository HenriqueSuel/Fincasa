import { z } from "zod";
import {
  GOAL_CATEGORY_IDS,
  GOAL_PRIORITY_IDS,
  PAYMENT_METHODS,
  TRANSACTION_CATEGORY_IDS,
  TRANSACTION_TYPES,
} from "@/types/enums";

const MAX_INSTALLMENTS = 24;

export const transactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.coerce
      .number({ error: "Valor inválido" })
      .positive("Valor deve ser maior que zero"),
    description: z
      .string()
      .trim()
      .min(1, "Descrição obrigatória")
      .max(120, "Máximo 120 caracteres"),
    category: z.enum(TRANSACTION_CATEGORY_IDS),
    subcategory: z.string().trim().min(1, "Subcategoria obrigatória"),
    customSubcategory: z
      .string()
      .trim()
      .max(60, "Máximo 60 caracteres")
      .optional(),
    goalId: z.string().trim().optional(),
    date: z.coerce.date({ error: "Data inválida" }),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    installments: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_INSTALLMENTS, `Máximo ${MAX_INSTALLMENTS}x`),
    recurring: z.boolean(),
  })
  .refine((v) => !(v.installments > 1 && v.recurring), {
    message: "Parcelamento e recorrência são exclusivos",
    path: ["recurring"],
  })
  .refine(
    (v) =>
      !(
        v.installments > 1 &&
        (v.type !== "expense" || v.paymentMethod !== "credit")
      ),
    { message: "Parcelamento só no crédito", path: ["installments"] },
  );

export type TransactionInput = z.infer<typeof transactionSchema>;

export const goalSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório").max(60),
    category: z.enum(GOAL_CATEGORY_IDS),
    priority: z.enum(GOAL_PRIORITY_IDS),
    targetAmount: z.coerce.number().positive("Meta deve ser positiva"),
    monthlyContribution: z.coerce.number().nonnegative("Valor inválido"),
    startDate: z.coerce.date({ error: "Data inicial inválida" }),
    estimatedEndDate: z.coerce.date({ error: "Data final inválida" }),
  })
  .refine((v) => v.estimatedEndDate > v.startDate, {
    message: "Data final deve ser depois da inicial",
    path: ["estimatedEndDate"],
  });

export type GoalInput = z.infer<typeof goalSchema>;

export const householdSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(60),
  monthlyIncome: z.coerce.number().nonnegative("Renda inválida"),
});

export type HouseholdInput = z.infer<typeof householdSchema>;

export const acceptInviteSchema = z.object({
  monthlyIncome: z.coerce.number().nonnegative("Renda inválida"),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const customSubcategorySchema = z.object({
  category: z.enum(["essentials", "qualityOfLife", "goals"] as const),
  name: z.string().trim().min(1, "Nome obrigatório").max(40),
  icon: z.string().trim().max(4).optional(),
});

export type CustomSubcategoryInput = z.infer<typeof customSubcategorySchema>;
