import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NotificationSettings, RecurringBill } from '@/types/expense';
import { useExpenses } from './expense-store';
import { useTheme } from '@/hooks/theme-store';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const RECURRING_BILLS_KEY = 'recurring_bills';
const BUDGET_NOTIFIED_KEY = 'budget_notified_state';

const defaultSettings: NotificationSettings = {
    budgetAlerts: true,
    dailyLimitAlerts: true,
    recurringBillReminders: true,
    budgetPeriodReminders: true,
};

// Only set notification handler if not in Expo Go
if (Platform.OS !== 'web') {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (error) {
        console.log('Notification handler setup failed (likely Expo Go limitation):', error);
    }
}

function useCreateNotificationContext() {
    const queryClient = useQueryClient();
    const { budgetProgress, allExpenses } = useExpenses();
    const { colors } = useTheme();
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
    const [budgetNotifiedState, setBudgetNotifiedState] = useState<{
        budgetKey: string;
        notified80: boolean;
        notified100: boolean;
        notifiedEnd: boolean;
    }>({
        budgetKey: '',
        notified80: false,
        notified100: false,
        notifiedEnd: false,
    });
    const budgetNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dailyLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBudgetPercentageRef = useRef<number>(0);
    const lastDailyTotalRef = useRef<number>(0);
    const notifiedBillsTodayRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        AsyncStorage.getItem(BUDGET_NOTIFIED_KEY).then(stored => {
            if (stored) {
                try {
                    setBudgetNotifiedState(JSON.parse(stored));
                } catch (e) {
                    console.error('Error loading budget notified state:', e);
                }
            }
        });
    }, []);

    const settingsQuery = useQuery({
        queryKey: ['notification_settings'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
                return stored ? JSON.parse(stored) : defaultSettings;
            } catch (error) {
                console.error('Error loading notification settings:', error);
                return defaultSettings;
            }
        }
    });

    const billsQuery = useQuery({
        queryKey: ['recurring_bills'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(RECURRING_BILLS_KEY);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.error('Error loading recurring bills:', error);
                return [];
            }
        }
    });

    const saveSettingsMutation = useMutation({
        mutationFn: async (newSettings: NotificationSettings) => {
            await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification_settings'] });
        }
    });

    const saveBillsMutation = useMutation({
        mutationFn: async (newBills: RecurringBill[]) => {
            await AsyncStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(newBills));
            return newBills;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring_bills'] });
        }
    });

    const { mutate: saveSettings } = saveSettingsMutation;
    const { mutate: saveBills } = saveBillsMutation;

    useEffect(() => {
        if (settingsQuery.data) {
            setSettings(settingsQuery.data);
        }
    }, [settingsQuery.data]);

    useEffect(() => {
        if (billsQuery.data) {
            setRecurringBills(billsQuery.data);
        }
    }, [billsQuery.data]);

    const requestPermissions = useCallback(async () => {
        if (Platform.OS === 'web') return false;

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permission not granted');
                return false;
            }

            return true;
        } catch (error) {
            console.log('Error requesting permissions:', error);
            return false;
        }
    }, []);

    const scheduleNotification = useCallback(async (title: string, body: string, trigger?: any) => {
        if (Platform.OS === 'web') return;

        try {
            // Check permissions first but don't force request if just scheduling
            // The user will be prompted on the first meaningful interaction that requires it
            // or we depend on them having accepted it earlier.
            // However, to be safe, we can check status.

            const settings = await Notifications.getPermissionsAsync();
            if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body,
                        sound: 'default'
                    },
                    trigger: trigger || null,
                });
            } else {
                console.log('Notification permission not granted, skipping schedule.');
            }
        } catch (error) {
            console.log('Error scheduling notification:', error);
        }
    }, []);

    const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        saveSettings(updated);
    }, [settings, saveSettings]);

    const addRecurringBill = useCallback((bill: Omit<RecurringBill, 'id' | 'createdAt'>) => {
        const newBill: RecurringBill = {
            ...bill,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
        };
        const updated = [newBill, ...recurringBills];
        setRecurringBills(updated);
        saveBills(updated);
    }, [recurringBills, saveBills]);

    const removeRecurringBill = useCallback((id: string) => {
        const updated = recurringBills.filter(bill => bill.id !== id);
        setRecurringBills(updated);
        saveBills(updated);
    }, [recurringBills, saveBills]);

    const toggleBillActive = useCallback((id: string) => {
        const updated = recurringBills.map(bill =>
            bill.id === id ? { ...bill, isActive: !bill.isActive } : bill
        );
        setRecurringBills(updated);
        saveBills(updated);
    }, [recurringBills, saveBills]);

    useEffect(() => {
        if (!budgetProgress || !settings.budgetAlerts) {
            if (budgetNotificationTimeoutRef.current) {
                clearTimeout(budgetNotificationTimeoutRef.current);
                budgetNotificationTimeoutRef.current = null;
            }
            return;
        }

        const { percentageUsed, budget } = budgetProgress;
        const currentBudgetKey = `${budget.startDate}_${budget.endDate}_${budget.amount}`;

        if (budgetNotificationTimeoutRef.current) {
            clearTimeout(budgetNotificationTimeoutRef.current);
        }

        budgetNotificationTimeoutRef.current = setTimeout(() => {
            let nextState = { ...budgetNotifiedState };
            let hasChanged = false;

            if (nextState.budgetKey !== currentBudgetKey) {
                nextState = {
                    budgetKey: currentBudgetKey,
                    notified80: false,
                    notified100: false,
                    notifiedEnd: false,
                };
                hasChanged = true;
            }

            if (percentageUsed >= 100 && !nextState.notified100) {
                scheduleNotification(
                    'Budget Exceeded!',
                    `You've exceeded your budget by ${colors.currencySymbol}${Math.abs(budgetProgress.remaining).toFixed(2)}`
                );
                nextState.notified100 = true;
                nextState.notified80 = true;
                hasChanged = true;
            } else if (percentageUsed >= 80 && percentageUsed < 100 && !nextState.notified80) {
                scheduleNotification(
                    'Budget Alert',
                    `You've used ${percentageUsed.toFixed(1)}% of your budget. ${colors.currencySymbol}${budgetProgress.remaining.toFixed(2)} remaining.`
                );
                nextState.notified80 = true;
                hasChanged = true;
            }

            if (percentageUsed < 80 && (nextState.notified80 || nextState.notified100)) {
                nextState.notified80 = false;
                nextState.notified100 = false;
                hasChanged = true;
            }

            if (hasChanged) {
                setBudgetNotifiedState(nextState);
                AsyncStorage.setItem(BUDGET_NOTIFIED_KEY, JSON.stringify(nextState)).catch(console.error);
            }

            lastBudgetPercentageRef.current = percentageUsed;
        }, 1000);

        return () => {
            if (budgetNotificationTimeoutRef.current) {
                clearTimeout(budgetNotificationTimeoutRef.current);
            }
        };
    }, [budgetProgress, settings.budgetAlerts, budgetNotifiedState, scheduleNotification, colors.currencySymbol]);

    useEffect(() => {
        if (!settings.dailyLimitAlerts || !budgetProgress) {
            if (dailyLimitTimeoutRef.current) {
                clearTimeout(dailyLimitTimeoutRef.current);
                dailyLimitTimeoutRef.current = null;
            }
            return;
        }

        const today = new Date();
        const todayExpenses = allExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.toDateString() === today.toDateString();
        });

        const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        if (todayTotal === lastDailyTotalRef.current) {
            return;
        }

        if (dailyLimitTimeoutRef.current) {
            clearTimeout(dailyLimitTimeoutRef.current);
        }

        dailyLimitTimeoutRef.current = setTimeout(() => {
            const dailyLimit = budgetProgress.budget.amount / budgetProgress.budget.days;

            if (todayTotal > dailyLimit && todayTotal !== lastDailyTotalRef.current) {
                const excess = todayTotal - dailyLimit;
                scheduleNotification(
                    'Daily Limit Exceeded',
                    `Today's expenses (${colors.currencySymbol}${todayTotal.toFixed(2)}) exceeded your daily limit of ${colors.currencySymbol}${dailyLimit.toFixed(2)} by ${colors.currencySymbol}${excess.toFixed(2)}`
                );
            }

            lastDailyTotalRef.current = todayTotal;
        }, 2000);

        return () => {
            if (dailyLimitTimeoutRef.current) {
                clearTimeout(dailyLimitTimeoutRef.current);
            }
        };
    }, [allExpenses, budgetProgress, settings.dailyLimitAlerts, scheduleNotification, colors.currencySymbol]);

    useEffect(() => {
        if (!settings.recurringBillReminders || recurringBills.length === 0) return;

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let billsUpdated = false;
        const updatedBills = recurringBills.map(bill => {
            if (!bill.isActive) return bill;

            const dueDate = new Date(bill.dueDate);
            if (isNaN(dueDate.getTime())) return bill;

            // Check if reminder is due for tomorrow and not yet scheduled today
            if (dueDate.toDateString() === tomorrow.toDateString()) {
                const reminderKey = `${bill.id}_${tomorrow.toISOString().split('T')[0]}`;
                if (!notifiedBillsTodayRef.current.has(reminderKey)) {
                    notifiedBillsTodayRef.current.add(reminderKey);
                    scheduleNotification(
                        'Bill Reminder',
                        `${bill.name} (${colors.currencySymbol}${bill.amount}) is due tomorrow`
                    );
                }
            }

            // Auto-advance due date if it has passed
            const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            if (dueMidnight < todayMidnight) {
                const nextDate = new Date(dueMidnight);
                if (bill.frequency === 'weekly') {
                    while (nextDate <= todayMidnight) {
                        nextDate.setDate(nextDate.getDate() + 7);
                    }
                } else if (bill.frequency === 'yearly') {
                    while (nextDate <= todayMidnight) {
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                    }
                } else {
                    // monthly default
                    while (nextDate <= todayMidnight) {
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    }
                }
                billsUpdated = true;
                const year = nextDate.getFullYear();
                const month = String(nextDate.getMonth() + 1).padStart(2, '0');
                const day = String(nextDate.getDate()).padStart(2, '0');
                return { ...bill, dueDate: `${year}-${month}-${day}` };
            }

            return bill;
        });

        if (billsUpdated) {
            setRecurringBills(updatedBills);
            saveBills(updatedBills);
        }
    }, [recurringBills, settings.recurringBillReminders, scheduleNotification, colors.currencySymbol, saveBills]);

    useEffect(() => {
        if (!settings.budgetPeriodReminders || !budgetProgress) return;

        const { budget } = budgetProgress;
        const currentBudgetKey = `${budget.startDate}_${budget.endDate}_${budget.amount}`;

        if (budgetProgress.daysRemaining === 1 && budgetNotifiedState.budgetKey === currentBudgetKey && !budgetNotifiedState.notifiedEnd) {
            scheduleNotification(
                'Budget Period Ending',
                'Your current budget period ends tomorrow. Consider setting a new budget.'
            );
            const nextState = { ...budgetNotifiedState, notifiedEnd: true };
            setBudgetNotifiedState(nextState);
            AsyncStorage.setItem(BUDGET_NOTIFIED_KEY, JSON.stringify(nextState)).catch(console.error);
        }
    }, [budgetProgress, settings.budgetPeriodReminders, budgetNotifiedState, scheduleNotification]);

    return {
        settings,
        updateSettings,
        recurringBills,
        addRecurringBill,
        removeRecurringBill,
        toggleBillActive,
        scheduleNotification,
        requestPermissions,
        isLoading: settingsQuery.isLoading || billsQuery.isLoading,
    };
}

export const [NotificationProvider, useNotifications] = createContextHook(useCreateNotificationContext);