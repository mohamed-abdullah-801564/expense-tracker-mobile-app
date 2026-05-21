import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Expense, ExpenseCategory, CategoryStats, Budget, BudgetTransaction } from '@/types/expense';
import { CATEGORIES } from '@/constants/categories';
import { useTheme } from '@/hooks/theme-store';

const STORAGE_KEY = 'expenses';
const BUDGET_STORAGE_KEY = 'budget';
const BUDGET_HISTORY_STORAGE_KEY = 'budget_history';
const BACKUP_STORAGE_KEY = 'expense_backup';
const EXPENSES_COUNT_KEY = 'total_expenses_added';
const STORAGE_VERSION_KEY = 'storage_version';
const CURRENT_STORAGE_VERSION = '1.0';

// Enhanced storage utilities with error handling and backup
const StorageUtils = {
    async safeGet(key: string, defaultValue: any = null) {
        try {
            const stored = await AsyncStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored);
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            // Try to recover from backup if main storage fails
            if (key !== BACKUP_STORAGE_KEY) {
                try {
                    const backup = await AsyncStorage.getItem(BACKUP_STORAGE_KEY);
                    if (backup) {
                        const backupData = JSON.parse(backup);
                        if (backupData[key]) {
                            console.log(`Recovered ${key} from backup`);
                            return backupData[key];
                        }
                    }
                } catch (backupError) {
                    console.error(`Backup recovery failed for ${key}:`, backupError);
                }
            }
            return defaultValue;
        }
    },

    async safeSet(key: string, value: any) {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            // Create backup of critical data
            if ([STORAGE_KEY, BUDGET_STORAGE_KEY, BUDGET_HISTORY_STORAGE_KEY].includes(key)) {
                await this.createBackup();
            }
            return true;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    },

    async createBackup() {
        try {
            const expenses = await this.safeGet(STORAGE_KEY, []);
            const budget = await this.safeGet(BUDGET_STORAGE_KEY, null);
            const budgetHistory = await this.safeGet(BUDGET_HISTORY_STORAGE_KEY, []);

            const backup = {
                [STORAGE_KEY]: expenses,
                [BUDGET_STORAGE_KEY]: budget,
                [BUDGET_HISTORY_STORAGE_KEY]: budgetHistory,
                timestamp: new Date().toISOString(),
                version: CURRENT_STORAGE_VERSION
            };

            await AsyncStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
            console.log('Backup created successfully');
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    },

    async validateAndMigrate() {
        try {
            const version = await AsyncStorage.getItem(STORAGE_VERSION_KEY);
            if (version !== CURRENT_STORAGE_VERSION) {
                console.log('Storage migration needed');
                // Perform any necessary migrations here
                await AsyncStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
            }
        } catch (error) {
            console.error('Storage validation failed:', error);
        }
    },

    async exportData() {
        try {
            const expenses = await this.safeGet(STORAGE_KEY, []);
            const budget = await this.safeGet(BUDGET_STORAGE_KEY, null);
            const budgetHistory = await this.safeGet(BUDGET_HISTORY_STORAGE_KEY, []);

            return {
                expenses,
                budget,
                budgetHistory,
                exportDate: new Date().toISOString(),
                version: CURRENT_STORAGE_VERSION
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    },

    async importData(data: any) {
        try {
            if (data.expenses) {
                await this.safeSet(STORAGE_KEY, data.expenses);
            }
            if (data.budget) {
                await this.safeSet(BUDGET_STORAGE_KEY, data.budget);
            }
            if (data.budgetHistory) {
                await this.safeSet(BUDGET_HISTORY_STORAGE_KEY, data.budgetHistory);
            }
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
};

// Create a stable context value function
function useCreateExpenseContext() {
    const queryClient = useQueryClient();
    const { colors } = useTheme();

    // Always call hooks in the same order - state hooks first
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [budgetHistory, setBudgetHistory] = useState<BudgetTransaction[]>([]);
    const [totalExpensesAdded, setTotalExpensesAdded] = useState<number>(0);
    const [isAiModalVisible, setIsAiModalVisible] = useState(false);
    const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);

    // Initialize storage validation on first load
    useEffect(() => {
        StorageUtils.validateAndMigrate();
        const loadCount = async () => {
            const count = await StorageUtils.safeGet(EXPENSES_COUNT_KEY, 0);
            setTotalExpensesAdded(count);
        };
        loadCount();
    }, []);

    // Load expenses from AsyncStorage with enhanced error handling
    const expensesQuery = useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            let expenses = await StorageUtils.safeGet(STORAGE_KEY, []);
            expenses = expenses.map((expense: any) => {
                if (!CATEGORIES.includes(expense.category)) {
                    return { ...expense, category: 'Other' };
                }
                return expense;
            });
            console.log(`Loaded ${expenses.length} expenses from storage`);
            return expenses;
        },
        staleTime: Infinity, // Expenses don't change unless we change them
        gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    });

    // Load budget from AsyncStorage with enhanced error handling
    const budgetQuery = useQuery({
        queryKey: ['budget'],
        queryFn: async () => {
            const budget = await StorageUtils.safeGet(BUDGET_STORAGE_KEY, null);
            console.log('Loaded budget from storage:', budget ? 'Found' : 'None');
            return budget;
        },
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
    });

    // Load budget history from AsyncStorage with enhanced error handling
    const budgetHistoryQuery = useQuery({
        queryKey: ['budget_history'],
        queryFn: async () => {
            const history = await StorageUtils.safeGet(BUDGET_HISTORY_STORAGE_KEY, []);
            console.log(`Loaded ${history.length} budget transactions from storage`);
            return history;
        },
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
    });

    // Save expenses to AsyncStorage with enhanced error handling
    const saveMutation = useMutation({
        mutationFn: async (newExpenses: Expense[]) => {
            const success = await StorageUtils.safeSet(STORAGE_KEY, newExpenses);
            if (!success) {
                throw new Error('Failed to save expenses');
            }
            console.log(`Saved ${newExpenses.length} expenses to storage`);
            return newExpenses;
        },
        onSuccess: (newExpenses) => {
            queryClient.setQueryData(['expenses'], newExpenses);
        },
        onError: (error) => {
            console.error('Failed to save expenses:', error);
            // Could show user notification here
        }
    });
    const { mutate: saveExpenses } = saveMutation;

    // Save budget to AsyncStorage with enhanced error handling
    const saveBudgetMutation = useMutation({
        mutationFn: async (newBudget: Budget | null) => {
            if (newBudget) {
                const success = await StorageUtils.safeSet(BUDGET_STORAGE_KEY, newBudget);
                if (!success) {
                    throw new Error('Failed to save budget');
                }
                console.log('Saved budget to storage:', newBudget.amount);
            } else {
                await AsyncStorage.removeItem(BUDGET_STORAGE_KEY);
                console.log('Removed budget from storage');
            }
            return newBudget;
        },
        onSuccess: (newBudget) => {
            queryClient.setQueryData(['budget'], newBudget);
        },
        onError: (error) => {
            console.error('Failed to save budget:', error);
        }
    });
    const { mutate: saveBudget } = saveBudgetMutation;

    // Save budget history to AsyncStorage with enhanced error handling
    const saveBudgetHistoryMutation = useMutation({
        mutationFn: async (newHistory: BudgetTransaction[]) => {
            const success = await StorageUtils.safeSet(BUDGET_HISTORY_STORAGE_KEY, newHistory);
            if (!success) {
                throw new Error('Failed to save budget history');
            }
            console.log(`Saved ${newHistory.length} budget transactions to storage`);
            return newHistory;
        },
        onSuccess: (newHistory) => {
            queryClient.setQueryData(['budget_history'], newHistory);
        },
        onError: (error) => {
            console.error('Failed to save budget history:', error);
        }
    });
    const { mutate: saveBudgetHistory } = saveBudgetHistoryMutation;

    useEffect(() => {
        if (expensesQuery.data) {
            setExpenses(expensesQuery.data);
        }
    }, [expensesQuery.data]);

    useEffect(() => {
        if (budgetQuery.data !== undefined) {
            setBudget(budgetQuery.data);
        }
    }, [budgetQuery.data]);

    useEffect(() => {
        if (budgetHistoryQuery.data) {
            setBudgetHistory(budgetHistoryQuery.data);
        }
    }, [budgetHistoryQuery.data]);

    const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
        const newExpense: Expense = {
            ...expense,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
        };
        const updated = [newExpense, ...expenses];
        setExpenses(updated);
        saveExpenses(updated);

        // Increment and check milestones
        const newCount = totalExpensesAdded + 1;
        setTotalExpensesAdded(newCount);
        StorageUtils.safeSet(EXPENSES_COUNT_KEY, newCount);

        if (newCount === 5 || newCount === 10 || (newCount > 10 && newCount % 10 === 0)) {
            setIsFeedbackModalVisible(true);
        }
    }, [expenses, saveExpenses, totalExpensesAdded]);

    const deleteExpense = useCallback((id: string) => {
        const updated = expenses.map(e =>
            e.id === id ? { ...e, isDeleted: true } : e
        );
        setExpenses(updated);
        saveExpenses(updated);
    }, [expenses, saveExpenses]);

    const clearAllExpenses = useCallback(() => {
        setExpenses([]);
        saveExpenses([]);
    }, [saveExpenses]);

    const setBudgetData = useCallback((budgetAmount: number, budgetDays: number, type: 'add' | 'replace' = 'replace', deductExistingExpenses: boolean = false) => {
        let finalAmount = budgetAmount;
        let description = '';
        let startDate = new Date();
        let endDate = new Date();
        endDate.setDate(startDate.getDate() + budgetDays);

        if (type === 'add' && budget) {
            // Keep existing dates
            startDate = new Date(budget.startDate);
            endDate = new Date(budget.endDate);

            finalAmount = budget.amount + budgetAmount;
            description = `Added ${colors.currencySymbol}${budgetAmount} to existing budget of ${colors.currencySymbol}${budget.amount}`;
        } else {
            description = `Set new budget of ${colors.currencySymbol}${budgetAmount} for ${budgetDays} days`;
        }

        if (deductExistingExpenses) {
            const totalExpenses = expenses.filter(e => !e.isDeleted).reduce((sum, exp) => sum + exp.amount, 0);
            finalAmount = Math.max(0, finalAmount - totalExpenses);
            description += ` (deducted ${colors.currencySymbol}${totalExpenses} existing expenses)`;
        }

        const newBudget: Budget = {
            id: Date.now().toString(),
            amount: finalAmount,
            days: type === 'add' && budget ? budget.days : budgetDays, // Keep existing days if adding, though technically days arg might be ignored primarily for dates
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            createdAt: new Date().toISOString(),
        };

        const transaction: BudgetTransaction = {
            id: Date.now().toString(),
            type,
            amount: budgetAmount,
            previousAmount: budget?.amount,
            deductExistingExpenses,
            createdAt: new Date().toISOString(),
            description,
        };

        const updatedHistory = [transaction, ...budgetHistory];

        setBudget(newBudget);
        setBudgetHistory(updatedHistory);
        saveBudget(newBudget);
        saveBudgetHistory(updatedHistory);
    }, [budget, expenses, budgetHistory, saveBudget, saveBudgetHistory, colors.currencySymbol]);

    const clearBudget = useCallback(() => {
        setBudget(null);
        saveBudget(null);
    }, [saveBudget]);

    const clearBudgetHistory = useCallback(() => {
        setBudgetHistory([]);
        saveBudgetHistory([]);
    }, [saveBudgetHistory]);

    // Data export/import functions
    const exportAllData = useCallback(async () => {
        const data = await StorageUtils.exportData();
        return data;
    }, []);

    const importAllData = useCallback(async (data: any) => {
        const success = await StorageUtils.importData(data);
        if (success) {
            // Refresh all queries to show imported data
            queryClient.setQueryData(['expenses'], data.expenses || []);
            queryClient.setQueryData(['budget'], data.budget || null);
            queryClient.setQueryData(['budget_history'], data.budgetHistory || []);
        }
        return success;
    }, [queryClient]);

    const createBackup = useCallback(async () => {
        await StorageUtils.createBackup();
    }, []);

    // Calculate statistics
    const stats = useMemo(() => {
        const categoryTotals: Record<string, CategoryStats> = {};
        let grandTotal = 0;

        expenses.forEach(expense => {
            if (expense.isDeleted) return; // Skip deleted expenses

            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = {
                    category: expense.category,
                    total: 0,
                    count: 0,
                    percentage: 0,
                };
            }
            categoryTotals[expense.category].total += expense.amount;
            categoryTotals[expense.category].count += 1;
            grandTotal += expense.amount;
        });

        // Calculate percentages
        Object.values(categoryTotals).forEach(stat => {
            stat.percentage = grandTotal > 0 ? (stat.total / grandTotal) * 100 : 0;
        });

        return {
            categories: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
            total: grandTotal,
            count: expenses.filter(e => !e.isDeleted).length,
        };
    }, [expenses]);

    // Calculate budget progress
    const budgetProgress = useMemo(() => {
        if (!budget) return null;

        const now = new Date();
        const budgetStart = new Date(budget.startDate);
        const budgetEnd = new Date(budget.endDate);

        // Filter expenses within budget period and NOT deleted
        const budgetExpenses = expenses.filter(expense => {
            if (expense.isDeleted) return false;
            const expenseDate = new Date(expense.date);
            return expenseDate >= budgetStart && expenseDate <= budgetEnd;
        });

        const totalSpent = budgetExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = budget.amount - totalSpent;
        const percentageUsed = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;

        // Calculate days remaining
        const daysRemaining = Math.max(0, Math.ceil((budgetEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const isExpired = now > budgetEnd;

        return {
            budget,
            totalSpent,
            remaining,
            percentageUsed,
            daysRemaining,
            isExpired,
            isOverBudget: totalSpent > budget.amount
        };
    }, [budget, expenses]);

    // Filter expenses by category
    const filteredExpenses = useMemo(() => {
        if (!selectedCategory) return expenses.filter(e => !e.isDeleted);
        return expenses.filter(e => e.category === selectedCategory && !e.isDeleted);
    }, [expenses, selectedCategory]);

    return {
        expenses: filteredExpenses,
        allExpenses: expenses,
        stats,
        selectedCategory,
        setSelectedCategory,
        addExpense,
        deleteExpense,
        clearAllExpenses,
        budget,
        budgetProgress,
        setBudgetData,
        clearBudget,
        budgetHistory,
        clearBudgetHistory,
        isAiModalVisible,
        toggleAiModal: useCallback(() => setIsAiModalVisible(prev => !prev), []),
        isFeedbackModalVisible,
        setFeedbackModalVisible: setIsFeedbackModalVisible,
        totalExpensesAdded,
        exportAllData,
        importAllData,
        createBackup,
        isLoading: expensesQuery.isLoading || budgetQuery.isLoading || budgetHistoryQuery.isLoading,
        isSaving: saveMutation.isPending || saveBudgetMutation.isPending || saveBudgetHistoryMutation.isPending,
    };
}

export const [ExpenseProvider, useExpenses] = createContextHook(useCreateExpenseContext);

export function useExpensesByDateRange(startDate: Date, endDate: Date) {
    const { allExpenses } = useExpenses();

    return useMemo(() => {
        return allExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
        });
    }, [allExpenses, startDate, endDate]);
}

export function useMonthlyExpenses() {
    const { allExpenses } = useExpenses();

    return useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return allExpenses.filter(expense => {
            if (expense.isDeleted) return false;
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
        });
    }, [allExpenses]);
}