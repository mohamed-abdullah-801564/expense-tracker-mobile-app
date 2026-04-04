
let lastRequestTime = 0;
const COOLDOWN_MS = 10000;

export async function askGeminiAssistant(prompt: string, contextData: any): Promise<string> {
    const now = Date.now();
    if (now - lastRequestTime < COOLDOWN_MS) {
        return 'Please wait a moment before asking another question to avoid hitting rate limits.';
    }

    const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
    if (!proxyUrl) {
        return 'The AI assistant is not configured yet. Please add your EXPO_PUBLIC_PROXY_URL to the environment configuration.';
    }

    lastRequestTime = now;

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                contextData,
                model: 'gemini-2.5-flash',
                // Including system instruction update as requested, 
                // assuming the proxy might use it or it's for documentation.
                systemInstruction: 'You are a read-only financial advisor for an expense tracker app. You CANNOT add, delete, or modify expenses. The user will provide their current financial data (expenses, budget, budgetHistory, debts) in JSON format. Your ONLY job is to analyze this data and answer questions. You now have access to the user\'s budgetHistory to provide better insights. Be conversational, helpful, concise, and natural. Do not use markdown code blocks, reply in plain text.'
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

