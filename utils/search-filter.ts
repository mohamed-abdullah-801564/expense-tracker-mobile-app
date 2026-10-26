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

export function parseUserDateString(dateStr: string): string | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();

    // DD/MM/YYYY or MM/DD/YYYY format
    const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = trimmed.match(slashDate);
    if (match) {
        let [, p1, p2, year] = match;
        let day = parseInt(p1, 10);
        let month = parseInt(p2, 10);
        if (month > 12 && day <= 12) {
            const temp = day;
            day = month;
            month = temp;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // YYYY-MM-DD format (ISO)
    const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    if (yyyymmdd.test(trimmed)) {
        return trimmed;
    }

    return null;
}

export function safeParseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    const normalizedStr = parseUserDateString(dateStr) || dateStr;
    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
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
        // Search text filter (description, amount, date, or item names)
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const matchesDescription = expense.description.toLowerCase().includes(searchLower);
            const matchesAmount = expense.amount.toString().includes(searchLower);
            const matchesItems = expense.items?.some(i => i.name.toLowerCase().includes(searchLower));

            // Improved date matching: convert both to Date objects for comparison
            let matchesDate = expense.date.includes(filters.searchText);
            if (!matchesDate) {
                try {
                    const expenseDate = safeParseDate(expense.date);
                    if (expenseDate && !isNaN(expenseDate.getTime())) {
                        const searchDateFormats = [
                            filters.searchText,
                            parseUserDateString(filters.searchText)
                        ];

                        for (const dateStr of searchDateFormats) {
                            if (dateStr) {
                                const searchDate = safeParseDate(dateStr);
                                if (searchDate && !isNaN(searchDate.getTime())) {
                                    if (isSameDay(expenseDate, searchDate)) {
                                        matchesDate = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Date parsing error:', error);
                }
            }

            if (!matchesDescription && !matchesAmount && !matchesDate && !matchesItems) {
                return false;
            }
        }

        // Category filter
        if (filters.category !== 'All' && expense.category !== filters.category) {
            return false;
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
            const expenseDate = safeParseDate(expense.date);
            if (!expenseDate || isNaN(expenseDate.getTime())) {
                return false;
            }

            if (filters.dateFrom) {
                const fromDate = safeParseDate(filters.dateFrom);
                if (fromDate && !isNaN(fromDate.getTime())) {
                    fromDate.setHours(0, 0, 0, 0);
                    if (expenseDate < fromDate) return false;
                }
            }

            if (filters.dateTo) {
                const toDate = safeParseDate(filters.dateTo);
                if (toDate && !isNaN(toDate.getTime())) {
                    toDate.setHours(23, 59, 59, 999);
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
