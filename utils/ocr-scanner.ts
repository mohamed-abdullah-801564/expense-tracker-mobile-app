import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SCAN_DATE_KEY = 'lastScanDate';
const DAILY_SCAN_COUNT_KEY = 'dailyScanCount';

export async function checkDailyScanLimit(): Promise<{ allowed: boolean; count: number }> {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
    try {
        const lastDate = await AsyncStorage.getItem(LAST_SCAN_DATE_KEY);
        const countStr = await AsyncStorage.getItem(DAILY_SCAN_COUNT_KEY);
        let count = countStr ? parseInt(countStr, 10) : 0;

        if (lastDate !== today) {
            // Reset count for new day
            await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);
            await AsyncStorage.setItem(DAILY_SCAN_COUNT_KEY, '0');
            return { allowed: true, count: 0 };
        }

        if (count >= 3) {
            return { allowed: false, count };
        }

        return { allowed: true, count };
    } catch (e) {
        console.error('Failed to check scan limit, defaulting to allowed', e);
        return { allowed: true, count: 0 };
    }
}

export async function incrementDailyScanCount(): Promise<number> {
    const today = new Date().toLocaleDateString('en-CA');
    try {
        const countStr = await AsyncStorage.getItem(DAILY_SCAN_COUNT_KEY);
        const currentCount = countStr ? parseInt(countStr, 10) : 0;
        const newCount = currentCount + 1;
        
        await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);
        await AsyncStorage.setItem(DAILY_SCAN_COUNT_KEY, newCount.toString());
        return newCount;
    } catch (e) {
        console.error('Failed to increment scan count', e);
        return 0;
    }
}

export interface ScannedItem {
    itemName: string;
    price: number;
    category: string;
}

interface OCRResult {
    items?: ScannedItem[];
    error?: string;
}

export async function scanReceiptWithGemini(base64Image: string): Promise<OCRResult> {
    const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
    if (!proxyUrl) {
        throw new Error('Proxy URL is not configured. Please define EXPO_PUBLIC_PROXY_URL.');
    }

    const systemPrompt = `Analyze the receipt image and extract the list of individual items found on the receipt/bill.
For each item found, extract:
1. itemName: The name or description of the individual item.
2. price: The price of the individual item (as a number).
3. category: The best matching category for that item from this list: Food, Transport, Utilities, Remittance, Shopping, Others.

STRICT RULE: If the uploaded image is clearly NOT a store receipt, grocery bill, invoice, or financial document (e.g., it is a person, a car, landscape, or a random meme/non-financial picture), you MUST instantly abort standard extraction and return this exact JSON error block:
{ "error": "invalid_document" }

Otherwise, you MUST respond with a valid JSON object ONLY containing an "items" array. Do not wrap in markdown blocks like \`\`\`json or \`\`\`. Do not write any other text. Return a raw, clean JSON string.
Format:
{
  "items": [
    {
      "itemName": "Walmart - Milk",
      "price": 4.50,
      "category": "Food"
    },
    {
      "itemName": "Walmart - Socks",
      "price": 8.00,
      "category": "Shopping"
    }
  ]
}`;

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            prompt: systemPrompt,
            image: base64Image,
            mimeType: 'image/jpeg',
            systemInstruction: systemPrompt
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Proxy error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.text || '';
    console.log('Gemini OCR raw response:', responseText);

    // Clean markdown code blocks if the model wrapped it anyway
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    
    if (parsed.error === 'invalid_document') {
        return { error: 'invalid_document' };
    }
    
    const items = Array.isArray(parsed.items) ? parsed.items.map((item: any) => {
        const itemName = item.itemName || 'Item';
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const category = item.category || 'Others';
        return { itemName, price, category };
    }) : [];

    return { items };
}
