import type {
  BudgetCategory,
  DashboardView,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  InviteStatus,
  MemberRole,
  PaymentMethod,
  RecurringFrequency,
  ThemePreference,
  TransactionCategory,
  TransactionType,
} from "./enums";

/**
 * Domain types usam Date (não Timestamp). Para o shape cru do Firestore,
 * veja `src/lib/firebase/converters.ts`.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
  currentHouseholdId: string | null;
  householdIds: string[];
  preferences: {
    theme: ThemePreference;
    defaultView: DashboardView;
  };
  createdAt: Date;
}

export interface HouseholdMember {
  role: MemberRole;
  name: string;
  photoURL?: string | null;
  monthlyIncome: number;
  joinedAt: Date;
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
  createdAt: Date;
}

export interface TransactionInstallment {
  id: string;
  number: number;
  count: number;
  total: number;
}

export interface TransactionRecurring {
  id: string;
  frequency: RecurringFrequency;
  index: number;
  total: number;
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
  date: Date;
  paymentMethod?: PaymentMethod;
  createdBy: string;
  createdByName: string;
  installment?: TransactionInstallment;
  recurring?: TransactionRecurring;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: Date;
  estimatedEndDate: Date;
  createdBy: string;
  createdAt: Date;
}

export interface Invite {
  id: string;
  token: string;
  invitedBy: string;
  invitedByName: string;
  householdName: string;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
}

export interface CustomSubcategory {
  id: string;
  category: BudgetCategory;
  name: string;
  icon?: string;
  createdBy: string;
  createdAt: Date;
}
