export const BUDGET_CATEGORY_IDS = [
  "essentials",
  "qualityOfLife",
  "goals",
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORY_IDS)[number];

export const TRANSACTION_CATEGORY_IDS = [
  ...BUDGET_CATEGORY_IDS,
  "income",
  "transfer",
  "loans",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORY_IDS)[number];

export const LOAN_STATUSES = ["active", "settled", "cancelled"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const INVESTMENT_TYPES = [
  "cdb",
  "treasury",
  "fund",
  "stock",
  "crypto",
  "savings",
  "other",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  cdb: "CDB",
  treasury: "Tesouro Direto",
  fund: "Fundo",
  stock: "Ações",
  crypto: "Cripto",
  savings: "Poupança",
  other: "Outros",
};

export const INVESTMENT_EVENT_TYPES = [
  "contribution",
  "revaluation",
  "withdrawal",
] as const;
export type InvestmentEventType = (typeof INVESTMENT_EVENT_TYPES)[number];

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = ["pix", "credit", "debit", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MEMBER_ROLES = ["owner", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const GOAL_STATUSES = ["active", "paused", "completed"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_PRIORITY_IDS = ["high", "medium", "low"] as const;
export type GoalPriority = (typeof GOAL_PRIORITY_IDS)[number];

export const GOAL_CATEGORY_IDS = [
  "emergency",
  "travel",
  "purchase",
  "investment",
  "custom",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORY_IDS)[number];

export const RECURRING_FREQUENCIES = ["monthly", "weekly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const INVITE_STATUSES = ["pending", "accepted", "expired"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const THEME_PREFERENCES = ["dark", "light", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DASHBOARD_VIEWS = ["mine", "partner", "family"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const SHOPPING_SECTIONS = [
  "frutas_verduras",
  "padaria",
  "carnes_peixes",
  "frios_laticinios",
  "bebidas",
  "mercearia",
  "congelados",
  "limpeza",
  "higiene",
  "outros",
] as const;
export type ShoppingSection = (typeof SHOPPING_SECTIONS)[number];

export const SHOPPING_SECTION_LABELS: Record<ShoppingSection, string> = {
  frutas_verduras: "Frutas e verduras",
  padaria: "Padaria",
  carnes_peixes: "Carnes e peixes",
  frios_laticinios: "Frios e laticínios",
  bebidas: "Bebidas",
  mercearia: "Mercearia",
  congelados: "Congelados",
  limpeza: "Limpeza",
  higiene: "Higiene",
  outros: "Outros",
};

export const WEIGHT_UNITS = ["kg", "g", "L", "ml", "un"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const SHOPPING_ENTRY_STATUSES = [
  "pending",
  "checked",
  "bought",
] as const;
export type ShoppingEntryStatus = (typeof SHOPPING_ENTRY_STATUSES)[number];
