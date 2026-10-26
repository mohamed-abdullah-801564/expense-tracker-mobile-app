import { ExpenseCategory } from '@/types/expense';

export interface ParsedUpiNotification {
    isValidDebit: boolean;
    amount: number;
    merchant: string;
    category: ExpenseCategory;
    sourceApp: string;
    rawText: string;
}

// Known app packages for Indian UPI and banking
export const KNOWN_PAYMENT_PACKAGES: Record<string, string> = {
    'com.google.android.apps.nbu.paisa.user': 'Google Pay',
    'com.phonepe.app': 'PhonePe',
    'net.one97.paytm': 'Paytm',
    'com.dreamplug.androidapp': 'CRED',
    'in.org.npci.upiapp': 'BHIM',
    'com.msf.kbank.mobile': 'Kotak 811',
    'com.csam.icici.bank.imobile': 'ICICI iMobile',
    'com.snapwork.hdfc': 'HDFC Bank',
    'com.sbi.lotusintouch': 'SBI YONO',
    'com.axis.mobile': 'Axis Mobile',
};

// Common Indian merchant keyword mapping
const MERCHANT_CATEGORY_MAP: Array<{ regex: RegExp; category: ExpenseCategory }> = [
    {
        regex: /\b(swiggy|zomato|starbucks|mcdonald|kfc|dominos|pizza|burger|chai|tea|cafe|coffee|restaurant|hotel|bakery|diner|eats|barbeque|bikanervala|haldiram)\b/i,
        category: 'Food'
    },
    {
        regex: /\b(uber|ola|rapido|metro|irctc|redbus|petrol|fuel|indianoil|hpcl|bpcl|shell|toll|fastag|parking|auto)\b/i,
        category: 'Transport'
    },
    {
        regex: /\b(bescom|cesc|electricity|airtel|jio|vi\b|vodafone|tatasky|dth|broadband|water|gas|indane|billdesk|recharge|cylinder)\b/i,
        category: 'Utilities'
    },
    {
        regex: /\b(amazon|flipkart|myntra|ajio|meesho|zara|h&m|croma|reliance|dmart|d-mart|blinkit|zepto|instamart|bigbasket|supermarket|mart|store)\b/i,
        category: 'Shopping'
    },
    {
        regex: /\b(netflix|spotify|bookmyshow|pvr|inox|prime\s*video|hotstar|disney|youtube|cinema|theatre|game|steam)\b/i,
        category: 'Entertainment'
    },
    {
        regex: /\b(apollo|pharmeasy|netmeds|medplus|1mg|pharmacy|chemist|hospital|clinic|doctor|diagnostic|lab|medical)\b/i,
        category: 'Health'
    }
];

/**
 * Checks if a notification from a payment app is an outbound debit expense (money spent),
 * and extracts amount, merchant, and category.
 */
export function parseUpiNotification(
    title: string = '',
    body: string = '',
    packageName: string = ''
): ParsedUpiNotification | null {
    const fullText = `${title} ${body}`.trim();
    if (!fullText) return null;

    const lowerText = fullText.toLowerCase();

    // 1. Filter out credits, refunds, money received, incoming requests
    const isCreditOrIgnore =
        /\b(received|credited|cashback|refund|refunded|request from|requested|sent you|added to wallet|reward)\b/i.test(lowerText) &&
        !/\b(debited|paid|spent|sent to)\b/i.test(lowerText);

    if (isCreditOrIgnore) {
        return null;
    }

    // 2. Identify if it contains debit / payment keywords
    const isDebit = /\b(paid|debited|spent|transferred to|sent to|payment to|payment of|purchase of|txn of)\b/i.test(lowerText);
    if (!isDebit) {
        return null;
    }

    // 3. Extract Amount
    // Matches: ₹150, Rs. 150.00, INR 1,500, Rs 500, 450.00 paid
    let amount: number | null = null;
    const amountRegex = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i;
    const match = fullText.match(amountRegex);

    if (match && match[1]) {
        amount = parseFloat(match[1].replace(/,/g, ''));
    } else {
        // Fallback: look for amount followed by debited/paid (e.g., "500.00 debited from ...")
        const fallbackAmountRegex = /([\d,]+(?:\.\d{1,2})?)\s*(?:debited|paid|spent)/i;
        const fbMatch = fullText.match(fallbackAmountRegex);
        if (fbMatch && fbMatch[1]) {
            amount = parseFloat(fbMatch[1].replace(/,/g, ''));
        }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        return null;
    }

    // 4. Extract Merchant / Recipient name
    let merchant = 'Payment';

    // Patterns like "Paid to Starbucks", "Payment to Swiggy", "sent to Ram", "at Starbucks"
    const merchantPatterns = [
        /(?:paid to|payment to|sent to|transferred to)\s+([A-Za-z0-9\s&.'-]+?)(?:\s+(?:using|with|via|from|on|ref|upi|for|\*\*|\.|$))/i,
        /(?:debited.*towards|spent.*at|purchase at)\s+([A-Za-z0-9\s&.'-]+?)(?:\s+(?:on|via|ref|\*\*|\.|$))/i,
        /paid\s+(?:₹|rs\.?|inr)?[\d,.]+\s+to\s+([A-Za-z0-9\s&.'-]+?)(?:\s+(?:using|with|via|from|on|ref|\*\*|\.|$))/i,
    ];

    for (const pattern of merchantPatterns) {
        const mMatch = fullText.match(pattern);
        if (mMatch && mMatch[1]) {
            const candidate = mMatch[1].trim();
            // Sanity check candidate length and keywords
            if (candidate.length > 1 && candidate.length < 50 && !/\b(bank|account|upi|card|ref|successful)\b/i.test(candidate)) {
                merchant = candidate;
                break;
            }
        }
    }

    // If still default and title mentions receiver (e.g. title: "Paid to Starbucks")
    if (merchant === 'Payment') {
        const titleMatch = title.match(/(?:paid to|to)\s+([A-Za-z0-9\s&.'-]+)/i);
        if (titleMatch && titleMatch[1]) {
            const cleanTitle = titleMatch[1].trim();
            if (cleanTitle.length > 1 && cleanTitle.length < 40) {
                merchant = cleanTitle;
            }
        }
    }

    // Clean up trailing punctuation
    merchant = merchant.replace(/[.,;:]+$/, '').trim();

    // 5. Categorize based on merchant name and full text
    let category: ExpenseCategory = 'Other';
    for (const { regex, category: cat } of MERCHANT_CATEGORY_MAP) {
        if (regex.test(merchant) || regex.test(fullText)) {
            category = cat;
            break;
        }
    }

    const sourceApp = KNOWN_PAYMENT_PACKAGES[packageName] || 'UPI / Bank';

    return {
        isValidDebit: true,
        amount,
        merchant,
        category,
        sourceApp,
        rawText: fullText,
    };
}
