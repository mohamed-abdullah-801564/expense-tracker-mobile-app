import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import { Bot, Send } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { handleExpenseHistoryQuery } from '@/utils/expense-history-ai';

export function ExpenseHistoryDemo() {
    const { allExpenses } = useExpenses();
    const [userInput, setUserInput] = useState('');
    const [response, setResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleQuery = () => {
        if (!userInput.trim()) return;

        setIsProcessing(true);
        try {
            const result = handleExpenseHistoryQuery(allExpenses, userInput);
            setResponse(result);
        } catch (error) {
            setResponse(`Error processing query: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const quickFilters = ['This Month', 'Total Expenses'];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Bot size={24} color="#4F46E5" />
                <Text style={styles.headerTitle}>AI Expense History Assistant</Text>
            </View>

            <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Ask about your expense history:</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={userInput}
                        onChangeText={setUserInput}
                        placeholder="e.g., 'Show me this month's expenses' or 'Total expenses'"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]}
                        onPress={handleQuery}
                        disabled={isProcessing || !userInput.trim()}
                    >
                        <Send size={20} color={isProcessing ? '#9CA3AF' : 'white'} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.quickFiltersSection}>
                <Text style={styles.quickFiltersLabel}>Quick filters:</Text>
                <View style={styles.quickFiltersRow}>
                    {quickFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={styles.quickFilterButton}
                            onPress={() => setUserInput(filter)}
                        >
                            <Text style={styles.quickFilterText}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {response && (
                <View style={styles.responseSection}>
                    <Text style={styles.responseLabel}>AI Response:</Text>
                    <ScrollView style={styles.responseContainer}>
                        <Text style={styles.responseText}>{response}</Text>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        maxHeight: 100,
        textAlignVertical: 'top',
    },
    sendButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    quickFiltersSection: {
        marginBottom: 16,
    },
    quickFiltersLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    quickFiltersRow: {
        flexDirection: 'row',
        gap: 8,
    },
    quickFilterButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quickFilterText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    responseSection: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    responseLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    responseContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        maxHeight: 200,
    },
    responseText: {
        fontSize: 12,
        color: '#374151',
        fontFamily: 'monospace',
    },
});