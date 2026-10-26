import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// In-memory rate limiting (per warm serverless instance)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  // Periodic cleanup if map grows
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      const valid = times.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, valid);
    }
  }
  return false;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-app-secret'
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

  // Optional App Secret validation (if configured on Vercel)
  const expectedSecret = process.env.APP_SECRET;
  if (expectedSecret) {
    const clientSecret = req.headers['x-app-secret'];
    if (clientSecret !== expectedSecret) {
      setCorsHeaders(res);
      return res.status(401).json({ error: 'Unauthorized request' });
    }
  }

  // Rate Limiting by IP
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    setCorsHeaders(res);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  try {
    const { prompt, image, mimeType, systemInstruction } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      setCorsHeaders(res);
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    if (prompt.length > 100000) {
      setCorsHeaders(res);
      return res.status(400).json({ error: 'Prompt exceeds maximum character limit' });
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
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
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
