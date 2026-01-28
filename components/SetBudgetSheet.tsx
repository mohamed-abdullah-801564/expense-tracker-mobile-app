import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, Target } from 'lucide-react-native';
import { parseBudgetWithAI } from '@/utils/budget-parser';
import { validateAmount } from '@/utils/expense-parser';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
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
    const { setBudgetData, budgetProgress, stats, allExpenses } = useExpenses();
    const { colors } = useTheme();

    const handleSetBudget = async () => {
        if (!input.trim()) {
            Alert.alert('Error', 'Please enter your budget details');
            return;
        }

        setIsLoading(true);
        try {
            const parsed = await parseBudgetWithAI(input);

            const validation = validateAmount(parsed.budget_amount);
            if (!validation.valid) {
                Alert.alert('Invalid Amount', validation.error || 'Please enter a valid budget amount');
                setIsLoading(false);
                return;
            }

            setPendingBudget({ amount: parsed.budget_amount, days: parsed.budget_days });

            if (allExpenses.length > 0) {
                setShowDeductionChoice(true);
            } else {
                setBudgetData(parsed.budget_amount, parsed.budget_days, 'replace', false);
                setInput('');
                onClose();
                Alert.alert('Success', `Budget set successfully!`);
            }
        } catch (error) {
            console.error('Error setting budget:', error);
            Alert.alert('Error', 'Failed to set budget. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeductionChoice = (deductExpenses: boolean) => {
        if (pendingBudget) {
            setBudgetData(pendingBudget.amount, pendingBudget.days, 'replace', deductExpenses);
            setInput('');
            setPendingBudget(null);
            setShowDeductionChoice(false);
            onClose();
            Alert.alert('Success', `Budget set successfully!`);
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
                                <Text style={[styles.title, { color: colors.text }]}>Set Budget</Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {budgetProgress && (
                            <View style={[styles.currentBudget, { backgroundColor: colors.background }]}>
                                <Text style={[styles.currentBudgetTitle, { color: colors.textSecondary }]}>Current Budget</Text>
                                <Text style={[styles.currentBudgetAmount, { color: colors.text }]}>₹{budgetProgress.budget.amount}</Text>
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
                                    ₹{budgetProgress.totalSpent} / ₹{budgetProgress.budget.amount} spent
                                </Text>
                            </View>
                        )}

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.text }]}>Budget Details</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={input}
                                onChangeText={setInput}
                                placeholder="e.g., I want to set a budget of 4000 rupees for 1 week"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                Examples:{'\n'}
                                • &ldquo;Budget 5000 for 2 weeks&rdquo;{'\n'}
                                • &ldquo;Set spending limit to 3000 for 10 days&rdquo;{'\n'}
                                • &ldquo;My budget is 4500 for 1 month&rdquo;
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                            onPress={handleSetBudget}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>
                                {isLoading ? 'Processing...' : budgetProgress?.budget ? 'Update Budget' : 'Set Budget'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <DeductionChoiceModal
                isVisible={showDeductionChoice}
                onClose={() => setShowDeductionChoice(false)}
                onDeductExpenses={() => handleDeductionChoice(true)}
                onKeepFull={() => handleDeductionChoice(false)}
                totalExpenses={stats.total}
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
});