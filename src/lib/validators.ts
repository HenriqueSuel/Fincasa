import { z } from "zod";
import {
  GOAL_CATEGORY_IDS,
  GOAL_PRIORITY_IDS,
  INVESTMENT_TYPES,
  PAYMENT_METHODS,
  SHOPPING_SECTIONS,
  TRANSACTION_CATEGORY_IDS,
  TRANSACTION_TYPES,
  WEIGHT_UNITS,
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
    cardId: z.string().trim().optional(),
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

export const updateMyIncomeSchema = z.object({
  monthlyIncome: z.coerce.number().nonnegative("Renda inválida"),
});

export type UpdateMyIncomeInput = z.infer<typeof updateMyIncomeSchema>;

export const updateHouseholdNameSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(60),
});

export type UpdateHouseholdNameInput = z.infer<
  typeof updateHouseholdNameSchema
>;

export const creditCardSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório").max(40),
    closingDay: z.coerce
      .number()
      .int("Dia inválido")
      .min(1, "Dia inválido")
      .max(31, "Dia inválido"),
    dueDay: z.coerce
      .number()
      .int("Dia inválido")
      .min(1, "Dia inválido")
      .max(31, "Dia inválido"),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex inválida")
      .optional(),
  })
  .refine((v) => v.dueDay !== v.closingDay, {
    message: "Dia de vencimento deve ser diferente do fechamento",
    path: ["dueDay"],
  });

export type CreditCardInput = z.infer<typeof creditCardSchema>;

export const customSubcategorySchema = z.object({
  category: z.enum(["essentials", "qualityOfLife", "goals"] as const),
  name: z.string().trim().min(1, "Nome obrigatório").max(40),
  icon: z.string().trim().max(4).optional(),
});

export type CustomSubcategoryInput = z.infer<typeof customSubcategorySchema>;

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

export const weightSchema = z.object({
  value: z.coerce.number().positive("Valor inválido"),
  unit: z.enum(WEIGHT_UNITS),
});

export const addListItemSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(80),
});

export type AddListItemInput = z.infer<typeof addListItemSchema>;

export const linkListItemSchema = z.object({
  itemId: z.string().min(1),
});

export type LinkListItemInput = z.infer<typeof linkListItemSchema>;

export const updateListEntrySchema = z.object({
  desiredBrand: z.string().trim().max(60).optional(),
  desiredWeight: weightSchema.optional(),
  desiredQuantity: z.coerce.number().int().min(1).max(999).optional(),
});

export type UpdateListEntryInput = z.infer<typeof updateListEntrySchema>;

export const toggleCheckSchema = z.object({
  price: z.coerce.number().positive().optional(),
  brand: z.string().trim().max(60).optional(),
  weight: weightSchema.optional(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
});

export type ToggleCheckInput = z.infer<typeof toggleCheckSchema>;

export const updateShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  section: z.enum(SHOPPING_SECTIONS),
  defaultBrand: z.string().trim().max(60).optional(),
});

export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemSchema>;

export const loanSchema = z
  .object({
    debtorName: z
      .string()
      .trim()
      .min(1, "Nome obrigatório")
      .max(60, "Máximo 60 caracteres"),
    totalAmount: z.coerce
      .number({ error: "Valor inválido" })
      .positive("Valor deve ser maior que zero"),
    lendDate: z.coerce.date({ error: "Data inválida" }),
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "Pagamento obrigatório" }),
    cardId: z.string().trim().optional(),
    installments: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_INSTALLMENTS, `Máximo ${MAX_INSTALLMENTS}x`),
    description: z
      .string()
      .trim()
      .max(120, "Máximo 120 caracteres")
      .optional(),
  })
  .refine(
    (v) => !(v.installments > 1 && v.paymentMethod !== "credit"),
    { message: "Parcelamento só no crédito", path: ["installments"] },
  );

export type LoanInput = z.infer<typeof loanSchema>;

export const updateLoanSchema = z.object({
  debtorName: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(60, "Máximo 60 caracteres"),
  totalAmount: z.coerce
    .number({ error: "Valor inválido" })
    .positive("Valor deve ser maior que zero"),
  lendDate: z.coerce.date({ error: "Data inválida" }),
  description: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .optional(),
});

export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

export const repaymentSchema = z.object({
  amount: z.coerce
    .number({ error: "Valor inválido" })
    .positive("Valor deve ser maior que zero"),
  paidAt: z.coerce.date({ error: "Data inválida" }),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  note: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
});

export type RepaymentInput = z.infer<typeof repaymentSchema>;

export const investmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(60, "Máximo 60 caracteres"),
  type: z.enum(INVESTMENT_TYPES, { error: "Tipo obrigatório" }),
  broker: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
  initialAmount: z.coerce
    .number({ error: "Valor inválido" })
    .nonnegative("Valor não pode ser negativo"),
  startDate: z.coerce.date({ error: "Data inválida" }),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

export const updateInvestmentMetaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(60, "Máximo 60 caracteres"),
  type: z.enum(INVESTMENT_TYPES, { error: "Tipo obrigatório" }),
  broker: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
});

export type UpdateInvestmentMetaInput = z.infer<
  typeof updateInvestmentMetaSchema
>;

export const investmentContributionSchema = z.object({
  amount: z.coerce
    .number({ error: "Valor inválido" })
    .positive("Valor deve ser maior que zero"),
  date: z.coerce.date({ error: "Data inválida" }),
  note: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
});

export type InvestmentContributionInput = z.infer<
  typeof investmentContributionSchema
>;

export const investmentRevaluationSchema = z.object({
  newValue: z.coerce
    .number({ error: "Valor inválido" })
    .nonnegative("Valor não pode ser negativo"),
  date: z.coerce.date({ error: "Data inválida" }),
  note: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
});

export type InvestmentRevaluationInput = z.infer<
  typeof investmentRevaluationSchema
>;

export const investmentWithdrawalSchema = z.object({
  amount: z.coerce
    .number({ error: "Valor inválido" })
    .positive("Valor deve ser maior que zero"),
  date: z.coerce.date({ error: "Data inválida" }),
  note: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
});

export type InvestmentWithdrawalInput = z.infer<
  typeof investmentWithdrawalSchema
>;

export const recordPurchaseSchema = z
  .object({
    amount: z.coerce.number().positive("Valor total deve ser maior que zero"),
    description: z
      .string()
      .trim()
      .min(1, "Descrição obrigatória")
      .max(120, "Máximo 120 caracteres"),
    storeName: z
      .string()
      .trim()
      .min(1, "Mercado obrigatório")
      .max(80, "Máximo 80 caracteres"),
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "Pagamento obrigatório" }),
    date: z.coerce.date({ error: "Data inválida" }),
    installments: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_INSTALLMENTS, `Máximo ${MAX_INSTALLMENTS}x`),
    cardId: z.string().trim().optional(),
  })
  .refine(
    (v) => !(v.installments > 1 && v.paymentMethod !== "credit"),
    { message: "Parcelamento só no crédito", path: ["installments"] },
  );

export type RecordPurchaseInput = z.infer<typeof recordPurchaseSchema>;
