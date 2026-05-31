import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Expense } from '@/types/expense';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { currencies } from '@/constants/currencies';
import { getFallbackRate } from '@/utils/expense-parser';

interface ExpenseCardProps {
    expense: Expense;
}

// Global cache for exchange rates to prevent multiple requests while scrolling
const exchangeRateCache: Record<string, { rate: number; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL

const getSymbolFromCode = (code: string) => {
    const matched = currencies.find(c => c.currencyCode === code);
    return matched ? matched.currencySymbol : code;
};

export function ExpenseCard({ expense }: ExpenseCardProps) {
    const { deleteExpense } = useExpenses();
    const { colors, currencyCode, homeCurrencyCode } = useTheme();
    const styles = createStyles(colors);
    
    const iconName = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other'];
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<any>;
    const categoryColor = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Other'];

    const targetRemittanceCode = expense.remittanceCode || homeCurrencyCode;
    
    const [exchangeRate, setExchangeRate] = React.useState<number>(() => {
        const cacheKey = `${currencyCode}_${targetRemittanceCode}`;
        const cached = exchangeRateCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.rate;
        }
        return getFallbackRate(currencyCode, targetRemittanceCode);
    });

    React.useEffect(() => {
        if (!expense.isRemittance) return;
        // If we already have historical frozen values, skip fetching
        if (expense.historicalConvertedAmount !== undefined && expense.historicalHomeSymbol !== undefined) return;
        
        const cacheKey = `${currencyCode}_${targetRemittanceCode}`;
        const cached = exchangeRateCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setExchangeRate(cached.rate);
            return;
        }

        let isMounted = true;
        fetch(`https://api.frankfurter.app/latest?from=${currencyCode}&to=${targetRemittanceCode}`)
            .then(res => {
                if (!res.ok) throw new Error('API error');
                return res.json();
            })
            .then(data => {
                const rate = data.rates[targetRemittanceCode];
                if (rate && isMounted) {
                    exchangeRateCache[cacheKey] = {
                        rate,
                        timestamp: Date.now()
                    };
                    setExchangeRate(rate);
                }
            })
            .catch(err => {
                console.warn('Failed to fetch exchange rate, using fallback multiplier:', err);
                if (isMounted) {
                    const fallback = getFallbackRate(currencyCode, targetRemittanceCode);
                    setExchangeRate(fallback);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [expense.isRemittance, currencyCode, targetRemittanceCode, homeCurrencyCode, expense.historicalConvertedAmount, expense.historicalHomeSymbol]);

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteExpense(expense.id)
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calculate final display conversion values using locked snapshot OR active dynamic rate
    let displayHomeSymbol = expense.historicalHomeSymbol;
    let displayConvertedAmount = expense.historicalConvertedAmount !== undefined 
        ? expense.historicalConvertedAmount.toFixed(2) 
        : undefined;

    if (expense.isRemittance && (displayHomeSymbol === undefined || displayConvertedAmount === undefined)) {
        displayHomeSymbol = getSymbolFromCode(targetRemittanceCode);
        displayConvertedAmount = (expense.amount * exchangeRate).toFixed(2);
    }

    return (
        <TouchableOpacity
            style={styles.container}
            onLongPress={handleDelete}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
                <IconComponent size={24} color={categoryColor} />
            </View>

            <View style={styles.content}>
                <Text style={styles.description} numberOfLines={1}>
                    {expense.description}
                </Text>

                {(!!expense.shared_amount || !!expense.paid_to || !!expense.note) && (
                    <View style={styles.extraInfo}>
                        {!!expense.shared_amount && (
                            <View style={styles.sharedInfo}>
                                <LucideIcons.Users size={12} color="#10B981" />
                                <Text style={styles.sharedText}>{expense.shared_amount.toFixed(2)} shared</Text>
                                <LucideIcons.ArrowRight size={12} color="#F59E0B" />
                                <Text style={styles.paymentText}>Paid to {expense.paid_to}</Text>
                            </View>
                        )}
                        {expense.note && (
                            <Text style={styles.noteText}>{expense.note}</Text>
                        )}
                    </View>
                )}

                {expense.isRemittance && (
                    <View style={styles.remittanceContainer}>
                        <Text style={styles.date}>{formatDate(expense.date)}</Text>
                        <Text style={styles.remittanceSubtext}>
                            ≈ {displayHomeSymbol}{displayConvertedAmount} sent home
                        </Text>
                    </View>
                )}

                <View style={styles.metaContainer}>
                    <Text style={[styles.category, { color: categoryColor }]}>
                        {expense.category}
                    </Text>
                    {!expense.isRemittance && <Text style={styles.date}>{formatDate(expense.date)}</Text>}
                    {expense.time && (
                        <Text style={styles.time}>{expense.time}</Text>
                    )}
                </View>
            </View>

            <View style={styles.amountContainer}>
                <Text style={styles.amount}>{colors.currencySymbol}{expense.amount.toFixed(2)}</Text>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    description: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    category: {
        fontSize: 12,
        fontWeight: '500',
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    time: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    amountContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    amount: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    remittanceContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginVertical: 4,
        gap: 2,
    },
    remittanceSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    extraInfo: {
        marginVertical: 4,
        gap: 2,
    },
    sharedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sharedText: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '500',
    },
    paymentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    paymentText: {
        fontSize: 11,
        color: '#F59E0B',
        fontWeight: '500',
    },
    noteText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
});