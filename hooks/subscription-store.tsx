import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
    PurchasesPackage,
    CustomerInfo,
    LOG_LEVEL,
} from 'react-native-purchases';
import { SubscriptionState } from '@/types/expense';

const SUBSCRIPTION_STORAGE_KEY = 'user_subscription_state_v1';
export const MAX_FREE_CSV_IMPORTS = 3;
export const MAX_FREE_AI_SCANS_PER_DAY = 3;

export const REVENUECAT_TEST_API_KEY = 'test_EYXJHphdZLOpLLyBqrHfbvPLaQm';
export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || REVENUECAT_TEST_API_KEY;

export type PaywallReason = 'auto_upi' | 'csv_limit' | 'ocr_limit' | 'settings' | 'general';

const defaultSubscriptionState: SubscriptionState = {
    isPro: false,
    plan: 'none',
    trialActive: false,
    trialEndsAt: null,
    csvImportsUsed: 0,
    aiScansDate: new Date().toISOString().split('T')[0],
    aiScansUsedToday: 0,
};

const isRevenueCatSupported = Platform.OS === 'android' || Platform.OS === 'ios';

function useCreateSubscriptionContext() {
    const [subState, setSubState] = useState<SubscriptionState>(defaultSubscriptionState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [paywallVisible, setPaywallVisible] = useState<boolean>(false);
    const [paywallReason, setPaywallReason] = useState<PaywallReason>('general');
    const [availablePackages, setAvailablePackages] = useState<PurchasesPackage[]>([]);

    useEffect(() => {
        loadSubscription();
        initRevenueCat();
    }, []);

    const updateFromCustomerInfo = (info: CustomerInfo) => {
        try {
            const isProActive = typeof info?.entitlements?.active?.['pro'] !== 'undefined';
            if (isProActive) {
                const ent = info.entitlements.active['pro'];
                const prodId = (ent.productIdentifier || '').toLowerCase();
                const isYearly = prodId.includes('yearly') || prodId.includes('annual');
                setSubState(prev => {
                    const next: SubscriptionState = {
                        ...prev,
                        isPro: true,
                        plan: isYearly ? 'yearly' : 'monthly',
                        trialActive: false,
                    };
                    AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next)).catch(console.error);
                    return next;
                });
            }
        } catch (e) {
            console.error('[RevenueCat] Failed to parse CustomerInfo:', e);
        }
    };

    const initRevenueCat = async () => {
        if (!isRevenueCatSupported) return;
        try {
            const configured = await Purchases.isConfigured();
            if (!configured) {
                Purchases.setLogLevel(LOG_LEVEL.DEBUG);
                Purchases.configure({ apiKey: REVENUECAT_API_KEY });
            }

            Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
                updateFromCustomerInfo(info);
            });

            const customerInfo = await Purchases.getCustomerInfo();
            updateFromCustomerInfo(customerInfo);

            const offerings = await Purchases.getOfferings();
            if (offerings.current?.availablePackages) {
                setAvailablePackages(offerings.current.availablePackages);
            }
        } catch (error) {
            console.warn('[RevenueCat] Setup skipped or unavailable in current runtime (e.g. Expo Go sandbox):', error);
        }
    };

    const loadSubscription = async () => {
        try {
            const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
            const todayStr = new Date().toISOString().split('T')[0];

            if (raw) {
                let parsed: SubscriptionState = JSON.parse(raw);

                // Reset daily AI scans counter if date rolled over
                if (parsed.aiScansDate !== todayStr) {
                    parsed = {
                        ...parsed,
                        aiScansDate: todayStr,
                        aiScansUsedToday: 0,
                    };
                }

                // Check trial expiry
                if (parsed.trialActive && parsed.trialEndsAt) {
                    if (Date.now() > new Date(parsed.trialEndsAt).getTime()) {
                        parsed = {
                            ...parsed,
                            trialActive: false,
                        };
                    }
                }

                setSubState(parsed);
                await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(parsed));
            } else {
                setSubState(defaultSubscriptionState);
            }
        } catch (error) {
            console.error('Error loading subscription state:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveState = async (updated: SubscriptionState) => {
        try {
            setSubState(updated);
            await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving subscription state:', error);
        }
    };

    const startTrial = useCallback(async () => {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const endsAt = new Date(Date.now() + sevenDaysMs).toISOString();
        const updated: SubscriptionState = {
            ...subState,
            trialActive: true,
            trialEndsAt: endsAt,
        };
        await saveState(updated);
    }, [subState]);

    const upgradeToPro = useCallback(async (plan: 'monthly' | 'yearly'): Promise<boolean> => {
        if (isRevenueCatSupported) {
            try {
                const isConf = await Purchases.isConfigured();
                if (isConf && availablePackages.length > 0) {
                    const targetPkg = availablePackages.find(p => {
                        const id = (p.identifier + ' ' + p.product.identifier).toLowerCase();
                        return plan === 'yearly'
                            ? id.includes('year') || id.includes('annual')
                            : id.includes('month');
                    }) || availablePackages[0];

                    if (targetPkg) {
                        const { customerInfo } = await Purchases.purchasePackage(targetPkg);
                        const hasPro = typeof customerInfo?.entitlements?.active?.['pro'] !== 'undefined';
                        if (hasPro) {
                            updateFromCustomerInfo(customerInfo);
                            setPaywallVisible(false);
                            return true;
                        }
                    }
                }
            } catch (err: any) {
                if (err.userCancelled) {
                    console.log('User cancelled RevenueCat purchase');
                    return false;
                }
                console.warn('[RevenueCat] purchase error, falling back to sandbox state:', err?.message || err);
            }
        }

        // Sandbox / local activation (for testing when products are in Test Store or offline)
        const updated: SubscriptionState = {
            ...subState,
            isPro: true,
            plan,
            trialActive: false,
        };
        await saveState(updated);
        setPaywallVisible(false);
        return true;
    }, [availablePackages, subState]);

    const cancelPro = useCallback(async () => {
        const updated: SubscriptionState = {
            ...subState,
            isPro: false,
            plan: 'none',
        };
        await saveState(updated);
    }, [subState]);

    const restorePurchases = useCallback(async (): Promise<{ success: boolean; isPro: boolean; message: string }> => {
        if (isRevenueCatSupported) {
            try {
                const isConf = await Purchases.isConfigured();
                if (isConf) {
                    const customerInfo = await Purchases.restorePurchases();
                    const hasPro = typeof customerInfo?.entitlements?.active?.['pro'] !== 'undefined';
                    if (hasPro) {
                        updateFromCustomerInfo(customerInfo);
                        return {
                            success: true,
                            isPro: true,
                            message: 'Your Pro subscription was successfully restored! 🎉',
                        };
                    } else {
                        return {
                            success: true,
                            isPro: false,
                            message: 'No active Google Play Pro subscription found for this account.',
                        };
                    }
                }
            } catch (err: any) {
                console.warn('[RevenueCat] restore error:', err?.message || err);
            }
        }

        return {
            success: true,
            isPro: subState.isPro,
            message: subState.isPro
                ? 'Your Pro subscription is active on this device!'
                : 'No active subscription found to restore.',
        };
    }, [subState.isPro]);

    const canUseFeature = useCallback((feature: 'auto_upi' | 'csv_import' | 'ai_scan'): boolean => {
        if (subState.isPro) return true;

        if (feature === 'auto_upi') {
            return subState.trialActive;
        }

        if (feature === 'csv_import') {
            return subState.csvImportsUsed < MAX_FREE_CSV_IMPORTS;
        }

        if (feature === 'ai_scan') {
            const todayStr = new Date().toISOString().split('T')[0];
            const scansUsed = subState.aiScansDate === todayStr ? subState.aiScansUsedToday : 0;
            return scansUsed < MAX_FREE_AI_SCANS_PER_DAY;
        }

        return false;
    }, [subState]);

    const recordCsvImport = useCallback(async () => {
        if (subState.isPro) return;
        const updated: SubscriptionState = {
            ...subState,
            csvImportsUsed: subState.csvImportsUsed + 1,
        };
        await saveState(updated);
    }, [subState]);

    const recordAiScan = useCallback(async () => {
        if (subState.isPro) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const isSameDay = subState.aiScansDate === todayStr;
        const updated: SubscriptionState = {
            ...subState,
            aiScansDate: todayStr,
            aiScansUsedToday: isSameDay ? subState.aiScansUsedToday + 1 : 1,
        };
        await saveState(updated);
    }, [subState]);

    const openPaywall = useCallback((reason: PaywallReason = 'general') => {
        setPaywallReason(reason);
        setPaywallVisible(true);
    }, []);

    const closePaywall = useCallback(() => {
        setPaywallVisible(false);
    }, []);

    // Helper: Remaining trial days
    const trialDaysRemaining = subState.trialActive && subState.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(subState.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return {
        isPro: subState.isPro,
        plan: subState.plan,
        trialActive: subState.trialActive,
        trialDaysRemaining,
        csvImportsUsed: subState.csvImportsUsed,
        maxFreeCsvImports: MAX_FREE_CSV_IMPORTS,
        aiScansUsedToday: subState.aiScansUsedToday,
        maxFreeAiScansPerDay: MAX_FREE_AI_SCANS_PER_DAY,
        availablePackages,
        canUseFeature,
        recordCsvImport,
        recordAiScan,
        startTrial,
        upgradeToPro,
        cancelPro,
        restorePurchases,
        paywallVisible,
        paywallReason,
        openPaywall,
        closePaywall,
        isLoading,
    };
}

export const [SubscriptionProvider, useSubscription] = createContextHook(useCreateSubscriptionContext);
