import { ParsedBudget } from '@/types/expense';
import { validateAmount } from './expense-parser';

export async function parseBudgetWithAI(input: string, currencySymbol: string = '₹'): Promise<ParsedBudget> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
        const systemPrompt = `You are an AI assistant that helps users set or update their budget or monthly income for financial tracking. When given a natural language input, your task is to extract:

1. The total budget or income amount as a number.
2. The duration in days as a number (convert weeks/months/monthly to days. E.g., 'monthly', 'per month', or '1 month' = 30 days). If NO duration is mentioned, set this to null.
3. Whether the user wants to ADD to an existing budget or income (e.g., "Add 500", "Increase by 1000", "Top up 200").

Return the result in JSON format with keys:
- budget_amount (number)
- budget_days (number or null)
- is_add_operation (boolean)

Examples:
Input: 'I want to set a budget of 4000 rupees for 1 week'
Output: { "budget_amount": 4000, "budget_days": 7, "is_add_operation": false }

Input: 'My monthly salary is 50,000'
Output: { "budget_amount": 50000, "budget_days": 30, "is_add_operation": false }

Input: 'Income 45000 for 1 month'
Output: { "budget_amount": 45000, "budget_days": 30, "is_add_operation": false }

Input: 'Add 1000 to my budget'
Output: { "budget_amount": 1000, "budget_days": null, "is_add_operation": true }

Input: 'Budget 5000' (Invalid duration)
Output: { "budget_amount": 5000, "budget_days": null, "is_add_operation": false }

Input: 'Increase budget by 500'
Output: { "budget_amount": 500, "budget_days": null, "is_add_operation": true }`;

        const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
        if (!proxyUrl) {
            throw new Error('EXPO_PUBLIC_PROXY_URL is not configured');
        }

        const appSecret = process.env.EXPO_PUBLIC_APP_SECRET;
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(appSecret ? { 'x-app-secret': appSecret } : {}),
            },
            body: JSON.stringify({
                prompt: input,
                systemInstruction: systemPrompt
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error('Failed to parse budget');
        }

        const data = await response.json();

        // Clean the response to handle markdown code blocks and other formatting
        let cleanedCompletion = (data.text || '').trim();

        // Remove markdown code blocks if present
        if (cleanedCompletion.startsWith('```json')) {
            cleanedCompletion = cleanedCompletion.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedCompletion.startsWith('```')) {
            cleanedCompletion = cleanedCompletion.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Remove any leading/trailing backticks that might remain
        cleanedCompletion = cleanedCompletion.replace(/^`+|`+$/g, '');

        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = cleanedCompletion.match(/\{[\s\S]*\}/s);
        if (jsonMatch) {
            cleanedCompletion = jsonMatch[0];
        }

        const parsed = JSON.parse(cleanedCompletion);

        const numBudgetAmount = Number(parsed.budget_amount) || 0;
        const validation = validateAmount(numBudgetAmount, currencySymbol);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const numDays = parsed.budget_days !== null && parsed.budget_days !== undefined
            ? Number(parsed.budget_days)
            : null;

        return {
            budget_amount: numBudgetAmount,
            budget_days: numDays,
            is_add_operation: Boolean(parsed.is_add_operation)
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Budget parsing timed out, falling back to basic parser');
        } else {
            console.error('Error parsing budget:', error);
        }
        // Fallback to basic parsing
        return fallbackBudgetParser(input, currencySymbol);
    } finally {
        clearTimeout(timeoutId);
    }
}

function fallbackBudgetParser(input: string, currencySymbol: string = '₹'): ParsedBudget {
    const lowerInput = input.toLowerCase();

    // Detect add/increase intent
    const is_add_operation = lowerInput.includes('add') ||
        lowerInput.includes('increase') ||
        lowerInput.includes('top up');

    let budget_days: number | null = null;
    let textWithoutDuration = input;

    // Look for specific day numbers e.g., "10 days"
    const dayMatch = input.match(/(\d+)\s*days?/i);
    if (dayMatch) {
        budget_days = parseInt(dayMatch[1], 10);
        textWithoutDuration = textWithoutDuration.replace(dayMatch[0], '');
    } else {
        // Look for weeks
        const weekMatch = input.match(/(\d+)\s*weeks?/i);
        if (weekMatch) {
            budget_days = parseInt(weekMatch[1], 10) * 7;
            textWithoutDuration = textWithoutDuration.replace(weekMatch[0], '');
        } else {
            const monthMatch = input.match(/(\d+)\s*months?/i);
            if (monthMatch) {
                budget_days = parseInt(monthMatch[1], 10) * 30;
                textWithoutDuration = textWithoutDuration.replace(monthMatch[0], '');
            } else if (/\bweek\b/i.test(lowerInput)) {
                budget_days = 7;
                textWithoutDuration = textWithoutDuration.replace(/\bweek\b/i, '');
            } else if (/\b(month|monthly|per\s*month)\b/i.test(lowerInput)) {
                budget_days = 30;
                textWithoutDuration = textWithoutDuration.replace(/\b(month|monthly|per\s*month)\b/i, '');
            }
        }
    }

    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const amountRegex = new RegExp(`(?:${escapedSymbol})?(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)`);
    const amountMatch = textWithoutDuration.match(amountRegex);
    const rawAmt = amountMatch ? amountMatch[1].replace(/,/g, '') : '1000';
    const budget_amount = parseFloat(rawAmt) || 1000;

    return { budget_amount, budget_days, is_add_operation };
}
