import { ExpenseCategory } from '@/types/expense';
import { getItemCategory } from './expense-parser';

export interface ParsedBankTransaction {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    category: ExpenseCategory;
    selected: boolean;
    rawNarrative?: string;
}

const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function safeParseDate(dateStr: string): string {
    if (!dateStr) return formatLocalDate(new Date());
    const cleaned = dateStr.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }

    // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = cleaned.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
    if (dmyMatch) {
        let day = dmyMatch[1].padStart(2, '0');
        let month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) {
            year = '20' + year;
        }
        if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
            const temp = day;
            day = month;
            month = temp;
        }
        return `${year}-${month}-${day}`;
    }

    // Match DD-MMM-YYYY or DD/MMM/YYYY e.g., 15-Jan-2024 or 15-JAN-24
    const dMonYMatch = cleaned.match(/^(\d{1,2})[\/\.-]([a-zA-Z]{3})[\/\.-](\d{2,4})/);
    if (dMonYMatch) {
        let day = dMonYMatch[1].padStart(2, '0');
        const monKey = dMonYMatch[2].toLowerCase();
        let month = MONTHS[monKey] || '01';
        let year = dMonYMatch[3];
        if (year.length === 2) {
            year = '20' + year;
        }
        return `${year}-${month}-${day}`;
    }

    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
        return formatLocalDate(d);
    }

    return formatLocalDate(new Date());
}

/**
 * Cleans Indian Bank & UPI narrations into concise, human-readable merchant names.
 */
export function cleanIndianBankNarration(rawNarrative: string): string {
    if (!rawNarrative) return 'Expense';
    const raw = rawNarrative.trim();
    const upper = raw.toUpperCase();

    // 1. Direct Indian merchant / service brand detection
    const merchantMap: Array<{ keywords: string[]; name: string }> = [
        { keywords: ['ZOMATO'], name: 'Zomato' },
        { keywords: ['SWIGGY'], name: 'Swiggy' },
        { keywords: ['UBER'], name: 'Uber' },
        { keywords: ['OLA '], name: 'Ola' },
        { keywords: ['RAPIDO'], name: 'Rapido' },
        { keywords: ['CHAI POINT'], name: 'Chai Point' },
        { keywords: ['CHAAYOS'], name: 'Chaayos' },
        { keywords: ['STARBUCKS'], name: 'Starbucks' },
        { keywords: ['AMAZON'], name: 'Amazon' },
        { keywords: ['FLIPKART'], name: 'Flipkart' },
        { keywords: ['MYNTRA'], name: 'Myntra' },
        { keywords: ['AJIO'], name: 'Ajio' },
        { keywords: ['AIRTEL'], name: 'Airtel' },
        { keywords: ['JIO'], name: 'Jio' },
        { keywords: ['VODAFONE', 'VI RECHARGE'], name: 'Vi' },
        { keywords: ['NETFLIX'], name: 'Netflix' },
        { keywords: ['SPOTIFY'], name: 'Spotify' },
        { keywords: ['HOTSTAR'], name: 'Disney+ Hotstar' },
        { keywords: ['BOOKMYSHOW'], name: 'BookMyShow' },
        { keywords: ['PVR'], name: 'PVR Cinemas' },
        { keywords: ['INOX'], name: 'INOX' },
        { keywords: ['MCDONALD'], name: "McDonald's" },
        { keywords: ['KFC'], name: 'KFC' },
        { keywords: ['DOMINO'], name: "Domino's" },
        { keywords: ['SUBWAY'], name: 'Subway' },
        { keywords: ['DMART', 'D-MART'], name: 'DMart' },
        { keywords: ['BLINKIT'], name: 'Blinkit' },
        { keywords: ['ZEPTO'], name: 'Zepto' },
        { keywords: ['BIGBASKET'], name: 'BigBasket' },
        { keywords: ['INSTAMART'], name: 'Instamart' },
        { keywords: ['APOLLO'], name: 'Apollo Pharmacy' },
        { keywords: ['PHARMEASY'], name: 'PharmEasy' },
        { keywords: ['1MG'], name: 'Tata 1mg' },
        { keywords: ['SHELL'], name: 'Shell Petrol' },
        { keywords: ['HPCL', 'HINDPETRO'], name: 'HP Petrol' },
        { keywords: ['BPCL', 'BHARATPETRO'], name: 'Bharat Petroleum' },
        { keywords: ['IOCL', 'INDIANOIL'], name: 'Indian Oil' },
        { keywords: ['BESCOM'], name: 'Electricity Bill (BESCOM)' },
        { keywords: ['MSEB'], name: 'Electricity Bill (MSEB)' },
        { keywords: ['IRCTC'], name: 'IRCTC Railway' },
        { keywords: ['INDIGO'], name: 'IndiGo Airlines' },
    ];

    for (const item of merchantMap) {
        if (item.keywords.some(kw => upper.includes(kw))) {
            return item.name;
        }
    }

    // 2. Structural UPI / Banking noise cleanup
    let cleaned = raw;

    // Remove UPI prefixes like UPI/DR/123456/MERCHANT/ICIC/user@icici
    cleaned = cleaned.replace(/^(TO TRANSFER-)?(BY TRANSFER-)?(UPI\/DR\/|UPI\/CR\/|UPI\/|POS |ECOM PUR\/|ACH D-|NEFT-|IMPS\/P2A\/|IMPS-|ATM WDL\/|INF\/INB\/|INF\/|CMS\/|CHQ WDL\/|DR\/)/i, '');

    // Remove reference numbers & numbers like 1234567890
    cleaned = cleaned.replace(/\b\d{6,14}\b/g, '');

    // Remove UPI handle endings like @icici, @okaxis, @ybl, @paytm, @hdfcbank
    cleaned = cleaned.replace(/@[a-zA-Z0-9_-]+/g, '');

    // Remove bank codes / location suffixes e.g., /ICIC, /HDFC, /PAYTM, BANGALORE IN, etc.
    cleaned = cleaned.replace(/\/(ICIC|HDFC|PAYTM|AXIS|UTIB|SBIN|BARB|CNRB|PUNB|IOBA|YESB|IDFB|CITI)\b/gi, '');

    // Replace slashes, hyphens, underscores with spaces
    cleaned = cleaned.replace(/[\/\\_\-]+/g, ' ');

    // Clean multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    if (!cleaned || cleaned.length < 2) {
        return raw;
    }

    // Format Title Case
    return cleaned
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function parseCsvRows(csvText: string): string[][] {
    const lines = csvText.split(/\r?\n/);
    const rows: string[][] = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const cells: string[] = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === char) {
                    currentCell += char;
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(currentCell.trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        cells.push(currentCell.trim());

        if (cells.some(c => c.length > 0)) {
            rows.push(cells);
        }
    }

    return rows;
}

function cleanAmount(valStr: string): number {
    if (!valStr) return 0;
    // Remove currency symbols, commas, spaces, DR, CR, minus signs
    const cleaned = valStr.replace(/[^0-9.]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

export function parseBankStatementCsv(csvContent: string): ParsedBankTransaction[] {
    const rows = parseCsvRows(csvContent);
    if (rows.length === 0) return [];

    let headerIndex = -1;
    let dateCol = -1;
    let descCol = -1;
    let debitCol = -1;
    let creditCol = -1;
    let amountCol = -1;
    let typeCol = -1;

    // Search for header row containing date and amount/debit indicators
    for (let i = 0; i < rows.length; i++) {
        const rowLower = rows[i].map(c => c.toLowerCase());

        const hasDate = rowLower.some(c =>
            c.includes('date') || c === 'dt' || c.includes('txn date') || c.includes('value date')
        );

        const hasDebitOrAmount = rowLower.some(c =>
            c.includes('debit') || c.includes('withdrawal') || c === 'dr' || c.includes('outflow') || c.includes('amount') || c.includes('particulars') || c.includes('narration')
        );

        if (hasDate && hasDebitOrAmount) {
            headerIndex = i;
            rowLower.forEach((cell, colIdx) => {
                if (dateCol === -1 && (cell.includes('date') || cell === 'dt' || cell.includes('txn date'))) {
                    dateCol = colIdx;
                }
                if (descCol === -1 && (cell.includes('narration') || cell.includes('particulars') || cell.includes('description') || cell.includes('remarks') || cell.includes('details') || cell.includes('summary'))) {
                    descCol = colIdx;
                }
                if (debitCol === -1 && (cell.includes('debit') || cell.includes('withdrawal') || cell === 'dr' || cell.includes('amount(dr)'))) {
                    debitCol = colIdx;
                }
                if (creditCol === -1 && (cell.includes('credit') || cell.includes('deposit') || cell === 'cr' || cell.includes('amount(cr)'))) {
                    creditCol = colIdx;
                }
                if (amountCol === -1 && (cell === 'amount' || cell.includes('txn amount') || cell.includes('transaction amount'))) {
                    amountCol = colIdx;
                }
                if (typeCol === -1 && (cell.includes('type') || cell.includes('cr/dr') || cell.includes('drcr'))) {
                    typeCol = colIdx;
                }
            });
            break;
        }
    }

    if (headerIndex === -1) {
        // Fallback: Assume first row is header or standard 0:Date, 1:Description, 2:Debit, 3:Credit
        headerIndex = 0;
        dateCol = 0;
        descCol = 1;
        debitCol = 2;
        creditCol = 3;
    }

    if (descCol === -1) descCol = 1;
    if (dateCol === -1) dateCol = 0;

    const parsedTransactions: ParsedBankTransaction[] = [];
    const timestamp = Date.now();

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0) continue;

        const rawDate = row[dateCol] || '';
        const rawNarrative = row[descCol] || '';

        // Ignore summary, opening balance, closing balance rows
        const combinedRowText = row.join(' ').toLowerCase();
        if (
            combinedRowText.includes('opening balance') ||
            combinedRowText.includes('closing balance') ||
            combinedRowText.includes('total debit') ||
            combinedRowText.includes('total credit') ||
            combinedRowText.includes('end of statement') ||
            combinedRowText.includes('statement summary')
        ) {
            continue;
        }

        if (!rawDate && !rawNarrative) continue;

        let debitAmount = 0;
        let isDebit = false;

        // 1. Check dedicated debit column
        if (debitCol !== -1 && row[debitCol]) {
            const val = cleanAmount(row[debitCol]);
            if (val > 0) {
                debitAmount = val;
                isDebit = true;
            }
        }

        // 2. Check if credit column has amount (if so, skip deposit)
        if (!isDebit && creditCol !== -1 && row[creditCol]) {
            const val = cleanAmount(row[creditCol]);
            if (val > 0) {
                // Deposit row, skip
                continue;
            }
        }

        // 3. Check general amount column
        if (!isDebit && amountCol !== -1 && row[amountCol]) {
            const rawAmtStr = row[amountCol].toUpperCase();
            const val = cleanAmount(rawAmtStr);

            if (typeCol !== -1 && row[typeCol]) {
                const typeStr = row[typeCol].toUpperCase();
                if (typeStr.includes('DR') || typeStr.includes('DEBIT') || typeStr.includes('WITHDRAWAL')) {
                    debitAmount = val;
                    isDebit = true;
                } else if (typeStr.includes('CR') || typeStr.includes('CREDIT') || typeStr.includes('DEPOSIT')) {
                    continue; // deposit
                }
            } else {
                // Check string flags like DR, CR, or negative amount
                if (rawAmtStr.includes('CR') || rawAmtStr.startsWith('+')) {
                    continue; // deposit
                } else if (rawAmtStr.includes('DR') || rawAmtStr.startsWith('-') || debitCol === -1) {
                    if (val > 0) {
                        debitAmount = val;
                        isDebit = true;
                    }
                }
            }
        }

        if (!isDebit || debitAmount <= 0) continue;

        const parsedDate = safeParseDate(rawDate);
        const cleanedDesc = cleanIndianBankNarration(rawNarrative);
        const category = getItemCategory(cleanedDesc) || getItemCategory(rawNarrative) || 'Other';

        parsedTransactions.push({
            id: `bank-${timestamp}-${i}-${Math.floor(Math.random() * 10000)}`,
            date: parsedDate,
            description: cleanedDesc,
            amount: parseFloat(debitAmount.toFixed(2)),
            category,
            selected: true,
            rawNarrative,
        });
    }

    return parsedTransactions;
}
