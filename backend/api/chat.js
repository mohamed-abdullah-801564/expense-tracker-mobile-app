import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  // Enable CORS headers
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    setCorsHeaders(res);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, image, mimeType, systemInstruction } = req.body;

    if (!prompt) {
      setCorsHeaders(res);
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setCorsHeaders(res);
      return res.status(200).json({ text: '⚠️ GEMINI_API_KEY is not configured on the Vercel backend. Please add it to your environment variables.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstructionText = systemInstruction || 'You are a read-only financial advisor for an expense tracker app. You CANNOT add, delete, or modify expenses. The user will provide their current financial data (expenses, budget, budgetHistory, debts) in JSON format. Your ONLY job is to analyze this data and answer questions. You now have access to the user\'s spending distribution and can answer specific questions about categories like "Snacks". Be conversational, helpful, concise, and natural. Do not use markdown code blocks, reply in plain text.';

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

    // List of models to try in order of preference
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const fallbackModels = [primaryModel, 'gemini-1.5-flash'].filter((m, i, self) => self.indexOf(m) === i);

    let result = null;
    let lastError = null;

    for (const modelName of fallbackModels) {
      try {
        console.log(`[Backend Proxy] Attempting Gemini API with model: ${modelName}`);
        const modelInstance = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstructionText
        });
        result = await modelInstance.generateContent(contents);
        if (result) break;
      } catch (geminiError) {
        console.warn(`[Backend Proxy] Model ${modelName} failed:`, geminiError?.message || geminiError);
        lastError = geminiError;
      }
    }

    if (!result) {
      throw lastError || new Error("All Gemini models failed to respond.");
    }

    const response = await result.response;

    let text = '';
    try {
      if (response && typeof response.text === 'function') {
        text = response.text();
      }
    } catch (e) {
      console.warn("[Backend Proxy] response.text() failed, extracting candidate text directly:", e);
    }

    if (!text && response?.candidates?.[0]?.content?.parts) {
      text = response.candidates[0].content.parts.map(p => p.text || '').join('');
    }

    if (!text && response?.candidates?.[0]?.finishReason) {
      const reason = response.candidates[0].finishReason;
      if (reason === 'SAFETY' || reason === 'RECITATION' || reason === 'BLOCKLIST') {
        text = `Response was blocked due to ${reason} filter.`;
      }
    }

    if (!text) {
      text = 'Unable to generate response.';
    }

    setCorsHeaders(res);
    return res.status(200).json({ text });
  } catch (error) {
    console.error("Backend Proxy Error:", error);
    setCorsHeaders(res);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
