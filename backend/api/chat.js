import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, image, mimeType, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ text: '⚠️ GEMINI_API_KEY is not configured on the Vercel backend. Please add it to your environment variables.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstructionText = systemInstruction || 'You are a read-only financial advisor for an expense tracker app. You CANNOT add, delete, or modify expenses. The user will provide their current financial data (expenses, budget, budgetHistory, debts) in JSON format. Your ONLY job is to analyze this data and answer questions. You now have access to the user\'s spending distribution and can answer specific questions about categories like "Snacks". Be conversational, helpful, concise, and natural. Do not use markdown code blocks, reply in plain text.';
    
    const activeModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstructionText
    });

    let contents;
    if (image) {
      contents = [
        {
          inlineData: {
            data: image,
            mimeType: mimeType || 'image/jpeg'
          }
        },
        {
          text: prompt
        }
      ];
    } else {
      contents = prompt;
    }

    const result = await activeModel.generateContent(contents);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Backend Proxy Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
