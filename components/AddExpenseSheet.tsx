import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useSplitExpenses } from '@/hooks/split-expense-store';
import { useTheme } from '@/hooks/theme-store';
import { parseExpenseWithAI, validateAmount } from '@/utils/expense-parser';
import { parseSplitExpense, createSplitExpenses, parseDebt } from '@/utils/split-expense-parser';
import { SplitExpense } from '@/types/expense';


interface AddExpenseSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function AddExpenseSheet({ visible, onClose }: AddExpenseSheetProps) {
    const [input, setInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const { addExpense } = useExpenses();
    const { addSplitExpenses } = useSplitExpenses();
    const { colors } = useTheme();

    const handleSubmit = async () => {
        if (!input.trim()) {
            Alert.alert('Error', 'Please enter an expense description');
            return;
        }

        // Check for Debt (Lend/Borrow)
        const debtData = parseDebt(input);
        if (debtData) {
            const expenseDate = new Date().toISOString();
            const expenseId = Date.now().toString();

            const newSplit: SplitExpense = {
                id: `${expenseId}_${debtData.type}`,
                expenseId,
                friendName: debtData.friendName,
                amount: debtData.amount,
                description: debtData.description,
                category: 'Other',
                date: expenseDate,
                isPaid: false,
                createdAt: expenseDate,
                type: debtData.type,
            };

            addSplitExpenses([newSplit]);

            if (debtData.type === 'lend') {
                // Lending is NOT added to expenses, only Friends tab
                Alert.alert("Lending Recorded", "Tracked in Friends tab.");
            } else {
                // Borrowing
                Alert.alert("Borrowing Recorded", "Tracked in Friends tab.");
            }

            setInput('');
            onClose();
            return;
        }

        setIsParsing(true);
        try {
            const parsed = await parseExpenseWithAI(input);

            if (!parsed.amount || isNaN(parsed.amount) || parsed.amount === 0) {
                Alert.alert('Missing Amount', "Please mention the price (e.g., 'Coffee 50')");
                setIsParsing(false);
                return;
            }

            const validation = validateAmount(parsed.amount);
            if (!validation.valid) {
                Alert.alert('Invalid Amount', validation.error || 'Please enter a valid amount');
                setIsParsing(false);
                return;
            }

            const expenseDate = new Date().toISOString();
            const expenseId = Date.now().toString();

            const splitData = parseSplitExpense(input);
            let userAmount = parsed.amount;

            if (splitData) {
                // If it's a split expense, the user's personal expense is only their share.
                // splitData.amountPerPerson is the amount EACH person pays (including user).
                // However, splitData usually calculates this as total / count.
                // We should ensure we subtract what OTHERS owe.

                // Total Amount - (Friends Count * Amount Per Person) = User's Share
                // OR simply Amount Per Person if it divides evenly.
                // Let's rely on the splitData logic which mirrors the split parser.

                const totalFriendsShare = splitData.amountPerPerson * (splitData.splitCount - 1);
                userAmount = parsed.amount - totalFriendsShare;
            }

            addExpense({
                ...parsed,
                amount: userAmount, // Use the user's share for their personal tracking
                date: expenseDate,
            });

            if (splitData) {
                const splits = createSplitExpenses(splitData, expenseId, expenseDate, splitData.friendNames);
                addSplitExpenses(splits);
                Alert.alert(
                    'Split Expense Added',
                    `Expense split among ${splitData.splitCount} people. ${splitData.splitCount - 1} friend(s) owe ₹${splitData.amountPerPerson.toFixed(2)} each.`,
                    [{ text: 'OK' }]
                );
            }

            setInput('');
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to parse expense. Please try again.');
            console.error('Error parsing expense:', error);
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Add Expense</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                    >
                        <Text style={[styles.label, { color: colors.text }]}>
                            Describe your expense naturally
                        </Text>
                        <Text style={[styles.hint, { color: colors.textSecondary }]}>
                            e.g., &quot;Coffee ₹50&quot;, &quot;Lunch 400 split 4 with John, Sarah, Mike&quot;, &quot;Dinner 600 split 2 with Alex&quot;
                        </Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="Enter expense..."
                            placeholderTextColor={colors.textSecondary}
                            value={input}
                            onChangeText={setInput}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            autoFocus
                            maxLength={500}
                        />

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }, isParsing && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={isParsing}
                        >
                            {isParsing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Add Expense</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.examples}>
                            <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>Quick Examples:</Text>
                            {[
                                'Lunch ₹150 at 1 PM',
                                'Dinner 400 split 4 with John, Sarah, Mike',
                                'Movie 300 split 2 with Alex',
                                'Coffee ₹50 morning',
                                'Borrowed 500 from Ram',
                                'Lent 200 to Sam'
                            ].map((example, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.exampleChip, { backgroundColor: colors.background }]}
                                    onPress={() => setInput(example)}
                                >
                                    <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{example}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    hint: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        backgroundColor: '#F9FAFB',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    examples: {
        gap: 8,
    },
    examplesTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    exampleChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    exampleText: {
        fontSize: 14,
        color: '#4B5563',
    },
    scrollContent: {
        maxHeight: '100%',
    },
    scrollContentContainer: {
        paddingBottom: 20,
        flexGrow: 1,
    },
});