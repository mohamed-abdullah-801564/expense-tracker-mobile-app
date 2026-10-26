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

    const splitMatch = lowerInput.match(/split\s+(\d+)/);
    const explicitSplitCount = splitMatch ? parseInt(splitMatch[1], 10) : null;

    // Extract all numbers from input (including commas e.g. 1,500)
    const numberMatches = Array.from(input.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)).map(m => ({
        value: parseFloat(m[1].replace(/,/g, '')),
        index: m.index ?? 0,
        text: m[1]
    }));

    if (numberMatches.length === 0) {
        return null;
    }

    // Determine the actual expense amount vs split count
    let amount = 0;
    if (splitMatch && explicitSplitCount !== null) {
        const splitIdx = splitMatch.index ?? 0;
        // The split count number is adjacent to "split"
        const remainingNumbers = numberMatches.filter(n => {
            const isSplitCountToken = n.index >= splitIdx && n.index <= splitIdx + splitMatch[0].length && n.value === explicitSplitCount;
            return !isSplitCountToken;
        });

        if (remainingNumbers.length > 0) {
            // Pick the first non-split-count number as the expense amount
            amount = remainingNumbers[0].value;
        } else {
            amount = numberMatches[0].value;
        }
    } else {
        amount = numberMatches[0].value;
    }

    // Extract friend names
    const friendNames = extractFriendNames(input);

    // Calculate split count:
    // If user explicitly said "split 4", use 4.
    // If not, but named 2 friends (Sam, Ram), then count = 2 friends + 1 (user) = 3.
    // Default fallback is 2.
    let splitCount = explicitSplitCount || (friendNames.length > 0 ? friendNames.length + 1 : 2);
    if (splitCount < 2) splitCount = 2;

    const amountPerPerson = Math.round((amount / splitCount) * 100) / 100;

    const descriptionMatch = input.match(/^([^\d]+?)(?:\s+\d|$)/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : 'Split Expense';
    description = description.replace(/^split\s*(\d+)?/i, '').trim() || 'Split Expense';

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
        friendNames: friendNames.length > 0 ? friendNames.slice(0, splitCount - 1) : undefined,
    };
}

function extractFriendNames(input: string): string[] {
    const names: string[] = [];
    const lowerInput = input.toLowerCase();

    // Strategy 1: Look for names after "with", "between", "among"
    const nameMarkers = ['with', 'between', 'among', 'and me and', 'and myself and'];
    
    let namesPart = '';
    for (const marker of nameMarkers) {
        const index = lowerInput.lastIndexOf(marker);
        if (index !== -1) {
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
        // Clean up: remove amount or split count if they ended up here
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
    return Array.from(new Set(names));
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

const NON_FRIEND_NOUNS = new Set([
    'auto', 'cab', 'taxi', 'bus', 'metro', 'train', 'flight', 'driver', 'maid',
    'tip', 'waiter', 'charity', 'donation', 'temple', 'church', 'mosque',
    'rent', 'fee', 'fees', 'tuition', 'bill', 'recharge', 'food', 'coffee', 'tea',
    'snack', 'snacks', 'lunch', 'dinner', 'breakfast', 'medicine', 'petrol', 'fuel',
    'diesel', 'toll', 'advance', 'deposit', 'groceries', 'vegetables', 'fruits'
]);

export function parseDebt(input: string): DebtData | null {
    const lowerInput = input.toLowerCase().trim();

    // Check for explicit borrow/lend patterns
    // 1. Borrowing:
    // - "borrowed 500 from Rahul"
    // - "borrow 500 from Rahul"
    // - "took loan 5000" / "took 500 from Rahul" / "got 500 from Rahul"
    // NOTE: "took auto 80" or "took cab 120" is an expense, NOT borrowing.
    let type: 'lend' | 'borrow' | null = null;
    let nameMatch: RegExpMatchArray | null = null;

    if (/\b(borrow|borrowed)\b/.test(lowerInput)) {
        type = 'borrow';
        nameMatch = input.match(/\bfrom\s+([a-zA-Z]+)/i);
    } else if (/\b(took|got)\b.*\bfrom\s+([a-zA-Z]+)/i.test(input)) {
        type = 'borrow';
        nameMatch = input.match(/\bfrom\s+([a-zA-Z]+)/i);
    } else if (/\b(took|got)\s+loan\b/i.test(input)) {
        type = 'borrow';
        nameMatch = input.match(/\bfrom\s+([a-zA-Z]+)/i);
    } else if (/\b(lend|lent)\b/.test(lowerInput)) {
        type = 'lend';
        nameMatch = input.match(/\bto\s+([a-zA-Z]+)/i);
    } else if (/\b(gave|given)\b.*\bto\s+([a-zA-Z]+)/i.test(input)) {
        type = 'lend';
        nameMatch = input.match(/\bto\s+([a-zA-Z]+)/i);
    } else if (/\b(gave|given)\s+loan\b/i.test(input)) {
        type = 'lend';
        nameMatch = input.match(/\bto\s+([a-zA-Z]+)/i);
    }

    if (!type) return null;

    // Extract amount
    const amountMatch = input.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (amount <= 0) return null;

    // Extract friend name
    let friendName = '';
    if (nameMatch && nameMatch[1]) {
        friendName = nameMatch[1].trim();
    } else if (/\b(borrow|borrowed|lend|lent)\b/.test(lowerInput)) {
        // Fallback for explicit borrow/lend syntax like "Lent 500 Rahul" or "Borrowed 500 Rahul"
        const words = input.split(/\s+/).filter(w =>
            !w.match(/^\d+/) &&
            !['borrow', 'borrowed', 'took', 'got', 'from', 'lend', 'lent', 'gave', 'given', 'to', 'rupees', 'rs', 'loan'].includes(w.toLowerCase())
        );
        if (words.length > 0) friendName = words[0];
    }

    if (!friendName) {
        return null; // Cannot record debt without a target name or explicit contact
    }

    // Check if the extracted name is a common noun (e.g., auto, tip, waiter)
    if (NON_FRIEND_NOUNS.has(friendName.toLowerCase())) {
        return null; // Normal expense, not a peer debt!
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
