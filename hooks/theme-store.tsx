import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { ThemeColors } from '@/types/expense';

const THEME_STORAGE_KEY = 'theme_mode';

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
};

function useCreateThemeContext() {
    const queryClient = useQueryClient();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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

    useEffect(() => {
        if (themeQuery.data !== undefined) {
            setIsDarkMode(themeQuery.data);
        }
    }, [themeQuery.data]);

    const { mutate: saveTheme } = saveThemeMutation;

    const toggleTheme = useCallback(() => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        saveTheme(newMode);
    }, [isDarkMode, saveTheme]);

    const colors = isDarkMode ? darkTheme : lightTheme;

    return {
        isDarkMode,
        colors,
        toggleTheme,
        isLoading: themeQuery.isLoading,
    };
}

export const [ThemeProvider, useTheme] = createContextHook(useCreateThemeContext);