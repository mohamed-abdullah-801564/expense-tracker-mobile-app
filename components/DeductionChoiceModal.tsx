import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { Calculator, Minus, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface DeductionChoiceModalProps {
    isVisible: boolean;
    onClose: () => void;
    onDeductExpenses: () => void;
    onKeepFull: () => void;
    totalExpenses: number;
    budgetAmount: number;
}

export function DeductionChoiceModal({
    isVisible,
    onClose,
    onDeductExpenses,
    onKeepFull,
    totalExpenses,
    budgetAmount,
}: DeductionChoiceModalProps) {
    const { colors } = useTheme();
    const remainingAfterDeduction = budgetAmount - totalExpenses;

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContentContainer}
                        showsVerticalScrollIndicator={true}
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Budget Setup</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            Do you want to deduct the existing expenses from your new budget amount, or keep the full new budget amount?
                        </Text>

                        <View style={[styles.calculationInfo, { backgroundColor: colors.background }]}>
                            <Text style={[styles.calculationText, { color: colors.text }]}>
                                New Budget: ₹{budgetAmount.toFixed(2)}
                            </Text>
                            <Text style={[styles.calculationText, { color: colors.text }]}>
                                Existing Expenses: ₹{totalExpenses.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.deductButton]}
                                onPress={onDeductExpenses}
                            >
                                <Minus size={20} color="white" />
                                <View style={styles.buttonContent}>
                                    <Text style={styles.deductButtonText}>
                                        Deduct Expenses
                                    </Text>
                                    <Text style={styles.buttonSubtext}>
                                        Remaining: ₹{remainingAfterDeduction.toFixed(2)}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.keepButton]}
                                onPress={onKeepFull}
                            >
                                <Calculator size={20} color="white" />
                                <View style={styles.buttonContent}>
                                    <Text style={styles.keepButtonText}>
                                        Keep Full Amount
                                    </Text>
                                    <Text style={styles.buttonSubtext}>
                                        Balance: ₹{budgetAmount.toFixed(2)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    closeButton: {
        padding: 4,
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    calculationInfo: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    calculationText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
        textAlign: 'center',
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
    },
    buttonContent: {
        flex: 1,
    },
    deductButton: {
        backgroundColor: '#EF4444',
    },
    keepButton: {
        backgroundColor: '#10B981',
    },
    deductButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginBottom: 2,
    },
    keepButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginBottom: 2,
    },
    buttonSubtext: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
});