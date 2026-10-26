import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { Target, AlertTriangle, CheckCircle, Clock, Plus, X } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { useExchangeRate } from '@/hooks/use-exchange-rate';

interface BudgetCardProps {
    onSetBudget: () => void;
}

export default function BudgetCard({ onSetBudget }: BudgetCardProps) {
    const { budgetProgress, clearBudget, setBudgetData, dashboardMode } = useExpenses();
    const { colors } = useTheme();
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const styles = createStyles(colors);
    const isIncome = dashboardMode === 'income';

    const handleTopUp = () => {
        const inputAmount = parseFloat(topUpAmount);
        if (!topUpAmount || isNaN(inputAmount) || inputAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount greater than zero.");
            return;
        }

        const days = budgetProgress?.budget?.days ?? 0;
        setBudgetData(inputAmount, days, 'add');

        setShowTopUp(false);
        setTopUpAmount('');
        Alert.alert("Success", isIncome ? "Income updated successfully!" : "Budget updated successfully!");
    };

    if (!budgetProgress) {
        return (
            <TouchableOpacity style={styles.noBudgetCard} onPress={onSetBudget}>
                <Target size={24} color={colors.primary} />
                <Text style={styles.noBudgetTitle}>
                    {isIncome ? 'Set Monthly Income' : 'Set Your Budget'}
                </Text>
                <Text style={styles.noBudgetSubtitle}>
                    {isIncome
                        ? 'Track salary, expenses, and monthly savings'
                        : 'Track your spending against a budget goal'}
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
            return isIncome ? 'Month Ended' : 'Budget Expired';
        }
        if (budgetProgress.isOverBudget) {
            return isIncome ? 'In Deficit' : 'Over Budget';
        }
        return isIncome ? 'Healthy Savings' : 'On Track';
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

    const dailyLimit = budgetProgress.daysRemaining > 0
        ? Math.max(0, budgetProgress.remaining) / budgetProgress.daysRemaining
        : 0;

    const convertedRemaining = budgetProgress.remaining;
    const isDeficit = convertedRemaining < 0;
    const convertedTotalAmount = budgetProgress.budget.amount;
    const convertedDailyLimit = dailyLimit;

    const handleClearBudget = () => {
        Alert.alert(
            isIncome ? "Reset Income" : "Clear Budget",
            isIncome
                ? "Are you sure you want to reset the current income and period?"
                : "Are you sure you want to delete the current budget?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: isIncome ? "Reset" : "Clear",
                    style: "destructive",
                    onPress: clearBudget
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Target size={18} color={colors.primary} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>
                        {isIncome ? 'Monthly Cash Flow' : 'Budget Progress'}
                    </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: getStatusColor() + '20' }]}>
                    {getStatusIcon()}
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                <Text style={[styles.remainingAmount, { color: isDeficit ? colors.error : colors.text }]}>
                    {isDeficit ? '-' : ''}{colors.currencySymbol}{Math.abs(convertedRemaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>

                <View style={styles.totalRow}>
                    <Text style={styles.totalText}>
                        of {colors.currencySymbol}{convertedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isIncome ? 'income' : 'total'}
                    </Text>
                    <TouchableOpacity onPress={() => setShowTopUp(true)} style={styles.topUpButton}>
                        <Plus size={14} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${Math.min(budgetProgress.percentageUsed, 100)}%`,
                                backgroundColor: budgetProgress.isOverBudget ? colors.error : colors.primary
                            }
                        ]}
                    />
                </View>
            </View>

            {/* Footer Info */}
            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Text style={[styles.footerHighlight, { color: colors.primary }]}>
                        {colors.currencySymbol}{convertedDailyLimit.toFixed(0)}
                        <Text style={styles.footerLabel}>{isIncome ? '/day safe spend' : '/day limit'}</Text>
                    </Text>
                </View>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>
                        {budgetProgress.isExpired ? 'Ended' : `${budgetProgress.daysRemaining} days left`}
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.clearAction} onPress={handleClearBudget}>
                <Text style={[styles.clearActionText, { color: colors.textSecondary }]}>
                    {isIncome ? 'Reset Income' : 'Clear Budget'}
                </Text>
            </TouchableOpacity>

            {/* Top Up Modal */}
            <Modal
                visible={showTopUp}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTopUp(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {isIncome ? 'Add to Income' : 'Add to Budget'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowTopUp(false)}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            {isIncome
                                ? 'Increase your monthly income for the current period.'
                                : 'Increase your budget amount for the current period.'}
                        </Text>

                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            placeholder="Amount to add..."
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={topUpAmount}
                            onChangeText={setTopUpAmount}
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleTopUp}
                        >
                            <Text style={styles.saveButtonText}>{isIncome ? 'Add Income' : 'Add Amount'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    noBudgetCard: {
        backgroundColor: colors.background,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    noBudgetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    noBudgetSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    container: {
        backgroundColor: colors.card,
        borderRadius: 24,
        paddingVertical: 22,
        paddingHorizontal: 24,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        letterSpacing: 0.5,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    mainContent: {
        alignItems: 'center',
        marginBottom: 16,
    },
    remainingAmount: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    totalText: {
        fontSize: 15,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    topUpButton: {
        backgroundColor: colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBackground: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    footerHighlight: {
        fontSize: 16,
        fontWeight: '700',
    },
    footerLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    clearAction: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    clearActionText: {
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        maxWidth: 340,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalSubtitle: {
        fontSize: 15,
        marginBottom: 24,
        lineHeight: 22,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 18,
        marginBottom: 24,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});