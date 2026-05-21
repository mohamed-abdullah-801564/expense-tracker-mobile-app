import { ExpenseCategory } from '@/types/expense';

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
    Food: '#FF6B6B',
    Transport: '#4ECDC4',
    Utilities: '#7B68EE',
    Entertainment: '#FF69B4',
    Shopping: '#20B2AA',
    Health: '#32CD32',
    Snacks: '#F59E0B',
    Drinks: '#3B82F6',
    Other: '#9CA3AF',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
    Food: 'Utensils',
    Transport: 'Car',
    Utilities: 'Home',
    Entertainment: 'Music',
    Shopping: 'ShoppingBag',
    Health: 'Heart',
    Snacks: 'Coffee',
    Drinks: 'CupSoda',
    Other: 'MoreHorizontal',
};

export const CATEGORIES: ExpenseCategory[] = [
    'Food',
    'Transport',
    'Utilities',
    'Entertainment',
    'Shopping',
    'Health',
    'Snacks',
    'Drinks',
    'Other',
];