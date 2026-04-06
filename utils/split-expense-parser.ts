import { ExpenseCategory, SplitExpense } from '@/types/expense';

export interface SplitExpenseData {
    amount: number;
    description: string;
    category: ExpenseCategory;
    splitCount: number;
    amountPerPerson: number;
}

export interface ParsedSplitWithNames extends SplitExpenseData {
    friendNames?: string[];
}

export function parseSplitExpense(input: string): ParsedSplitWithNames | null {
    const lowerInput = input.toLowerCase();

    if (!lowerInput.includes('split')) {
        return null;
    }

    const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) {
        return null;
    }

    const amount = parseFloat(amountMatch[1]);

    const splitMatch = lowerInput.match(/split\s+(\d+)/);
    const splitCount = splitMatch ? parseInt(splitMatch[1], 10) : 2;

    const amountPerPerson = Math.round((amount / splitCount) * 100) / 100;

    const descriptionMatch = input.match(/^([^\d]+?)(?:\s+\d|$)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'Split Expense';

    const friendNames = extractFriendNames(input, splitCount);

    let category: ExpenseCategory = 'Other';
    if (lowerInput.includes('food') || lowerInput.includes('lunch') || lowerInput.includes('dinner') || lowerInput.includes('breakfast')) {
        category = 'Food';
    } else if (lowerInput.includes('transport') || lowerInput.includes('taxi') || lowerInput.includes('uber')) {
        category = 'Transport';
    } else if (lowerInput.includes('movie') || lowerInput.includes('entertainment')) {
        category = 'Entertainment';
    } else if (lowerInput.includes('shopping')) {
        category = 'Shopping';
    }

    return {
        amount,
        description,
        category,
        splitCount,
        amountPerPerson,
        friendNames: friendNames.length > 0 ? friendNames : undefined,
    };
}

function extractFriendNames(input: string, splitCount: number): string[] {
    const names: string[] = [];
    const lowerInput = input.toLowerCase();

    // Strategy 1: Look for names after "with", "between", "among"
    // Match "split [number] with/between/among [Names]" or "[Names] split [number]"
    // We target the part of the string that mentions names
    const nameMarkers = ['with', 'between', 'among', 'and me and', 'and myself and'];
    
    let namesPart = '';
    
    // Check if any marker exists
    for (const marker of nameMarkers) {
        const index = lowerInput.lastIndexOf(marker);
        if (index !== -1) {
            // Take everything after the marker
            namesPart = input.slice(index + marker.length).trim();
            break;
        }
    }

    // Special case for "between me and Alex"
    if (!namesPart && lowerInput.includes('between me and')) {
        const index = lowerInput.indexOf('between me and');
        namesPart = input.slice(index + 'between me and'.length).trim();
    }

    if (namesPart) {
        // Clean up: remove amount or split count if they somehow ended up here
        const cleanedPart = namesPart.split(/\s+split\s+|\s+\d+/i)[0].trim();
        
        const individualNames = cleanedPart.split(/[,;&]|\s+and\s+/gi)
            .map(n => n.trim())
            .filter(n => n.length > 0 && 
                         !n.match(/^\d+$/) && 
                         !['me', 'myself', 'i'].includes(n.toLowerCase()));
        
        names.push(...individualNames);
    }

    // Strategy 2: Fallback to old patterns if Strategy 1 found nothing
    if (names.length === 0) {
        const withPattern = /split\s+(?:with|between|among)?\s*([^\d][^,;]+?)(?:,|;|\s+and\s+|$)/gi;
        let match;
        while ((match = withPattern.exec(input)) !== null) {
            const nameGroup = match[1].trim();
            if (nameGroup && !nameGroup.match(/^\d+\s*(person|people)?$/i)) {
                const individualNames = nameGroup.split(/\s+and\s+|,\s*/gi)
                    .map(n => n.trim())
                    .filter(n => n.length > 0 && !n.match(/^\d+$/) && !['me', 'i'].includes(n.toLowerCase()));
                names.push(...individualNames);
            }
        }
    }

    // Deduplicate and filter
    const uniqueNames = Array.from(new Set(names));
    
    return uniqueNames.slice(0, splitCount - 1);
}

export function createSplitExpenses(
    splitData: SplitExpenseData,
    expenseId: string,
    date: string,
    friendNames?: string[]
): SplitExpense[] {
    const splits: SplitExpense[] = [];

    for (let i = 0; i < splitData.splitCount - 1; i++) {
        const friendName = friendNames?.[i] || `Friend ${i + 1}`;

        splits.push({
            id: `${expenseId}_split_${i}`,
            expenseId,
            friendName,
            amount: Math.round(splitData.amountPerPerson * 100) / 100,
            description: splitData.description,
            category: splitData.category,
            date,
            isPaid: false,
            createdAt: new Date().toISOString(),
        });
    }

    return splits;
}

export interface DebtData {
    amount: number;
    friendName: string;
    type: 'lend' | 'borrow';
    description: string;
}

export function parseDebt(input: string): DebtData | null {
    const lowerInput = input.toLowerCase();

    let type: 'lend' | 'borrow' | null = null;
    if (lowerInput.match(/\b(borrow|borrowed|took|got from)\b/)) {
        type = 'borrow';
    } else if (lowerInput.match(/\b(lend|lent|gave|given to)\b/)) {
        type = 'lend';
    }

    if (!type) return null;

    // Extract amount
    const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1]);

    // Extract friend name
    let friendName = 'Friend';

    // Look for "to <Name>" or "from <Name>"
    const preposition = type === 'lend' ? 'to' : 'from';
    // Match preposition followed by words that are NOT amount
    const nameMatch = input.match(new RegExp(`${preposition}\\s+([a-zA-Z]+)`, 'i'));

    if (nameMatch) {
        friendName = nameMatch[1];
    } else {
        // Fallback: Try to find a word that is not the amount and not a keyword
        const words = input.split(/\s+/).filter(w =>
            !w.match(/^\d+/) &&
            !['borrow', 'borrowed', 'took', 'got', 'from', 'lend', 'lent', 'gave', 'given', 'to', 'rupees', 'rs'].includes(w.toLowerCase())
        );
        if (words.length > 0) friendName = words[0];
    }

    // Capitalize first letter
    friendName = friendName.charAt(0).toUpperCase() + friendName.slice(1).toLowerCase();

    return {
        amount,
        friendName,
        type,
        description: type === 'lend' ? `Lent to ${friendName}` : `Borrowed from ${friendName}`
    };
}
