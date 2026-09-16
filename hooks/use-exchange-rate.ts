import { useState, useEffect } from 'react';
import { getFallbackRate } from '@/utils/expense-parser';

const rateCache: Record<string, { rate: number; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

export function useExchangeRate(fromCode: string = 'INR', toCode: string = 'INR'): number {
    const initialFallback = getFallbackRate(fromCode, toCode);
    const [rate, setRate] = useState<number>(initialFallback);

    useEffect(() => {
        if (!fromCode || !toCode || fromCode === toCode) {
            setRate(1.0);
            return;
        }

        const cacheKey = `${fromCode}_${toCode}`;
        const cached = rateCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setRate(cached.rate);
            return;
        }

        let isMounted = true;
        fetch(`https://api.frankfurter.app/latest?from=${fromCode}&to=${toCode}`)
            .then(res => {
                if (!res.ok) throw new Error('API network response was not ok');
                return res.json();
            })
            .then(data => {
                const fetchedRate = data.rates?.[toCode];
                if (fetchedRate && isMounted) {
                    rateCache[cacheKey] = { rate: fetchedRate, timestamp: Date.now() };
                    setRate(fetchedRate);
                }
            })
            .catch(err => {
                console.warn(`Frankfurter rate fetch error (${fromCode}->${toCode}), using fallback multiplier:`, err);
                if (isMounted) {
                    setRate(getFallbackRate(fromCode, toCode));
                }
            });

        return () => {
            isMounted = false;
        };
    }, [fromCode, toCode]);

    return rate;
}
