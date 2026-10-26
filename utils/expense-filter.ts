import { Expense } from '@/types/expense';
import { safeParseDate } from '@/utils/search-filter';

export type FilterType = 'This Month' | 'Total Expenses';

export interface FilteredExpenseResult {
    id?: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    time: string;
    month: string;
    year: string;
    isRemittance?: boolean;
    remittanceCode?: string;
    historicalPrimarySymbol?: string;
    historicalHomeSymbol?: string;
    historicalConvertedAmount?: number;
    items?: Array<{ name: string; qty: number; total: number; category?: string }>;
    groupId?: string;
    source?: Expense['source'];
}

export function formatExpenseForDisplay(expense: Expense): FilteredExpenseResult {
    const parsedDate = safeParseDate(expense.date);
    const expenseDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : new Date();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Format date as DD/MM/YYYY
    const formattedDate = `${expenseDate.getDate().toString().padStart(2, '0')}/${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}/${expenseDate.getFullYear()}`;

    // Format time - use provided time or extract from createdAt
    let formattedTime = expense.time || '';
    if (!formattedTime && expense.createdAt) {
        const createdDate = safeParseDate(expense.createdAt) || new Date();
        const hours = createdDate.getHours();
        const minutes = createdDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    return {
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: formattedDate,
        time: formattedTime,
        month: monthNames[expenseDate.getMonth()] || 'January',
        year: expenseDate.getFullYear().toString(),
        isRemittance: expense.isRemittance,
        remittanceCode: expense.remittanceCode,
        historicalPrimarySymbol: expense.historicalPrimarySymbol,
        historicalHomeSymbol: expense.historicalHomeSymbol,
        historicalConvertedAmount: expense.historicalConvertedAmount,
        items: expense.items,
        groupId: expense.groupId,
        source: expense.source,
    };
}

export function filterExpensesByType(expenses: Expense[], filterType: FilterType): FilteredExpenseResult[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filteredExpenses: Expense[] = [];

    if (filterType === 'This Month') {
        filteredExpenses = expenses.filter(expense => {
            if (expense.isDeleted) return false;
            const expenseDate = safeParseDate(expense.date);
            if (!expenseDate || isNaN(expenseDate.getTime())) return false;
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
    } else if (filterType === 'Total Expenses') {
        filteredExpenses = expenses.filter(expense => !expense.isDeleted);
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => {
        const dateA = safeParseDate(a.date)?.getTime() || 0;
        const dateB = safeParseDate(b.date)?.getTime() || 0;
        return dateB - dateA;
    });

    return filteredExpenses.map(formatExpenseForDisplay);
}

export function processExpenseHistoryRequest(expenses: Expense[], userSelection: FilterType): string {
    const filteredResults = filterExpensesByType(expenses, userSelection);
    return JSON.stringify(filteredResults, null, 2);
}