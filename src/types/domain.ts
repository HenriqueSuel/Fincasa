import type {
  BudgetCategory,
  DashboardView,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  InviteStatus,
  LoanStatus,
  MemberRole,
  PaymentMethod,
  RecurringFrequency,
  ShoppingEntryStatus,
  ShoppingSection,
  ThemePreference,
  TransactionCategory,
  TransactionType,
  WeightUnit,
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
  tripId?: string;
  cardId?: string;
  loanId?: string;
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

export interface WeightSpec {
  value: number;
  unit: WeightUnit;
}

export interface ShoppingItem {
  id: string;
  name: string;
  nameLower: string;
  nameNormalized: string;
  section: ShoppingSection;
  defaultBrand?: string;
  defaultWeight?: WeightSpec;
  defaultQuantity?: number;
  lastPrice?: number;
  averagePrice90d?: number;
  purchaseCount: number;
  lastPurchasedAt?: Date;
  archived?: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface ShoppingPurchase {
  id: string;
  price: number;
  brand?: string;
  store?: string;
  weight?: WeightSpec;
  quantity: number;
  tripId: string;
  purchasedBy: string;
  purchasedByName: string;
  purchasedAt: Date;
}

export interface ShoppingListEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemSection: ShoppingSection;
  desiredBrand?: string;
  desiredWeight?: WeightSpec;
  desiredQuantity: number;
  averagePrice90dSnapshot?: number;
  lastPriceSnapshot?: number;
  status: ShoppingEntryStatus;
  priceAtCheckout?: number;
  brandAtCheckout?: string;
  weightAtCheckout?: WeightSpec;
  quantityAtCheckout?: number;
  tripId?: string;
  purchaseId?: string;
  addedBy: string;
  addedAt: Date;
  checkedAt?: Date;
  boughtAt?: Date;
}

export interface ShoppingTrip {
  id: string;
  storeName: string;
  total: number;
  paymentMethod?: PaymentMethod;
  transactionId: string;
  itemCount: number;
  purchasedBy: string;
  purchasedByName: string;
  purchasedAt: Date;
  createdAt: Date;
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  color?: string;
  createdBy: string;
  createdAt: Date;
}

export interface LoanScheduleEntry {
  dueDate: Date;
  amount: number;
  transactionId: string;
}

export interface Loan {
  id: string;
  debtorName: string;
  debtorNameLower: string;
  totalAmount: number;
  outstandingAmount: number;
  repaidAmount: number;
  lendDate: Date;
  paymentMethod: PaymentMethod;
  cardId?: string;
  installments: number;
  description?: string;
  status: LoanStatus;
  schedule: LoanScheduleEntry[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanRepayment {
  id: string;
  amount: number;
  paidAt: Date;
  paymentMethod?: PaymentMethod;
  note?: string;
  transactionId: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}
