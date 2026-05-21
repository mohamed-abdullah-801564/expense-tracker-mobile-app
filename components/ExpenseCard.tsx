import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Expense } from '@/types/expense';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';

interface ExpenseCardProps {
    expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
    const { deleteExpense } = useExpenses();
    const { colors } = useTheme();
    const styles = createStyles(colors);
    
    const iconName = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other'];
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<any>;
    const categoryColor = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Other'];

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

                <View style={styles.metaContainer}>
                    <Text style={[styles.category, { color: categoryColor }]}>
                        {expense.category}
                    </Text>
                    <Text style={styles.date}>{formatDate(expense.date)}</Text>
                    {expense.time && (
                        <Text style={styles.time}>{expense.time}</Text>
                    )}
                </View>
            </View>

            <Text style={styles.amount}>₹{expense.amount.toFixed(2)}</Text>
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
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
    amount: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
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