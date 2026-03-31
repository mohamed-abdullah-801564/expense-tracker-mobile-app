import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function askGeminiAssistant(prompt: string, contextData: any): Promise<string> {
    if (!apiKey || !genAI) {
        return 'The AI assistant is not configured yet. Please add your EXPO_PUBLIC_GEMINI_API_KEY to the environment configuration.';
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction:
                'You are a read-only financial advisor for an expense tracker app. You CANNOT add, delete, or modify expenses. The user will provide their current financial data (expenses, budget, budgetHistory, debts) in JSON format. Your ONLY job is to analyze this data and answer questions like "How much did I spend?", "What are my total expenses for this month?", "Who owes me money?", "How many times have I updated my budget?", or "What was my previous budget amount?". Be conversational, helpful, concise, and natural. Do not use markdown code blocks, reply in plain text.',
        });

        const fullPrompt = `${prompt}\n\nContext JSON:\n${JSON.stringify(contextData)}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error) {
        console.error('Error calling Gemini assistant:', error);
        return 'Sorry, I could not reach the AI assistant right now. Please try again in a moment.';
    }
}

