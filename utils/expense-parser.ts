import { ParsedExpense } from '@/types/expense';
import { CATEGORIES } from '@/constants/categories';

export const MAX_AMOUNT = 1000000;
export const MIN_AMOUNT = 0.01;

export const getFallbackRate = (from: string, to: string): number => {
    if (from === to) return 1.0;
    
    const pair = `${from}_${to}`;
    const fallbacks: Record<string, number> = {
        'USD_INR': 83.5,
        'INR_USD': 0.012,
        'EUR_INR': 90.0,
        'INR_EUR': 0.011,
        'GBP_INR': 105.0,
        'INR_GBP': 0.0095,
        'AED_INR': 22.7,
        'INR_AED': 0.044,
        'SAR_INR': 22.2,
        'INR_SAR': 0.045,
        'SGD_INR': 61.5,
        'INR_SGD': 0.016,
        'CAD_INR': 61.0,
        'INR_CAD': 0.016,
        'AUD_INR': 55.0,
        'INR_AUD': 0.018,
    };
    
    return fallbacks[pair] || 1.0;
};

export function validateAmount(amount: number, currencySymbol: string = '₹'): { valid: boolean; error?: string } {
    if (amount <= 0) {
        return { valid: false, error: 'Amount must be greater than zero' };
    }
    if (amount > MAX_AMOUNT) {
        return { valid: false, error: `Amount cannot exceed ${currencySymbol}${MAX_AMOUNT.toLocaleString('en-IN')}` };
    }
    return { valid: true };
}

export async function parseExpenseWithAI(input: string, currencySymbol: string = '₹', homeCurrencyCode: string = 'INR'): Promise<ParsedExpense> {
    const systemPrompt = `You are an AI assistant that helps users track and categorize their daily expenses, including multi-item lists, shared expenses, and payments to friends. When given a natural language input, your task is to:
        
1. Parse the input which may contain a single expense or a multi-item list of expenses (e.g., "milk 30 sugar 40").
2. Calculate the aggregate sum of all item amounts/prices combined. Set this as the "amount".
3. Extract and combine all item names into a single comma-separated description string. Set this as the "description".
4. Determine the dominant category from the items list. Choose from: Food, Transport, Utilities, Entertainment, Shopping, Health, Snacks, Drinks, Remittance, or Other.
   - For hot beverages (e.g., tea, coffee, chai, boost) and small food items, classify as 'Snacks'.
   - For cold beverages (e.g., water, juice, soda, milkshakes, cool drinks), classify as 'Drinks'.
   - If the description/items refer to sending money, transferring money, or remitting money home, to family, to mom, to dad, or to parents (containing words like sent, send, transfer, remit, remittance, family, mom, dad, parent), you MUST categorize it as 'Remittance' and set 'isRemittance' to true.
5. If the expense input contains time or part of the day (like '5 PM', 'morning'), extract it as 'time'. If not present, omit the time field.
6. Extract details about shared expenses or payments:
   - If the user mentions splitting the expense, extract the shared amount and indicate it's split.
   - If the user mentions paying a friend, extract the amount paid and the person or label if specified.
7. If the user describes an expense about sending money to family back home, transferring money internationally, or remitting across borders (e.g., "sent 500 dollars to family", "remitted 2000 to home account"), you must flag "isRemittance": true. You should also extract the 3-letter target currency code as "remittanceCode" if specified, or default to "${homeCurrencyCode}".
8. If the input has multiple items, also populate an "items" array where each element contains "name" (string), "qty" (number, default 1), "total" (number, price of the item), and "category" (string, the unique category classification for this specific item).

Return a structured JSON response with keys:
- amount (number, the total sum of all items)
- description (text, comma-separated names of the items)
- category (text, the dominant category)
- time (text, optional)
- shared_amount (number, optional)
- paid_to (text, optional)
- note (text, optional)
- isRemittance (boolean, optional)
- remittanceCode (text, optional)
- items (array of objects with keys: name, qty, total, category; optional)

Examples:
Input: 'milk 30 sugar 40'
Output: { "amount": 70, "description": "milk, sugar", "category": "Food", "items": [{ "name": "milk", "qty": 1, "total": 30, "category": "Food" }, { "name": "sugar", "qty": 1, "total": 40, "category": "Food" }] }

Input: 'taxi 100 coffee 45'
Output: { "amount": 145, "description": "taxi, coffee", "category": "Transport", "items": [{ "name": "taxi", "qty": 1, "total": 100, "category": "Transport" }, { "name": "coffee", "qty": 1, "total": 45, "category": "Snacks" }] }

Input: 'Lunch 300 rupees split with friend 150'
Output: { "amount": 300, "description": "Lunch", "category": "Food", "shared_amount": 150, "note": "split with friend" }

Input: 'Paid friend 60 for movie'
Output: { "amount": 60, "description": "Movie payment", "category": "Entertainment", "paid_to": "friend" }

Input: 'sent 500 dollars to family'
Output: { "amount": 500, "description": "Sent money to family", "category": "Remittance", "isRemittance": true, "remittanceCode": "USD" }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout for proxy LLM routing

    try {
        const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
        if (!proxyUrl) {
            throw new Error('EXPO_PUBLIC_PROXY_URL is not configured');
        }

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: input,
                systemInstruction: systemPrompt
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`Proxy response failed with status ${response.status}:`, errorText);
            throw new Error(`Failed to parse expense: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        let cleanedCompletion = (data.text || '').trim();

        if (cleanedCompletion.startsWith('```json')) {
            cleanedCompletion = cleanedCompletion.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedCompletion.startsWith('```')) {
            cleanedCompletion = cleanedCompletion.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        cleanedCompletion = cleanedCompletion.replace(/^`+|`+$/g, '');

        const jsonMatch = cleanedCompletion.match(/\{[\s\S]*\}/s);
        if (jsonMatch) {
            cleanedCompletion = jsonMatch[0];
        }

        const parsed = JSON.parse(cleanedCompletion);

        const validation = validateAmount(parsed.amount, currencySymbol);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const isRemittance = parsed.isRemittance || false;
        let parsedCategory = parsed.category as ParsedExpense['category'];
        if (isRemittance) {
            parsedCategory = 'Remittance';
        } else if (!CATEGORIES.includes(parsedCategory)) {
            parsedCategory = 'Other';
        }

        return {
            amount: parsed.amount,
            description: parsed.description,
            category: parsedCategory,
            ...(parsed.time && { time: parsed.time }),
            ...(parsed.shared_amount && { shared_amount: parsed.shared_amount }),
            ...(parsed.paid_to && { paid_to: parsed.paid_to }),
            ...(parsed.note && { note: parsed.note }),
            isRemittance,
            remittanceCode: parsed.remittanceCode || homeCurrencyCode,
            ...(parsed.items && { items: parsed.items }),
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Expense parsing timed out, falling back to basic parser');
        } else {
            console.error('Error parsing expense:', error);
        }
        return fallbackParser(input, currencySymbol, homeCurrencyCode);
    } finally {
        clearTimeout(timeoutId);
    }
}

function getItemCategory(name: string): ParsedExpense['category'] {
    const lower = name.toLowerCase();
    const remittanceKeywords = ["sent", "send", "transfer", "remit", "remittance", "family", "mom", "dad", "parent"];
    if (remittanceKeywords.some(kw => lower.includes(kw))) return 'Remittance';

    if (lower.includes('tea') || lower.includes('coffee') || lower.includes('chai') || lower.includes('boost') || lower.includes('bun') || lower.includes('samosa') || lower.includes('biscuit') || lower.includes('snack')) {
        return 'Snacks';
    }
    if (lower.includes('water') || lower.includes('juice') || lower.includes('soda') || lower.includes('milkshake') || lower.includes('drink') || lower.includes('cool')) {
        return 'Drinks';
    }
    if (lower.includes('food') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast') || lower.includes('rice') || lower.includes('biryani') || lower.includes('burger') || lower.includes('pizza') || lower.includes('meal') || lower.includes('milk') || lower.includes('sugar')) {
        return 'Food';
    }
    if (lower.includes('bus') || lower.includes('taxi') || lower.includes('uber') || lower.includes('auto') || lower.includes('transport') || lower.includes('fuel') || lower.includes('petrol') || lower.includes('cab')) {
        return 'Transport';
    }
    if (lower.includes('electricity') || lower.includes('gas') || lower.includes('internet') || lower.includes('rent') || lower.includes('bill')) {
        return 'Utilities';
    }
    if (lower.includes('movie') || lower.includes('game') || lower.includes('cinema') || lower.includes('entertainment')) {
        return 'Entertainment';
    }
    if (lower.includes('shopping') || lower.includes('clothes') || lower.includes('shoes') || lower.includes('shirt')) {
        return 'Shopping';
    }
    if (lower.includes('doctor') || lower.includes('medicine') || lower.includes('hospital') || lower.includes('pharmacy')) {
        return 'Health';
    }
    return 'Other';
}

function fallbackParser(input: string, currencySymbol: string = '₹', homeCurrencyCode: string = 'INR'): ParsedExpense {
    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lowerInput = input.toLowerCase();

    // Multi-item regex parsing: matching item name followed by amount e.g., "coffee 50 lunch 100"
    const pairRegex = new RegExp(`([a-zA-Z\\s&'-]+?)\\s+(?:${escapedSymbol})?(\\d+(?:\\.\\d+)?)`, 'g');
    const matches: Array<{ name: string; amount: number }> = [];
    let match;

    while ((match = pairRegex.exec(input)) !== null) {
        let name = match[1].trim();
        const amount = parseFloat(match[2]);
        if (amount > 0 && name.length > 0) {
            name = name.replace(/^(bought|paid for|had|got|i bought|i had|i paid|spent on)\s+/i, '').trim();
            if (name.length > 0) {
                matches.push({ name, amount });
            }
        }
    }

    if (matches.length > 1) {
        const items: Array<{ name: string; qty: number; total: number; category?: ParsedExpense['category'] }> = [];
        const categoryTotals: Record<string, number> = {};
        let totalSum = 0;

        for (const item of matches) {
            const cat = getItemCategory(item.name);
            items.push({
                name: item.name,
                qty: 1,
                total: item.amount,
                category: cat
            });
            totalSum += item.amount;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + item.amount;
        }

        // Determine dominant category (highest total amount)
        let dominantCategory: ParsedExpense['category'] = items[0].category || 'Other';
        let maxTotal = 0;
        Object.entries(categoryTotals).forEach(([cat, catTotal]) => {
            if (catTotal > maxTotal) {
                maxTotal = catTotal;
                dominantCategory = cat as ParsedExpense['category'];
            }
        });

        const description = items.map(i => i.name).join(', ');

        return {
            amount: totalSum,
            description,
            category: dominantCategory,
            items,
        };
    }

    // Single item fallback extraction
    const amountRegex = new RegExp(`(?:${escapedSymbol})?(\\d+(?:\\.\\d+)?)`);
    const amountMatch = input.match(amountRegex);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    const timeMatch = input.match(/(\d{1,2}\s*(?:AM|PM|am|pm)|\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|morning|afternoon|evening|night)/i);
    const time = timeMatch ? timeMatch[1] : undefined;

    const cleanupRegex = new RegExp(`(?:${escapedSymbol})?\\d+(?:\\.\\d+)?`, 'g');
    let description = input.replace(cleanupRegex, '').trim();
    if (time) {
        description = description.replace(new RegExp(time.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    description = description.replace(/\s+at\s*$/i, '').trim() || 'Expense';

    const remittanceKeywords = ["sent", "send", "transfer", "remit", "remittance", "family", "mom", "dad", "parent"];
    const isRemittance = remittanceKeywords.some(keyword => lowerInput.includes(keyword));
    const category = getItemCategory(description);

    let remittanceCode = homeCurrencyCode;
    const words = lowerInput.toUpperCase().split(/\s+/);
    const currenciesList = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'AED', 'SAR', 'SGD', 'CNY', 'KRW'];
    for (const word of words) {
        if (currenciesList.includes(word)) {
            remittanceCode = word;
            break;
        }
    }

    return {
        amount,
        description,
        category,
        ...(time && { time }),
        isRemittance,
        remittanceCode: isRemittance ? remittanceCode : undefined,
    };
}