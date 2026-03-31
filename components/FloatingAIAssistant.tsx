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
    const { allExpenses, budgetProgress } = useExpenses();
    const { friendSummaries } = useSplitExpenses();
    const { colors } = useTheme();

    const [visible, setVisible] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const hasApiKey = useMemo(
        () => typeof process.env.EXPO_PUBLIC_GEMINI_API_KEY === 'string' && !!process.env.EXPO_PUBLIC_GEMINI_API_KEY,
        []
    );

    useEffect(() => {
        setMessages((prev) => {
            if (prev.length > 0) {
                return prev;
            }

            if (hasApiKey) {
                return [
                    {
                        role: 'ai',
                        text: "👋 Hi! I'm your financial AI. I have successfully connected to your Gemini API key! Ask me anything about your expenses or budget.",
                    },
                ];
            }

            return [
                {
                    role: 'ai',
                    text: '⚠️ Error: I cannot find your EXPO_PUBLIC_GEMINI_API_KEY in the .env file. Please add it and restart the server.',
                },
            ];
        });
    }, [hasApiKey]);

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
                onRequestClose={() => setVisible(false)}
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
                            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
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

            <View pointerEvents="box-none" style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => setVisible(true)}
                    activeOpacity={0.8}
                >
                    <Bot size={24} color={colors.surface} />
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        zIndex: 100,
        elevation: 5,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
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

