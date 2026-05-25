import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { ThemeColors } from '@/types/expense';
import { currencies } from '@/constants/currencies';

const THEME_STORAGE_KEY = 'theme_mode';
const CURRENCY_STORAGE_KEY = 'currency_symbol';
const HOME_CURRENCY_STORAGE_KEY = 'home_currency_code';

const CURRENCY_COUNTRY_STORAGE_KEY = 'currency_country_name';
const HOME_CURRENCY_COUNTRY_STORAGE_KEY = 'home_currency_country_name';

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

const getCountryFromStoredCodeOrSymbol = (stored: string | null): string => {
    if (!stored) return 'India';
    const cleaned = stored.trim();
    
    // Match by countryName directly (if already stored as country name)
    const matchedByName = currencies.find(c => c.countryName.toLowerCase() === cleaned.toLowerCase());
    if (matchedByName) return matchedByName.countryName;
    
    // Match by currencyCode
    const matchedByCode = currencies.find(c => c.currencyCode.toLowerCase() === cleaned.toLowerCase());
    if (matchedByCode) return matchedByCode.countryName;
    
    // Match by symbol
    const matchedBySymbol = currencies.find(c => c.currencySymbol === cleaned);
    if (matchedBySymbol) return matchedBySymbol.countryName;
    
    // Try mapping table lookup
    const code = symbolToCodeMap[cleaned];
    if (code) {
        const matched = currencies.find(c => c.currencyCode === code);
        if (matched) return matched.countryName;
    }
    
    return 'India';
};

function useCreateThemeContext() {
    const queryClient = useQueryClient();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [currencyCountryName, setCurrencyCountryName] = useState<string>('India');
    const [homeCurrencyCountryName, setHomeCurrencyCountryName] = useState<string>('India');

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
        queryKey: ['currencyCountryName'],
        queryFn: async () => {
            try {
                const storedCountry = await AsyncStorage.getItem(CURRENCY_COUNTRY_STORAGE_KEY);
                if (storedCountry) return storedCountry;
                
                const storedLegacy = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
                return getCountryFromStoredCodeOrSymbol(storedLegacy);
            } catch (error) {
                console.error('Error loading currency country:', error);
                return 'India';
            }
        },
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    const homeCurrencyQuery = useQuery({
        queryKey: ['homeCurrencyCountryName'],
        queryFn: async () => {
            try {
                const storedCountry = await AsyncStorage.getItem(HOME_CURRENCY_COUNTRY_STORAGE_KEY);
                if (storedCountry) return storedCountry;
                
                const storedLegacy = await AsyncStorage.getItem(HOME_CURRENCY_STORAGE_KEY);
                return getCountryFromStoredCodeOrSymbol(storedLegacy);
            } catch (error) {
                console.error('Error loading home currency country:', error);
                return 'India';
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
        mutationFn: async (countryName: string) => {
            try {
                await AsyncStorage.setItem(CURRENCY_COUNTRY_STORAGE_KEY, countryName);
                console.log('Saved currency country to storage:', countryName);
                return countryName;
            } catch (error) {
                console.error('Failed to save currency country:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currencyCountryName'] });
        },
        onError: (error) => {
            console.error('Currency country save mutation failed:', error);
        }
    });

    const saveHomeCurrencyMutation = useMutation({
        mutationFn: async (countryName: string) => {
            try {
                await AsyncStorage.setItem(HOME_CURRENCY_COUNTRY_STORAGE_KEY, countryName);
                console.log('Saved home currency country to storage:', countryName);
                return countryName;
            } catch (error) {
                console.error('Failed to save home currency country:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homeCurrencyCountryName'] });
        },
        onError: (error) => {
            console.error('Home currency country save mutation failed:', error);
        }
    });

    useEffect(() => {
        if (themeQuery.data !== undefined) {
            setIsDarkMode(themeQuery.data);
        }
    }, [themeQuery.data]);

    useEffect(() => {
        if (currencyQuery.data !== undefined) {
            setCurrencyCountryName(currencyQuery.data);
        }
    }, [currencyQuery.data]);

    useEffect(() => {
        if (homeCurrencyQuery.data !== undefined) {
            setHomeCurrencyCountryName(homeCurrencyQuery.data);
        }
    }, [homeCurrencyQuery.data]);

    const { mutate: saveTheme } = saveThemeMutation;

    const toggleTheme = useCallback(() => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        saveTheme(newMode);
    }, [isDarkMode, saveTheme]);

    const updateCurrencyCountryName = useCallback((countryName: string) => {
        setCurrencyCountryName(countryName);
        saveCurrencyMutation.mutate(countryName);
    }, [saveCurrencyMutation]);

    const updateHomeCurrencyCountryName = useCallback((countryName: string) => {
        setHomeCurrencyCountryName(countryName);
        saveHomeCurrencyMutation.mutate(countryName);
    }, [saveHomeCurrencyMutation]);

    const updateCurrencyCode = useCallback((code: string) => {
        const country = currencies.find(c => c.currencyCode === code);
        if (country) {
            updateCurrencyCountryName(country.countryName);
        }
    }, [updateCurrencyCountryName]);

    const updateCurrencySymbol = useCallback((symbol: string) => {
        const country = currencies.find(c => c.currencySymbol === symbol);
        if (country) {
            updateCurrencyCountryName(country.countryName);
        }
    }, [updateCurrencyCountryName]);

    const updateHomeCurrencyCode = useCallback((code: string) => {
        const country = currencies.find(c => c.currencyCode === code);
        if (country) {
            updateHomeCurrencyCountryName(country.countryName);
        }
    }, [updateHomeCurrencyCountryName]);

    const activeCurrency = currencies.find(c => c.countryName === currencyCountryName) || currencies[0];
    const currencyCode = activeCurrency.currencyCode;
    const currencySymbol = activeCurrency.currencySymbol;

    const activeHomeCurrency = currencies.find(c => c.countryName === homeCurrencyCountryName) || currencies[0];
    const homeCurrencyCode = activeHomeCurrency.currencyCode;

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
        currencyCountryName,
        updateCurrencyCountryName,
        updateCurrencySymbol,
        updateCurrencyCode,
        homeCurrencyCode,
        homeCurrencyCountryName,
        updateHomeCurrencyCode,
        updateHomeCurrencyCountryName,
        isLoading: themeQuery.isLoading || currencyQuery.isLoading || homeCurrencyQuery.isLoading,
    };
}

export const [ThemeProvider, useTheme] = createContextHook(useCreateThemeContext);