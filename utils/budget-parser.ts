import { ParsedBudget, BudgetCalculationInput, BudgetCalculationResult } from '@/types/expense';
import { validateAmount } from './expense-parser';

export async function parseBudgetWithAI(input: string): Promise<ParsedBudget> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
        const systemPrompt = `You are an AI assistant that helps users set their budget and duration for expense tracking. When given a natural language input, your task is to extract:

1. The total budget amount as a number.
2. The budget duration in days as a number (convert weeks to days when mentioned).

Return the result in JSON format with keys:
- budget_amount (number)
- budget_days (number)

Examples:
Input: 'I want to set a budget of 4000 rupees for 1 week'
Output: { "budget_amount": 4000, "budget_days": 7 }

Input: 'Budget 4500 for 2 weeks'
Output: { "budget_amount": 4500, "budget_days": 14 }

Input: 'My budget is 5000 for 15 days'
Output: { "budget_amount": 5000, "budget_days": 15 }`;

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

        const validation = validateAmount(parsed.budget_amount);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return {
            budget_amount: parsed.budget_amount,
            budget_days: parsed.budget_days
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('Budget parsing timed out, falling back to basic parser');
        } else {
            console.error('Error parsing budget:', error);
        }
        // Fallback to basic parsing
        return fallbackBudgetParser(input);
    }
}

function fallbackBudgetParser(input: string): ParsedBudget {
    // Extract amount using regex
    const amountMatch = input.match(/₹?(\d+(?:\.\d+)?)/);
    const budget_amount = amountMatch ? parseFloat(amountMatch[1]) : 1000;

    // Extract days/weeks using regex
    const lowerInput = input.toLowerCase();
    let budget_days = 7; // default to 1 week

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

    return { budget_amount, budget_days };
}

export function calculateBudgetStats(input: BudgetCalculationInput): BudgetCalculationResult {
    const total_expenses = input.expense_amounts.reduce((sum, amount) => sum + amount, 0);
    const remaining_balance = input.budget_amount - total_expenses;
    const daily_limit = input.budget_amount / input.budget_days;
    const updated_daily_limit = input.remaining_days > 0 ? remaining_balance / input.remaining_days : 0;

    return {
        total_expenses,
        remaining_balance,
        daily_limit: Math.round(daily_limit * 100) / 100,
        updated_daily_limit: Math.round(updated_daily_limit * 100) / 100,
        remaining_days: input.remaining_days
    };
}