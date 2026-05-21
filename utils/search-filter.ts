import { Expense, ExpenseCategory } from '@/types/expense';
import { FilteredExpenseResult } from '@/utils/expense-filter';

export interface SearchFilters {
    searchText: string;
    category: ExpenseCategory | 'All';
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
}

function parseUserDateString(dateStr: string): string | null {
    const trimmed = dateStr.trim();

    // DD/MM/YYYY format
    const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match1 = trimmed.match(ddmmyyyy);
    if (match1) {
        const [, day, month, year] = match1;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM/DD/YYYY format
    const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match2 = trimmed.match(mmddyyyy);
    if (match2) {
        const [, month, day, year] = match2;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // YYYY-MM-DD format (ISO)
    const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    if (yyyymmdd.test(trimmed)) {
        return trimmed;
    }

    return null;
}

function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

export function searchAndFilterExpenses(
    expenses: FilteredExpenseResult[],
    filters: SearchFilters
): FilteredExpenseResult[] {
    return expenses.filter(expense => {
        // Search text filter (description, amount, or date)
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const matchesDescription = expense.description.toLowerCase().includes(searchLower);
            const matchesAmount = expense.amount.toString().includes(searchLower);

            // Improved date matching: convert both to Date objects for comparison
            let matchesDate = expense.date.includes(filters.searchText);
            if (!matchesDate) {
                try {
                    const parsedExpenseDateStr = parseUserDateString(expense.date) || expense.date;
                    const expenseDate = new Date(parsedExpenseDateStr);
                    const searchDateFormats = [
                        filters.searchText,
                        parseUserDateString(filters.searchText)
                    ];

                    for (const dateStr of searchDateFormats) {
                        if (dateStr) {
                            const searchDate = new Date(parseUserDateString(dateStr) || dateStr);
                            if (!isNaN(searchDate.getTime()) && !isNaN(expenseDate.getTime())) {
                                if (isSameDay(expenseDate, searchDate)) {
                                    matchesDate = true;
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Date parsing error:', error);
                }
            }

            if (!matchesDescription && !matchesAmount && !matchesDate) {
                return false;
            }
        }

        // Category filter
        if (filters.category !== 'All' && expense.category !== filters.category) {
            return false;
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
            const parsedExpenseDateStr = parseUserDateString(expense.date) || expense.date;
            const expenseDate = new Date(parsedExpenseDateStr);

            if (filters.dateFrom) {
                const parsedFromDateStr = parseUserDateString(filters.dateFrom) || filters.dateFrom;
                const fromDate = new Date(parsedFromDateStr);
                if (!isNaN(expenseDate.getTime()) && !isNaN(fromDate.getTime())) {
                    if (expenseDate < fromDate) return false;
                }
            }

            if (filters.dateTo) {
                const parsedToDateStr = parseUserDateString(filters.dateTo) || filters.dateTo;
                const toDate = new Date(parsedToDateStr);
                if (!isNaN(expenseDate.getTime()) && !isNaN(toDate.getTime())) {
                    if (expenseDate > toDate) return false;
                }
            }
        }

        // Amount range filter
        if (filters.amountMin !== undefined && expense.amount < filters.amountMin) {
            return false;
        }

        if (filters.amountMax !== undefined && expense.amount > filters.amountMax) {
            return false;
        }

        return true;
    });
}



export function parseSearchQuery(query: string): Partial<SearchFilters> {
    const filters: Partial<SearchFilters> = {};

    // Check if query is a date (DD/MM/YYYY format)
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (dateRegex.test(query)) {
        filters.searchText = query;
        return filters;
    }

    // Check if query is a number (amount)
    const numberRegex = /^\d+(\.\d{1,2})?$/;
    if (numberRegex.test(query)) {
        const amount = parseFloat(query);
        filters.amountMin = amount;
        filters.amountMax = amount;
        return filters;
    }

    // Default to text search
    filters.searchText = query;
    return filters;
}
