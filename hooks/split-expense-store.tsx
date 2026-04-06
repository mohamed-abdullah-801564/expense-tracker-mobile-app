import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SplitExpense, FriendSummary } from '@/types/expense';

const SPLIT_EXPENSES_KEY = 'split_expenses';

const normalizeName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

function useCreateSplitExpenseContext() {
    const queryClient = useQueryClient();
    const [splitExpenses, setSplitExpenses] = useState<SplitExpense[]>([]);

    const splitExpensesQuery = useQuery({
        queryKey: ['split_expenses'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(SPLIT_EXPENSES_KEY);
                const expenses = stored ? JSON.parse(stored) : [];
                console.log(`Loaded ${expenses.length} split expenses from storage`);
                return expenses;
            } catch (error) {
                console.error('Error loading split expenses:', error);
                return [];
            }
        },
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    const saveSplitExpensesMutation = useMutation({
        mutationFn: async (newSplitExpenses: SplitExpense[]) => {
            try {
                await AsyncStorage.setItem(SPLIT_EXPENSES_KEY, JSON.stringify(newSplitExpenses));
                console.log(`Saved ${newSplitExpenses.length} split expenses to storage`);
                return newSplitExpenses;
            } catch (error) {
                console.error('Failed to save split expenses:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['split_expenses'] });
        },
    });
    const { mutate: saveSplitExpenses } = saveSplitExpensesMutation;

    useEffect(() => {
        if (splitExpensesQuery.data) {
            setSplitExpenses(splitExpensesQuery.data);
        }
    }, [splitExpensesQuery.data]);

    const addSplitExpenses = useCallback((splits: SplitExpense[]) => {
        const normalizedSplits = splits.map(split => ({
            ...split,
            friendName: normalizeName(split.friendName)
        }));
        const updated = [...normalizedSplits, ...splitExpenses];
        setSplitExpenses(updated);
        saveSplitExpenses(updated);
    }, [splitExpenses, saveSplitExpenses]);

    const markAsPaid = useCallback((splitId: string) => {
        const updated = splitExpenses.map(split =>
            split.id === splitId ? { ...split, isPaid: true } : split
        );
        setSplitExpenses(updated);
        saveSplitExpenses(updated);
    }, [splitExpenses, saveSplitExpenses]);

    const deleteSplitExpense = useCallback((splitId: string) => {
        const updated = splitExpenses.filter(split => split.id !== splitId);
        setSplitExpenses(updated);
        saveSplitExpenses(updated);
    }, [splitExpenses, saveSplitExpenses]);

    const updateFriendName = useCallback((oldName: string, newName: string) => {
        const normalizedNewName = normalizeName(newName);
        const updated = splitExpenses.map(split =>
            split.friendName === oldName ? { ...split, friendName: normalizedNewName } : split
        );
        setSplitExpenses(updated);
        saveSplitExpenses(updated);
    }, [splitExpenses, saveSplitExpenses]);

    const friendSummaries = useMemo((): FriendSummary[] => {
        const summaryMap: Record<string, FriendSummary> = {};

        splitExpenses.forEach(split => {
            if (!summaryMap[split.friendName]) {
                summaryMap[split.friendName] = {
                    friendName: split.friendName,
                    totalOwed: 0,
                    totalPaid: 0,
                    pendingAmount: 0,
                    splitCount: 0,
                    splits: [],
                    totalBorrowed: 0,
                    netBalance: 0,
                };
            }

            const summary = summaryMap[split.friendName];

            // type defaults to 'split' if undefined (backward compatibility)
            const type = split.type || 'split';

            if (type === 'borrow') {
                // Borrowed: I owe them
                if (!split.isPaid) {
                    summary.totalBorrowed += split.amount;
                }
            } else {
                // Split or Lend: They owe me
                summary.totalOwed += split.amount;
                if (split.isPaid) {
                    summary.totalPaid += split.amount;
                } else {
                    summary.pendingAmount += split.amount;
                }
            }

            summary.splitCount += 1;
            summary.splits.push(split);
        });

        // Calculate Net Balance
        Object.values(summaryMap).forEach(summary => {
            // Net Balance = (They Owe Me) - (I Owe Them)
            summary.netBalance = summary.pendingAmount - summary.totalBorrowed;
        });

        // Sort by magnitude of net balance (absolute value) so most active debts are top
        return Object.values(summaryMap).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
    }, [splitExpenses]);

    const pendingSplits = useMemo(() => {
        return splitExpenses.filter(split => !split.isPaid);
    }, [splitExpenses]);

    const paidSplits = useMemo(() => {
        return splitExpenses.filter(split => split.isPaid);
    }, [splitExpenses]);

    return {
        splitExpenses,
        friendSummaries,
        pendingSplits,
        paidSplits,
        addSplitExpenses,
        markAsPaid,
        deleteSplitExpense,
        updateFriendName,
        isLoading: splitExpensesQuery.isLoading,
        isSaving: saveSplitExpensesMutation.isPending,
    };
}

export const [SplitExpenseProvider, useSplitExpenses] = createContextHook(useCreateSplitExpenseContext);
