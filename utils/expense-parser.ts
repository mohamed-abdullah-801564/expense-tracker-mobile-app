import { ParsedExpense } from '@/types/expense';

export const MAX_AMOUNT = 1000000;
export const MIN_AMOUNT = 0.01;

export function validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
        return { valid: false, error: 'Amount must be greater than zero' };
    }
    if (amount > MAX_AMOUNT) {
        return { valid: false, error: `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}` };
    }
    return { valid: true };
}

export async function parseExpenseWithAI(input: string): Promise<ParsedExpense> {
    const systemPrompt = `You are an AI assistant that helps users track and categorize their daily expenses, including shared expenses and payments to friends. When given a natural language input, your task is to:
        
1. Extract the expense amount as a number.
2. Extract the expense description or item name clearly.
3. Categorize the expense into one of these categories: Food, Transport, Utilities, Entertainment, Shopping, Health, Snacks, or Other.
4. If the expense input contains time or part of the day (like '5 PM', 'morning'), extract it as 'time'. If not present, omit the time field.
5. Extract details about shared expenses or payments:
   - If the user mentions splitting the expense, extract the shared amount and indicate it's split.
   - If the user mentions paying a friend, extract the amount paid and the person or label if specified.

Return a structured JSON response with keys:
- amount (number)
- description (text)
- category (text)
- time (text, optional)
- shared_amount (number, optional)
- paid_to (text, optional)
- note (text, optional)

Examples:
Input: 'Lunch 300 rupees split with friend 150'
Output: { "amount": 300, "description": "Lunch", "category": "Food", "shared_amount": 150, "note": "split with friend" }

Input: 'Paid friend 60 for movie'
Output: { "amount": 60, "description": "Movie payment", "category": "Entertainment", "paid_to": "friend" }

Input: 'Lunch 150 rupees at 1 PM'
Output: { "amount": 150, "description": "Lunch", "category": "Food", "time": "1 PM" }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch('https://toolkit.rork.com/text/llm/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: input }
                ]
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error('Failed to parse expense');
        }

        const data = await response.json();

        let cleanedCompletion = data.completion.trim();

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

        const validation = validateAmount(parsed.amount);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return {
            amount: parsed.amount,
            description: parsed.description,
            category: parsed.category as ParsedExpense['category'],
            ...(parsed.time && { time: parsed.time }),
            ...(parsed.shared_amount && { shared_amount: parsed.shared_amount }),
            ...(parsed.paid_to && { paid_to: parsed.paid_to }),
            ...(parsed.note && { note: parsed.note })
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Expense parsing timed out, falling back to basic parser');
        } else {
            console.error('Error parsing expense:', error);
        }
        return fallbackParser(input);
    } finally {
        clearTimeout(timeoutId);
    }
}

function fallbackParser(input: string): ParsedExpense {
    // Extract amount using regex
    const amountMatch = input.match(/₹?(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    // Extract time using regex
    const timeMatch = input.match(/(\d{1,2}\s*(?:AM|PM|am|pm)|\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|morning|afternoon|evening|night)/i);
    const time = timeMatch ? timeMatch[1] : undefined;

    // Remove amount and time from description
    let description = input.replace(/₹?\d+(?:\.\d+)?/g, '').trim();
    if (time) {
        description = description.replace(new RegExp(time.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    description = description.replace(/\s+at\s*$/i, '').trim() || 'Expense';

    // Basic keyword-based categorization
    const lowerInput = input.toLowerCase();
    let category: ParsedExpense['category'] = 'Other';

    if (lowerInput.includes('food') || lowerInput.includes('lunch') || lowerInput.includes('dinner') || lowerInput.includes('coffee') || lowerInput.includes('breakfast')) {
        category = 'Food';
    } else if (lowerInput.includes('bus') || lowerInput.includes('taxi') || lowerInput.includes('uber') || lowerInput.includes('transport') || lowerInput.includes('fuel')) {
        category = 'Transport';
    } else if (lowerInput.includes('electricity') || lowerInput.includes('water') || lowerInput.includes('gas') || lowerInput.includes('internet') || lowerInput.includes('rent')) {
        category = 'Utilities';
    } else if (lowerInput.includes('movie') || lowerInput.includes('game') || lowerInput.includes('entertainment')) {
        category = 'Entertainment';
    } else if (lowerInput.includes('shopping') || lowerInput.includes('clothes') || lowerInput.includes('shoes')) {
        category = 'Shopping';
    } else if (lowerInput.includes('doctor') || lowerInput.includes('medicine') || lowerInput.includes('hospital')) {
        category = 'Health';
    } else if (lowerInput.includes('tea') || lowerInput.includes('coffee') || lowerInput.includes('bun') || lowerInput.includes('samosa') || lowerInput.includes('biscuits') || lowerInput.includes('chai')) {
        category = 'Snacks';
    }

    return { amount, description, category, ...(time && { time }) };
}