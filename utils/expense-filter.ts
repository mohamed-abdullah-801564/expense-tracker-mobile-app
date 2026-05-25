import { Expense } from '@/types/expense';

export type FilterType = 'This Month' | 'Total Expenses';

export interface FilteredExpenseResult {
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
}

export function formatExpenseForDisplay(expense: Expense): FilteredExpenseResult {
    const expenseDate = new Date(expense.date);
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Format date as DD/MM/YYYY
    const formattedDate = `${expenseDate.getDate().toString().padStart(2, '0')}/${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}/${expenseDate.getFullYear()}`;

    // Format time - use provided time or extract from createdAt
    let formattedTime = expense.time || '';
    if (!formattedTime && expense.createdAt) {
        const createdDate = new Date(expense.createdAt);
        const hours = createdDate.getHours();
        const minutes = createdDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    return {
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: formattedDate,
        time: formattedTime,
        month: monthNames[expenseDate.getMonth()],
        year: expenseDate.getFullYear().toString(),
        isRemittance: expense.isRemittance,
        remittanceCode: expense.remittanceCode,
        historicalPrimarySymbol: expense.historicalPrimarySymbol,
        historicalHomeSymbol: expense.historicalHomeSymbol,
        historicalConvertedAmount: expense.historicalConvertedAmount,
    };
}

export function filterExpensesByType(expenses: Expense[], filterType: FilterType): FilteredExpenseResult[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filteredExpenses: Expense[] = [];

    if (filterType === 'This Month') {
        filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
    } else if (filterType === 'Total Expenses') {
        filteredExpenses = expenses;
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filteredExpenses.map(formatExpenseForDisplay);
}

export function processExpenseHistoryRequest(expenses: Expense[], userSelection: FilterType): string {
    const filteredResults = filterExpensesByType(expenses, userSelection);
    return JSON.stringify(filteredResults, null, 2);
}