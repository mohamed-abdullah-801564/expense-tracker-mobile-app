import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { Plus, RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface BudgetChoiceModalProps {
    isVisible: boolean;
    onClose: () => void;
    onAddToBudget: () => void;
    onReplaceBudget: () => void;
    currentBudget?: number;
    newAmount: number;
}

export function BudgetChoiceModal({
    isVisible,
    onClose,
    onAddToBudget,
    onReplaceBudget,
    currentBudget,
    newAmount,
}: BudgetChoiceModalProps) {
    const { colors } = useTheme();

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
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollContentContainer}
                        showsVerticalScrollIndicator={true}
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Update Budget</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            How would you like to update your budget?
                        </Text>

                        {currentBudget && (
                            <View style={[styles.budgetInfo, { backgroundColor: colors.background }]}>
                                <Text style={[styles.budgetInfoText, { color: colors.text }]}>
                                    Current Budget: ₹{currentBudget.toFixed(2)}
                                </Text>
                                <Text style={[styles.budgetInfoText, { color: colors.text }]}>
                                    New Amount: ₹{newAmount.toFixed(2)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.addButton, { backgroundColor: colors.success }]}
                                onPress={onAddToBudget}
                            >
                                <Plus size={20} color="white" />
                                <Text style={styles.addButtonText}>
                                    Add to Existing
                                </Text>
                                {currentBudget && (
                                    <Text style={styles.buttonSubtext}>
                                        Total: ₹{(currentBudget + newAmount).toFixed(2)}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.replaceButton, { backgroundColor: colors.primary }]}
                                onPress={onReplaceBudget}
                            >
                                <RefreshCw size={20} color="white" />
                                <Text style={styles.replaceButtonText}>
                                    Replace Total
                                </Text>
                                <Text style={styles.buttonSubtext}>
                                    New Total: ₹{newAmount.toFixed(2)}
                                </Text>
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
    budgetInfo: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    budgetInfoText: {
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
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    addButton: {
        backgroundColor: '#10B981',
    },
    replaceButton: {
        backgroundColor: '#4F46E5',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    replaceButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    buttonSubtext: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 8,
    },
    scrollContent: {
        maxHeight: '80%',
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
});