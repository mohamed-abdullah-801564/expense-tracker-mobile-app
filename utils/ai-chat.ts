
let lastRequestTime = 0;
const COOLDOWN_MS = 10000;

function summarizeContext(contextData: any) {
    if (!contextData || typeof contextData !== 'object') return contextData;

    let expensesSummary: any = undefined;
    if (Array.isArray(contextData.expenses)) {
        const expenses = contextData.expenses;
        const totalCount = expenses.length;
        let totalSpent = 0;
        const categoryTotals: Record<string, number> = {};

        for (const exp of expenses) {
            const amt = Number(exp.amount) || 0;
            totalSpent += amt;
            const cat = exp.category || 'Other';
            categoryTotals[cat] = Math.round(((categoryTotals[cat] || 0) + amt) * 100) / 100;
        }

        // Keep the most recent 25 expenses with minimal fields
        const recentExpenses = expenses.slice(0, 25).map((exp: any) => ({
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            date: exp.date,
        }));

        expensesSummary = {
            totalExpensesRecorded: totalCount,
            totalSpentAllTime: Math.round(totalSpent * 100) / 100,
            spendingByCategory: categoryTotals,
            recentExpenses,
        };
    }

    let budgetHistorySummary: any = undefined;
    if (Array.isArray(contextData.budgetHistory)) {
        budgetHistorySummary = contextData.budgetHistory.slice(0, 5).map((b: any) => ({
            period: `${b.startDate} to ${b.endDate}`,
            totalAmount: b.totalAmount,
            spent: b.spent,
            status: b.status,
        }));
    }

    let friendsSummary: any = undefined;
    if (Array.isArray(contextData.friends)) {
        friendsSummary = contextData.friends.map((f: any) => ({
            name: f.name,
            netBalance: f.netBalance,
            lent: f.lent,
            borrowed: f.borrowed,
        }));
    }

    return {
        financialSummary: expensesSummary || contextData.expenses,
        currentBudget: contextData.budget,
        recentBudgets: budgetHistorySummary || contextData.budgetHistory,
        friendsSplitDebts: friendsSummary || contextData.friends,
    };
}

export async function askGeminiAssistant(prompt: string, contextData: any): Promise<string> {
    const now = Date.now();
    if (now - lastRequestTime < COOLDOWN_MS) {
        return "Whoa, slow down! ☕ I'm still processing your last thought. Give me a few seconds to catch up, and I'll be ready to help you again!";
    }

    const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
    if (!proxyUrl) {
        return 'The AI assistant is not configured yet. Please add your EXPO_PUBLIC_PROXY_URL to the environment configuration.';
    }

    lastRequestTime = now;

    try {
        const compactContext = summarizeContext(contextData);
        const combinedPrompt = `
Context Data (JSON):
${JSON.stringify(compactContext)}

User Question:
${prompt}
`;

        const appSecret = process.env.EXPO_PUBLIC_APP_SECRET;
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(appSecret ? { 'x-app-secret': appSecret } : {}),
            },
            body: JSON.stringify({
                prompt: combinedPrompt,
                systemInstruction: 'You are a read-only financial advisor for an expense tracker app. You CANNOT add, delete, or modify expenses. The user will provide their current financial data (expenses, budget, budgetHistory, debts) in JSON format. Your ONLY job is to analyze this data and answer questions. You now have access to the user\'s spending distribution and can answer specific questions about categories like "Snacks". Be conversational, helpful, concise, and natural. Do not use markdown code blocks, reply in plain text.'
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Proxy error: ${response.status}`);
        }

        const data = await response.json();
        return data.text || 'The AI assistant returned an empty response.';
    } catch (error: any) {
        console.error('Error calling AI assistant:', error);
        return error.message.includes('Proxy error') 
            ? 'Sorry, I could not reach the AI assistant right now. Please check your backend configuration.'
            : `Error: ${error.message}`;
    }
}

