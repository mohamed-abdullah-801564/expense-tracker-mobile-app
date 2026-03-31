export interface Expense {
    id: string;
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: string;
    time?: string;
    shared_amount?: number;
    paid_to?: string;
    note?: string;
    createdAt: string;
    isDeleted?: boolean;
}

export type ExpenseCategory =
    | 'Food'
    | 'Transport'
    | 'Utilities'
    | 'Entertainment'
    | 'Shopping'
    | 'Health'
    | 'Other';

export interface CategoryStats {
    category: ExpenseCategory;
    total: number;
    count: number;
    percentage: number;
}

export interface ParsedExpense {
    amount: number;
    description: string;
    category: ExpenseCategory;
    time?: string;
    shared_amount?: number;
    paid_to?: string;
    note?: string;
}

export interface Budget {
    id: string;
    amount: number;
    days: number;
    startDate: string;
    endDate: string;
    createdAt: string;
}

export interface ParsedBudget {
    budget_amount: number;
    budget_days: number | null;
    is_add_operation?: boolean;
}

export interface BudgetTransaction {
    id: string;
    type: 'add' | 'replace';
    amount: number;
    previousAmount?: number;
    deductExistingExpenses: boolean;
    createdAt: string;
    description: string;
}

export interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    error: string;
    success: string;
    warning: string;
    tabBarBackground: string;
    headerBackground: string;
}

export interface NotificationSettings {
    budgetAlerts: boolean;
    dailyLimitAlerts: boolean;
    recurringBillReminders: boolean;
    budgetPeriodReminders: boolean;
}

export interface RecurringBill {
    id: string;
    name: string;
    amount: number;
    category: ExpenseCategory;
    dueDate: string;
    frequency: 'monthly' | 'weekly' | 'yearly';
    isActive: boolean;
    createdAt: string;
}

export interface SplitExpense {
    id: string;
    expenseId: string;
    friendName: string;
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: string;
    isPaid: boolean;
    createdAt: string;
    type?: 'split' | 'lend' | 'borrow';
}

export interface FriendSummary {
    friendName: string;
    totalOwed: number;
    totalPaid: number;
    pendingAmount: number;
    splitCount: number;
    splits: SplitExpense[];
    totalBorrowed: number;
    netBalance: number;
}