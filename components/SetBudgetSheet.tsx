import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { X, Target } from 'lucide-react-native';
import { parseBudgetWithAI } from '@/utils/budget-parser';
import { validateAmount } from '@/utils/expense-parser';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { DeductionChoiceModal } from '@/components/DeductionChoiceModal';

interface SetBudgetSheetProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function SetBudgetSheet({ isVisible, onClose }: SetBudgetSheetProps) {
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showDeductionChoice, setShowDeductionChoice] = useState<boolean>(false);
    const [pendingBudget, setPendingBudget] = useState<{ amount: number; days: number } | null>(null);
    const { setBudgetData, budgetProgress, stats, allExpenses, dashboardMode } = useExpenses();
    const { colors } = useTheme();
    const isIncome = dashboardMode === 'income';
    const [autoRenew, setAutoRenew] = useState<boolean>(
        budgetProgress?.budget?.autoRenew ?? (isIncome ? true : false)
    );

    useEffect(() => {
        if (isVisible) {
            setAutoRenew(budgetProgress?.budget?.autoRenew ?? (isIncome ? true : false));
        }
    }, [isVisible, budgetProgress?.budget?.autoRenew, isIncome]);

    const relevantExpensesTotal = React.useMemo(() => {
        if (budgetProgress) return budgetProgress.totalSpent;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return allExpenses
            .filter(e => !e.isDeleted && new Date(e.date) >= today)
            .reduce((sum, e) => sum + e.amount, 0);
    }, [budgetProgress, allExpenses]);

    const handleSetBudget = async () => {
        if (!input.trim()) {
            Alert.alert('Error', isIncome ? 'Please enter your income details' : 'Please enter your budget details');
            return;
        }

        setIsLoading(true);
        try {
            const parsed = await parseBudgetWithAI(input, colors.currencySymbol);

            const validation = validateAmount(parsed.budget_amount, colors.currencySymbol);
            if (!validation.valid || isNaN(parsed.budget_amount) || parsed.budget_amount <= 0) {
                Alert.alert('Invalid Amount', validation.error || (isIncome ? 'Please enter a valid income amount' : 'Please enter a valid budget amount'));
                setIsLoading(false);
                return;
            }

            // Determine if this is strictly an add operation (intent + existing budget)
            const isAddOperation = (parsed.is_add_operation ?? false) && !!budgetProgress?.budget;

            // Strict Duration Check
            // If NOT an add operation, we MUST have a duration
            if (!isAddOperation && parsed.budget_days === null) {
                Alert.alert(
                    'Duration Missing',
                    isIncome
                        ? "Please specify the duration (e.g., '50000 for 1 month' or 'monthly salary 60000')."
                        : "Please specify the duration (e.g., '500 for 10 days' or '1000 for 1 month')."
                );
                setIsLoading(false);
                return;
            }

            // Keep amount directly in user's active primary currency
            const baseAmount = parsed.budget_amount;
            const daysToPass = parsed.budget_days ?? (budgetProgress?.budget.days || 30);

            setPendingBudget({ amount: baseAmount, days: daysToPass });

            if (isAddOperation) {
                // If adding to existing budget, skip deduction choice and just add
                setBudgetData(baseAmount, daysToPass, 'add', false, autoRenew);
                setInput('');
                onClose();
                Alert.alert(
                    'Success',
                    isIncome
                        ? `Income updated: Added ${colors.currencySymbol}${parsed.budget_amount} to current pool.`
                        : `Budget updated: Added ${colors.currencySymbol}${parsed.budget_amount} to current pool.`
                );
            } else if (relevantExpensesTotal > 0) {
                setShowDeductionChoice(true);
            } else {
                setBudgetData(baseAmount, daysToPass, 'replace', false, autoRenew);
                setInput('');
                onClose();
                Alert.alert('Success', isIncome ? 'Income set successfully!' : 'Budget set successfully!');
            }
        } catch (error) {
            console.error('Error setting budget/income:', error);
            Alert.alert('Error', isIncome ? 'Failed to set income. Please try again.' : 'Failed to set budget. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeductionChoice = (deductExpenses: boolean) => {
        if (pendingBudget) {
            setBudgetData(pendingBudget.amount, pendingBudget.days, 'replace', deductExpenses, autoRenew);
            setInput('');
            setPendingBudget(null);
            setShowDeductionChoice(false);
            onClose();
            Alert.alert('Success', isIncome ? 'Income set successfully!' : 'Budget set successfully!');
        }
    };

    const handleClose = () => {
        setInput('');
        setPendingBudget(null);
        setShowDeductionChoice(false);
        onClose();
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                    <ScrollView
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Target size={24} color={colors.primary} />
                                <Text style={[styles.title, { color: colors.text }]}>
                                    {isIncome ? 'Set Monthly Income' : 'Set Budget'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {budgetProgress && (
                            <View style={[styles.currentBudget, { backgroundColor: colors.background }]}>
                                <Text style={[styles.currentBudgetTitle, { color: colors.textSecondary }]}>
                                    {isIncome ? 'Current Monthly Income' : 'Current Budget'}
                                </Text>
                                <Text style={[styles.currentBudgetAmount, { color: colors.text }]}>
                                    {colors.currencySymbol}{budgetProgress.budget.amount.toFixed(2)}
                                </Text>
                                <Text style={[styles.currentBudgetDays, { color: colors.textSecondary }]}>
                                    {budgetProgress.daysRemaining} days remaining
                                </Text>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(budgetProgress.percentageUsed, 100)}%`,
                                                backgroundColor: budgetProgress.isOverBudget ? '#FF3B30' : '#34C759'
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                                    {isIncome
                                        ? `${colors.currencySymbol}${budgetProgress.totalSpent.toFixed(2)} spent of ${colors.currencySymbol}${budgetProgress.budget.amount.toFixed(2)} income`
                                        : `${colors.currencySymbol}${budgetProgress.totalSpent.toFixed(2)} / ${colors.currencySymbol}${budgetProgress.budget.amount.toFixed(2)} spent`}
                                </Text>
                            </View>
                        )}

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                {isIncome ? 'Income Details' : 'Budget Details'}
                            </Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={input}
                                onChangeText={setInput}
                                placeholder={isIncome ? "e.g., My monthly salary is 50,000 for 1 month" : "e.g., I want to set a budget of 4000 rupees for 1 week"}
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                {isIncome ? (
                                    <>
                                        Examples:{'\n'}
                                        • &ldquo;Salary is 60,000 per month&rdquo;{'\n'}
                                        • &ldquo;Monthly income 45000&rdquo;{'\n'}
                                        • &ldquo;Pocket money 10000 for 1 month&rdquo;
                                    </>
                                ) : (
                                    <>
                                        Examples:{'\n'}
                                        • &ldquo;Budget 5000 for 2 weeks&rdquo;{'\n'}
                                        • &ldquo;Set spending limit to 3000 for 10 days&rdquo;{'\n'}
                                        • &ldquo;My budget is 4500 for 1 month&rdquo;
                                    </>
                                )}
                            </Text>
                        </View>

                        {/* Auto Renew Toggle */}
                        <View style={[styles.autoRenewRow, { borderColor: colors.border }]}>
                            <View style={styles.autoRenewLeft}>
                                <Text style={[styles.autoRenewTitle, { color: colors.text }]}>Auto-renew every cycle</Text>
                                <Text style={[styles.autoRenewSubtitle, { color: colors.textSecondary }]}>
                                    {isIncome
                                        ? 'Automatically roll over monthly salary and cycle'
                                        : 'Automatically restart a fresh budget when this period ends'}
                                </Text>
                            </View>
                            <Switch
                                value={autoRenew}
                                onValueChange={setAutoRenew}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.surface}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                            onPress={handleSetBudget}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>
                                {isLoading ? 'Processing...' : budgetProgress?.budget ? (isIncome ? 'Update Income' : 'Update Budget') : (isIncome ? 'Set Income' : 'Set Budget')}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <DeductionChoiceModal
                isVisible={showDeductionChoice}
                asOverlay={true}
                onClose={() => setShowDeductionChoice(false)}
                onDeductExpenses={() => handleDeductionChoice(true)}
                onKeepFull={() => handleDeductionChoice(false)}
                totalExpenses={relevantExpensesTotal}
                budgetAmount={pendingBudget?.amount || 0}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginLeft: 8,
        color: '#000',
    },
    closeButton: {
        padding: 4,
    },
    currentBudget: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    currentBudgetTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    currentBudgetAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    currentBudgetDays: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E5E5EA',
        borderRadius: 4,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#F8F9FA',
        minHeight: 80,
    },
    hint: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        lineHeight: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#B0B0B0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        maxHeight: '80%',
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    autoRenewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderTopWidth: 1,
        marginBottom: 16,
    },
    autoRenewLeft: {
        flex: 1,
        paddingRight: 16,
    },
    autoRenewTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    autoRenewSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
});