import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { ThemeColors } from '@/types/expense';

const THEME_STORAGE_KEY = 'theme_mode';
const CURRENCY_STORAGE_KEY = 'currency_symbol';

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
    const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

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
        queryKey: ['currencySymbol'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
                console.log('Loaded currency symbol from storage:', stored || '₹');
                return stored || '₹';
            } catch (error) {
                console.error('Error loading currency symbol:', error);
                return '₹';
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
        mutationFn: async (symbol: string) => {
            try {
                await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, symbol);
                console.log('Saved currency symbol to storage:', symbol);
                return symbol;
            } catch (error) {
                console.error('Failed to save currency symbol:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currencySymbol'] });
        },
        onError: (error) => {
            console.error('Currency symbol save mutation failed:', error);
        }
    });

    useEffect(() => {
        if (themeQuery.data !== undefined) {
            setIsDarkMode(themeQuery.data);
        }
    }, [themeQuery.data]);

    useEffect(() => {
        if (currencyQuery.data !== undefined) {
            setCurrencySymbol(currencyQuery.data);
        }
    }, [currencyQuery.data]);

    const { mutate: saveTheme } = saveThemeMutation;

    const toggleTheme = useCallback(() => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        saveTheme(newMode);
    }, [isDarkMode, saveTheme]);

    const updateCurrencySymbol = useCallback((symbol: string) => {
        setCurrencySymbol(symbol);
        saveCurrencyMutation.mutate(symbol);
    }, [saveCurrencyMutation]);

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
        updateCurrencySymbol,
        isLoading: themeQuery.isLoading || currencyQuery.isLoading,
    };
}

export const [ThemeProvider, useTheme] = createContextHook(useCreateThemeContext);