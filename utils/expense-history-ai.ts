import { Expense } from '@/types/expense';
import { FilterType, filterExpensesByType } from './expense-filter';

export interface ExpenseHistoryRequest {
    expenses: Expense[];
    userSelection: FilterType;
}

export interface ExpenseHistoryResponse {
    filteredExpenses: {
        amount: number;
        description: string;
        category: string;
        date: string;
        time: string;
        month: string;
        year: string;
    }[];
    totalCount: number;
    filterApplied: FilterType;
    summary: string;
}

export function processExpenseHistoryAI(request: ExpenseHistoryRequest): ExpenseHistoryResponse {
    const { expenses, userSelection } = request;

    const filteredResults = filterExpensesByType(expenses, userSelection);

    let summary = '';
    if (userSelection === 'This Month') {
        const currentDate = new Date();
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        summary = `Showing ${filteredResults.length} expenses from ${monthName} ${year}`;
    } else {
        summary = `Showing all ${filteredResults.length} expenses from your complete history`;
    }

    return {
        filteredExpenses: filteredResults,
        totalCount: filteredResults.length,
        filterApplied: userSelection,
        summary
    };
}

// Function to handle AI assistant requests
export function handleExpenseHistoryQuery(
    expenses: Expense[],
    userSelection: string
): string {
    // Normalize user selection
    let filterType: FilterType;
    const normalizedSelection = userSelection.toLowerCase().trim();

    if (normalizedSelection.includes('this month') || normalizedSelection.includes('current month')) {
        filterType = 'This Month';
    } else if (normalizedSelection.includes('total') || normalizedSelection.includes('all')) {
        filterType = 'Total Expenses';
    } else {
        // Default to 'This Month' if unclear
        filterType = 'This Month';
    }

    const response = processExpenseHistoryAI({
        expenses,
        userSelection: filterType
    });

    return JSON.stringify(response, null, 2);
}