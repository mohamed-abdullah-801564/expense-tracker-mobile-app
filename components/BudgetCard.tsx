import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Target, AlertTriangle, CheckCircle, Clock, History } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { BudgetHistory } from '@/components/BudgetHistory';

interface BudgetCardProps {
    onSetBudget: () => void;
}

export default function BudgetCard({ onSetBudget }: BudgetCardProps) {
    const { budgetProgress, clearBudget, budgetHistory } = useExpenses();
    const { colors } = useTheme();
    const [showHistory, setShowHistory] = useState(false);
    const styles = createStyles(colors);

    if (!budgetProgress) {
        return (
            <TouchableOpacity style={styles.noBudgetCard} onPress={onSetBudget}>
                <Target size={24} color={colors.primary} />
                <Text style={styles.noBudgetTitle}>Set Your Budget</Text>
                <Text style={styles.noBudgetSubtitle}>
                    Track your spending against a budget goal
                </Text>
            </TouchableOpacity>
        );
    }

    const getStatusIcon = () => {
        if (budgetProgress.isExpired) {
            return <Clock size={20} color={colors.warning} />;
        }
        if (budgetProgress.isOverBudget) {
            return <AlertTriangle size={20} color={colors.error} />;
        }
        return <CheckCircle size={20} color={colors.success} />;
    };

    const getStatusText = () => {
        if (budgetProgress.isExpired) {
            return 'Budget Expired';
        }
        if (budgetProgress.isOverBudget) {
            return 'Over Budget';
        }
        return 'On Track';
    };

    const getStatusColor = () => {
        if (budgetProgress.isExpired) {
            return colors.warning;
        }
        if (budgetProgress.isOverBudget) {
            return colors.error;
        }
        return colors.success;
    };

    return (
        <View style={styles.budgetCard}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Target size={20} color={colors.primary} />
                    <Text style={styles.title}>Budget Progress</Text>
                </View>
                <View style={styles.status}>
                    {getStatusIcon()}
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                </View>
            </View>

            <View style={styles.amounts}>
                <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Spent</Text>
                    <Text style={[styles.amountValue, { color: budgetProgress.isOverBudget ? colors.error : colors.text }]}>
                        ₹{budgetProgress.totalSpent.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Budget</Text>
                    <Text style={styles.amountValue}>
                        ₹{budgetProgress.budget.amount.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Remaining</Text>
                    <Text style={[styles.amountValue, { color: budgetProgress.remaining >= 0 ? colors.success : colors.error }]}>
                        ₹{budgetProgress.remaining.toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${Math.min(budgetProgress.percentageUsed, 100)}%`,
                                backgroundColor: budgetProgress.isOverBudget ? colors.error : colors.success
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {budgetProgress.percentageUsed.toFixed(1)}% used
                </Text>
            </View>

            <View style={styles.timeInfo}>
                <Text style={styles.timeText}>
                    {budgetProgress.isExpired
                        ? 'Budget period ended'
                        : `${budgetProgress.daysRemaining} days remaining`
                    }
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.updateButton} onPress={onSetBudget}>
                    <Text style={styles.updateButtonText}>Update Budget</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.historyButton} onPress={() => setShowHistory(true)}>
                    <History size={16} color={colors.primary} />
                    <Text style={styles.historyButtonText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={clearBudget}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showHistory}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <BudgetHistory
                    transactions={budgetHistory}
                    onClose={() => setShowHistory(false)}
                />
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    noBudgetCard: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    noBudgetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 8,
        marginBottom: 4,
    },
    noBudgetSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    budgetCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginLeft: 8,
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    amounts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    amountItem: {
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    progressSection: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timeInfo: {
        alignItems: 'center',
        marginBottom: 16,
    },
    timeText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    updateButton: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.primary + '20',
    },
    historyButtonText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    clearButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
});