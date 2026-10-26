import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseUpiNotification, ParsedUpiNotification } from '@/utils/upi-notification-parser';
import { useExpenses } from '@/hooks/expense-store';

const AUTO_TRACKING_ENABLED_KEY = 'auto_tracking_enabled';
const RECENT_TRACKED_CACHE_KEY = 'recent_tracked_notifications';

interface RecentTrackedItem {
    amount: number;
    merchant: string;
    timestamp: number;
}

export function useAutoTracking() {
    const [isAutoTrackingEnabled, setIsAutoTrackingEnabled] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { addExpense, allExpenses } = useExpenses();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(AUTO_TRACKING_ENABLED_KEY);
            if (stored !== null) {
                setIsAutoTrackingEnabled(stored === 'true');
            }
        } catch (e) {
            console.error('Failed to load auto-tracking settings:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const setAutoTrackingEnabled = async (enabled: boolean) => {
        try {
            await AsyncStorage.setItem(AUTO_TRACKING_ENABLED_KEY, enabled ? 'true' : 'false');
            setIsAutoTrackingEnabled(enabled);

            if (enabled && Platform.OS === 'android') {
                promptAndroidNotificationListenerPermission();
            }
        } catch (e) {
            console.error('Failed to save auto-tracking settings:', e);
        }
    };

    const promptAndroidNotificationListenerPermission = () => {
        Alert.alert(
            'Enable Notification Access',
            'To automatically record your GPay, PhonePe, and Bank payments, grant Expense Tracker "Notification Access" in Android Settings.\n\nYour data is read 100% on-device and never leaves your phone.',
            [
                { text: 'Later', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: async () => {
                        try {
                            // Opens the Android Notification Access screen directly
                            await Linking.openSettings();
                        } catch (err) {
                            console.warn('Could not open settings:', err);
                        }
                    },
                },
            ]
        );
    };

    /**
     * Process an incoming notification title and body.
     * Prevents duplicate expenses if multiple apps (e.g. Bank SMS + GPay) alert for the same payment.
     */
    const processNotification = useCallback(
        async (
            title: string,
            body: string,
            packageName: string = ''
        ): Promise<{ success: boolean; parsed?: ParsedUpiNotification; duplicate?: boolean }> => {
            const parsed = parseUpiNotification(title, body, packageName);
            if (!parsed || !parsed.isValidDebit) {
                return { success: false };
            }

            // Check duplicate cache (same amount & merchant within 3 minutes)
            try {
                const now = Date.now();
                const rawCache = await AsyncStorage.getItem(RECENT_TRACKED_CACHE_KEY);
                const recentItems: RecentTrackedItem[] = rawCache ? JSON.parse(rawCache) : [];

                // Filter out entries older than 3 minutes (180,000 ms)
                const validRecent = recentItems.filter(item => now - item.timestamp < 180000);

                const isDuplicate = validRecent.some(
                    item =>
                        Math.abs(item.amount - parsed.amount) < 0.01 &&
                        item.merchant.toLowerCase() === parsed.merchant.toLowerCase()
                );

                if (isDuplicate) {
                    return { success: false, duplicate: true, parsed };
                }

                // Add to recent cache
                validRecent.push({
                    amount: parsed.amount,
                    merchant: parsed.merchant,
                    timestamp: now,
                });
                await AsyncStorage.setItem(RECENT_TRACKED_CACHE_KEY, JSON.stringify(validRecent));

                // Add expense to store
                const today = new Date().toISOString().split('T')[0];
                addExpense({
                    amount: parsed.amount,
                    description: parsed.merchant,
                    category: parsed.category,
                    date: today,
                    source: 'auto_upi',
                });

                return { success: true, parsed };
            } catch (err) {
                console.error('Error processing auto-tracking notification:', err);
                return { success: false };
            }
        },
        [addExpense]
    );

    return {
        isAutoTrackingEnabled,
        setAutoTrackingEnabled,
        processNotification,
        isLoading,
    };
}
