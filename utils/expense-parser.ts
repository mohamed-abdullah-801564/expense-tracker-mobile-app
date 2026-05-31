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
            throw new Error('Failed to parse expense');
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

function fallbackParser(input: string, currencySymbol: string = '₹', homeCurrencyCode: string = 'INR'): ParsedExpense {
    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Extract amount using dynamic regex, making the currency symbol optional
    const amountRegex = new RegExp(`(?:${escapedSymbol})?(\\d+(?:\\.\\d+)?)`);
    const amountMatch = input.match(amountRegex);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    // Extract time using regex
    const timeMatch = input.match(/(\d{1,2}\s*(?:AM|PM|am|pm)|\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|morning|afternoon|evening|night)/i);
    const time = timeMatch ? timeMatch[1] : undefined;

    // Remove amount and time from description
    const cleanupRegex = new RegExp(`(?:${escapedSymbol})?\\d+(?:\\.\\d+)?`, 'g');
    let description = input.replace(cleanupRegex, '').trim();
    if (time) {
        description = description.replace(new RegExp(time.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    description = description.replace(/\s+at\s*$/i, '').trim() || 'Expense';

    // Basic keyword-based categorization
    const lowerInput = input.toLowerCase();
    
    // Explicit variations to match: "sent", "send", "transfer", "remit", "remittance", "family", "mom", "dad", "parent"
    const remittanceKeywords = ["sent", "send", "transfer", "remit", "remittance", "family", "mom", "dad", "parent"];
    const isRemittance = remittanceKeywords.some(keyword => lowerInput.includes(keyword));

    let category: ParsedExpense['category'] = 'Other';

    if (isRemittance) {
        category = 'Remittance';
    } else if (lowerInput.includes('food') || lowerInput.includes('lunch') || lowerInput.includes('dinner') || lowerInput.includes('breakfast')) {
        category = 'Food';
    } else if (lowerInput.includes('bus') || lowerInput.includes('taxi') || lowerInput.includes('uber') || lowerInput.includes('transport') || lowerInput.includes('fuel')) {
        category = 'Transport';
    } else if (lowerInput.includes('electricity') || lowerInput.includes('gas') || lowerInput.includes('internet') || lowerInput.includes('rent')) {
        category = 'Utilities';
    } else if (lowerInput.includes('movie') || lowerInput.includes('game') || lowerInput.includes('entertainment')) {
        category = 'Entertainment';
    } else if (lowerInput.includes('shopping') || lowerInput.includes('clothes') || lowerInput.includes('shoes')) {
        category = 'Shopping';
    } else if (lowerInput.includes('doctor') || lowerInput.includes('medicine') || lowerInput.includes('hospital')) {
        category = 'Health';
    } else if (lowerInput.includes('tea') || lowerInput.includes('coffee') || lowerInput.includes('chai') || lowerInput.includes('boost') || lowerInput.includes('bun') || lowerInput.includes('samosa') || lowerInput.includes('biscuits')) {
        category = 'Snacks';
    } else if (lowerInput.includes('water') || lowerInput.includes('juice') || lowerInput.includes('soda') || lowerInput.includes('milkshake') || lowerInput.includes('drink') || lowerInput.includes('cool')) {
        category = 'Drinks';
    }

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