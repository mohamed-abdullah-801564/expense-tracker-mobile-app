import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    DeviceEventEmitter,
} from 'react-native';
import { Bot, Send } from 'lucide-react-native';

import { useExpenses } from '@/hooks/expense-store';
import { useSplitExpenses } from '@/hooks/split-expense-store';
import { useTheme } from '@/hooks/theme-store';
import { askGeminiAssistant } from '@/utils/ai-chat';

type ChatMessage = {
    role: 'user' | 'ai';
    text: string;
};

export function FloatingAIAssistant() {
    const { allExpenses, budgetProgress, budgetHistory, isAiModalVisible: visible, toggleAiModal: setVisible } = useExpenses();
    const { friendSummaries } = useSplitExpenses();
    const { colors } = useTheme();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMessages((prev) => {
            if (prev.length > 0) {
                return prev;
            }

            return [
                {
                    role: 'ai',
                    text: "👋 Hi! I'm your financial AI. Ask me anything about your expenses or budget.",
                },
            ];
        });
    }, []);

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const contextData = {
                expenses: allExpenses,
                budget: budgetProgress,
                budgetHistory: budgetHistory,
                friends: friendSummaries,
            };

            const aiResponse = await askGeminiAssistant(trimmed, contextData);
            const aiMessage: ChatMessage = { role: 'ai', text: aiResponse };
            setMessages((prev) => [...prev, aiMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [allExpenses, budgetProgress, friendSummaries, input, isLoading]);

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setVisible()}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <SafeAreaView style={{ flex: 1 }}>
                            <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <Bot size={20} color={colors.primary} />
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    AI Financial Assistant
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setVisible()} style={styles.closeButton}>
                                <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <KeyboardAvoidingView
                            style={styles.modalBody}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                        >
                            <ScrollView
                                style={styles.messagesContainer}
                                contentContainerStyle={styles.messagesContent}
                            >
                                {messages.map((message, index) => (
                                    <View
                                        key={`${message.role}-${index}`}
                                        style={[
                                            styles.messageBubble,
                                            message.role === 'user'
                                                ? [
                                                    styles.userBubble,
                                                    { backgroundColor: colors.primary },
                                                ]
                                                : [
                                                    styles.aiBubble,
                                                    { backgroundColor: colors.background },
                                                ],
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                message.role === 'user'
                                                    ? { color: colors.surface }
                                                    : { color: colors.text },
                                            ]}
                                        >
                                            {message.text}
                                        </Text>
                                    </View>
                                ))}
                                {isLoading && (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
                                            Thinking about your finances...
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={input}
                                    onChangeText={setInput}
                                    placeholder="Ask about your expenses or budget..."
                                    placeholderTextColor={colors.textSecondary}
                                    selectionColor={colors.primary}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.sendButton,
                                        {
                                            backgroundColor:
                                                input.trim().length === 0 || isLoading
                                                    ? colors.border
                                                    : colors.primary,
                                        },
                                    ]}
                                    onPress={handleSend}
                                    disabled={input.trim().length === 0 || isLoading}
                                >
                                    <Send
                                        size={20}
                                        color={
                                            input.trim().length === 0 || isLoading
                                                ? colors.textSecondary
                                                : colors.surface
                                        }
                                    />
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                        </SafeAreaView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 8,
        height: '90%',
        marginBottom: Platform.OS === 'ios' ? 20 : 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    closeButtonText: {
        fontSize: 14,
    },
    modalBody: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingBottom: 12,
        gap: 8,
    },
    messageBubble: {
        maxWidth: '80%',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
    },
    aiBubble: {
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 14,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
    },
    loadingLabel: {
        fontSize: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 8,
        paddingBottom: 20,
        borderTopWidth: 1,
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 48,
        maxHeight: 100,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.03)',
        fontSize: 14,
    },
    sendButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    },
});

