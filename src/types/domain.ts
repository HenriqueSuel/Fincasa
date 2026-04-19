import type { Timestamp } from "firebase/firestore";

export type ThemePreference = "dark" | "light" | "system";
export type DashboardView = "mine" | "partner" | "family";

export type BudgetCategory = "essentials" | "qualityOfLife" | "goals";
export type TransactionCategory = BudgetCategory | "income" | "transfer";
export type TransactionType = "income" | "expense" | "transfer";
export type PaymentMethod = "pix" | "credit" | "debit" | "cash";

export type MemberRole = "owner" | "member";

export type GoalStatus = "active" | "paused" | "completed";
export type GoalPriority = "high" | "medium" | "low";
export type GoalCategory =
  | "emergency"
  | "travel"
  | "purchase"
  | "investment"
  | "custom";

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  currentHouseholdId: string | null;
  householdIds: string[];
  preferences: {
    theme: ThemePreference;
    defaultView: DashboardView;
  };
  createdAt: Timestamp;
}

export interface HouseholdMember {
  role: MemberRole;
  name: string;
  photoURL?: string;
  monthlyIncome: number;
  joinedAt: Timestamp;
}

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  members: Record<string, HouseholdMember>;
  memberIds: string[];
  combinedMonthlyIncome: number;
  budgetAllocation: {
    essentials: number;
    qualityOfLife: number;
    goals: number;
  };
  currency: "BRL";
  createdAt: Timestamp;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: TransactionCategory;
  subcategory: string;
  customSubcategory?: string;
  goalId?: string;
  date: Timestamp;
  paymentMethod?: PaymentMethod;
  createdBy: string;
  createdByName: string;
  tags?: string[];
  recurring?: {
    enabled: boolean;
    frequency: "monthly" | "weekly";
    endDate?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: Timestamp;
  estimatedEndDate: Timestamp;
  priority: GoalPriority;
  status: GoalStatus;
  category: GoalCategory;
  createdBy: string;
}

export interface Invite {
  id: string;
  token: string;
  invitedBy: string;
  invitedByName: string;
  householdName: string;
  status: "pending" | "accepted" | "expired";
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedBy?: string;
}

export interface CustomSubcategory {
  id: string;
  category: BudgetCategory;
  name: string;
  icon?: string;
  createdBy: string;
  createdAt: Timestamp;
}
