import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { ThemeColors } from '@/types/expense';
import { currencies } from '@/constants/currencies';

const THEME_STORAGE_KEY = 'theme_mode';
const CURRENCY_STORAGE_KEY = 'currency_symbol';

const symbolToCodeMap: Record<string, string> = {
    '₹': 'INR',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₩': 'KRW',
};

const lightTheme: ThemeColors = {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    primary: '#4F46E5',
    text: '#1a1a1a',
    textSecondary: '#6B7280',
    border: '#F3F4F6',
    card: '#FFFFFF',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    tabBarBackground: '#FFFFFF',
    headerBackground: '#FFFFFF',
    currencySymbol: '₹',
};

const darkTheme: ThemeColors = {
    background: '#111827',
    surface: '#1F2937',
    primary: '#6366F1',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#1F2937',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    tabBarBackground: '#1F2937',
    headerBackground: '#1F2937',
    currencySymbol: '₹',
};

function useCreateThemeContext() {
    const queryClient = useQueryClient();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [currencyCode, setCurrencyCode] = useState<string>('INR');

    const themeQuery = useQuery({
        queryKey: ['theme'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                const isDark = stored === 'dark';
                console.log('Loaded theme from storage:', isDark ? 'Dark' : 'Light');
                return isDark;
            } catch (error) {
                console.error('Error loading theme:', error);
                return false;
            }
        },
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    const currencyQuery = useQuery({
        queryKey: ['currencyCode'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
                const code = symbolToCodeMap[stored || ''] || stored || 'INR';
                console.log('Loaded currency code from storage:', code);
                return code;
            } catch (error) {
                console.error('Error loading currency code:', error);
                return 'INR';
            }
        },
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    const saveThemeMutation = useMutation({
        mutationFn: async (darkMode: boolean) => {
            try {
                await AsyncStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
                console.log('Saved theme to storage:', darkMode ? 'Dark' : 'Light');
                return darkMode;
            } catch (error) {
                console.error('Failed to save theme:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['theme'] });
        },
        onError: (error) => {
            console.error('Theme save mutation failed:', error);
        }
    });

    const saveCurrencyMutation = useMutation({
        mutationFn: async (code: string) => {
            try {
                await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code);
                console.log('Saved currency code to storage:', code);
                return code;
            } catch (error) {
                console.error('Failed to save currency code:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currencyCode'] });
        },
        onError: (error) => {
            console.error('Currency code save mutation failed:', error);
        }
    });

    useEffect(() => {
        if (themeQuery.data !== undefined) {
            setIsDarkMode(themeQuery.data);
        }
    }, [themeQuery.data]);

    useEffect(() => {
        if (currencyQuery.data !== undefined) {
            setCurrencyCode(currencyQuery.data);
        }
    }, [currencyQuery.data]);

    const { mutate: saveTheme } = saveThemeMutation;

    const toggleTheme = useCallback(() => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        saveTheme(newMode);
    }, [isDarkMode, saveTheme]);

    const updateCurrencyCode = useCallback((code: string) => {
        setCurrencyCode(code);
        saveCurrencyMutation.mutate(code);
    }, [saveCurrencyMutation]);

    const updateCurrencySymbol = useCallback((symbol: string) => {
        const matched = currencies.find(c => c.currencySymbol === symbol);
        const code = matched ? matched.currencyCode : (symbolToCodeMap[symbol] || 'INR');
        updateCurrencyCode(code);
    }, [updateCurrencyCode]);

    const activeCurrency = currencies.find(c => c.currencyCode === currencyCode) || currencies[0];
    const currencySymbol = activeCurrency.currencySymbol;

    const baseColors = isDarkMode ? darkTheme : lightTheme;
    const colors = {
        ...baseColors,
        currencySymbol,
    };

    return {
        isDarkMode,
        colors,
        toggleTheme,
        currencySymbol,
        currencyCode,
        updateCurrencySymbol,
        updateCurrencyCode,
        isLoading: themeQuery.isLoading || currencyQuery.isLoading,
    };
}

export const [ThemeProvider, useTheme] = createContextHook(useCreateThemeContext);