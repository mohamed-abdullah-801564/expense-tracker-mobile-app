import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleSheet, StyleProp } from 'react-native';

// Module-level cache so animated values persist when navigating across tabs
const tickerCache: Record<string, number> = {};

export interface NumberTickerProps {
    value: number;
    tickerId?: string; // Unique key to remember value across tab switches
    initialValue?: number;
    duration?: number; // duration in ms, default 1800ms (smooth, relaxed ticker speed)
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
    style?: StyleProp<TextStyle>;
    formatThousands?: boolean;
}

export function NumberTicker({
    value,
    tickerId,
    initialValue,
    duration = 1800,
    decimalPlaces = 2,
    prefix = '',
    suffix = '',
    style,
    formatThousands = true,
}: NumberTickerProps) {
    // If tickerId is present and cached, start from the cached value to prevent re-counting
    const hasCache = tickerId !== undefined && tickerCache[tickerId] !== undefined;
    const cachedVal = hasCache ? tickerCache[tickerId] : (initialValue ?? 0);

    const [displayValue, setDisplayValue] = useState<number>(cachedVal);
    const prevValueRef = useRef<number>(cachedVal);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;

        // If already rendered this exact value, skip animation (no tab-switch re-trigger)
        if (startValue === endValue) {
            setDisplayValue(endValue);
            if (tickerId) {
                tickerCache[tickerId] = endValue;
            }
            return;
        }

        const startTime = Date.now();

        const updateNumber = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Gentle ease-out cubic curve: 1 - (1 - progress)^3
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startValue + (endValue - startValue) * easeOut;

            setDisplayValue(current);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(updateNumber);
            } else {
                setDisplayValue(endValue);
                prevValueRef.current = endValue;
                if (tickerId) {
                    tickerCache[tickerId] = endValue;
                }
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateNumber);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [value, duration, tickerId]);

    const formatted = formatThousands
        ? displayValue.toLocaleString(undefined, {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
          })
        : displayValue.toFixed(decimalPlaces);

    return (
        <Text style={[styles.text, style]}>
            {prefix}{formatted}{suffix}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        fontVariant: ['tabular-nums'],
    },
});

export default NumberTicker;
