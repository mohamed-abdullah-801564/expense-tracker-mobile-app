import { ParsedBudget } from '@/types/expense';
import { validateAmount } from './expense-parser';

const LLM_API_URL = 'https://toolkit.rork.com/text/llm/';

export async function parseBudgetWithAI(input: string, currencySymbol: string = '₹'): Promise<ParsedBudget> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
        const systemPrompt = `You are an AI assistant that helps users set or update their budget for expense tracking. When given a natural language input, your task is to extract:

1. The total budget amount as a number.
2. The budget duration in days as a number (convert weeks/months to days). If NO duration is mentioned, set this to null.
3. Whether the user wants to ADD to an existing budget (e.g., "Add 500", "Increase by 1000", "Top up 200").

Return the result in JSON format with keys:
- budget_amount (number)
- budget_days (number or null)
- is_add_operation (boolean)

Examples:
Input: 'I want to set a budget of 4000 rupees for 1 week'
Output: { "budget_amount": 4000, "budget_days": 7, "is_add_operation": false }

Input: 'Add 1000 to my budget'
Output: { "budget_amount": 1000, "budget_days": null, "is_add_operation": true }

Input: 'Budget 5000' (Invalid duration)
Output: { "budget_amount": 5000, "budget_days": null, "is_add_operation": false }

Input: 'Increase budget by 500'
Output: { "budget_amount": 500, "budget_days": null, "is_add_operation": true }`;

        const response = await fetch(LLM_API_URL, {
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

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to parse budget');
        }

        const data = await response.json();

        // Clean the response to handle markdown code blocks and other formatting
        let cleanedCompletion = data.completion.trim();

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

        const validation = validateAmount(parsed.budget_amount, currencySymbol);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return {
            budget_amount: parsed.budget_amount,
            budget_days: parsed.budget_days,
            is_add_operation: parsed.is_add_operation
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('Budget parsing timed out, falling back to basic parser');
        } else {
            console.error('Error parsing budget:', error);
        }
        // Fallback to basic parsing
        return fallbackBudgetParser(input, currencySymbol);
    }
}

function fallbackBudgetParser(input: string, currencySymbol: string = '₹'): ParsedBudget {
    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Extract amount using dynamic regex, making the currency symbol optional
    const amountRegex = new RegExp(`(?:${escapedSymbol})?(\\d+(?:\\.\\d+)?)`);
    const amountMatch = input.match(amountRegex);
    const budget_amount = amountMatch ? parseFloat(amountMatch[1]) : 1000;
    const lowerInput = input.toLowerCase();

    // Detect add/increase intent
    const is_add_operation = lowerInput.includes('add') ||
        lowerInput.includes('increase') ||
        lowerInput.includes('top up');

    let budget_days: number | null = null;

    // Look for specific day numbers
    const dayMatch = input.match(/(\d+)\s*days?/i);
    if (dayMatch) {
        budget_days = parseInt(dayMatch[1]);
    } else {
        // Look for weeks
        const weekMatch = input.match(/(\d+)\s*weeks?/i);
        if (weekMatch) {
            budget_days = parseInt(weekMatch[1]) * 7;
        } else if (lowerInput.includes('week')) {
            budget_days = 7;
        } else if (lowerInput.includes('month')) {
            budget_days = 30;
        }
    }

    // Default to 30 days if no duration is specified and it's NOT an add operation
    // This handles cases like "Budget 5000" -> 5000 for 30 days
    if (budget_days === null && !is_add_operation) {
        budget_days = 30;
    }

    return { budget_amount, budget_days, is_add_operation };
}
