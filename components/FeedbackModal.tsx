import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Linking
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
    const { colors } = useTheme();
    const [rating, setRating] = useState(0);
    const [suggestion, setSuggestion] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a star rating before sending.');
            return;
        }

        setIsSending(true);
        try {
            const feedbackData = {
                rating,
                message: suggestion,
                timestamp: new Date().toISOString()
            };

            const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL_FEEDBACK;
            
            let success = false;
            if (PROXY_URL) {
                try {
                    const response = await fetch(PROXY_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(feedbackData)
                    });
                    if (response.ok) success = true;
                } catch (e) {
                    console.error('Backend submission failed:', e);
                }
            }

            if (!success) {
                // Fallback to mailto
                const email = 'abdullah80905436780@gmail.com';
                const subject = `App Feedback: ${rating} Stars`;
                const body = `Rating: ${rating}/5\n\nSuggestions:\n${suggestion}`;
                const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                
                if (await Linking.canOpenURL(mailtoUrl)) {
                    await Linking.openURL(mailtoUrl);
                } else {
                    Alert.alert('Success', 'Thank you for your feedback! (Email client not found)');
                }
            } else {
                Alert.alert('Success', 'Thank you for your feedback! It has been recorded.');
            }

            setRating(0);
            setSuggestion('');
            onClose();
        } catch (error) {
            console.error('Feedback error:', error);
            Alert.alert('Error', 'Failed to send feedback. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const styles = createStyles(colors);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Your Feedback</Text>
                            <TouchableOpacity onPress={onClose} disabled={isSending}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.subtitle}>How would you rate your experience?</Text>
                        
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity 
                                    key={star} 
                                    onPress={() => setRating(star)}
                                    disabled={isSending}
                                >
                                    <Star 
                                        size={40} 
                                        color={star <= rating ? '#F59E0B' : colors.border} 
                                        fill={star <= rating ? '#F59E0B' : 'transparent'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Suggestions or improvements?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your feedback here..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={suggestion}
                            onChangeText={setSuggestion}
                            editable={!isSending}
                        />

                        <TouchableOpacity 
                            style={[styles.sendButton, { backgroundColor: colors.primary }, isSending && styles.disabledButton]}
                            onPress={handleSend}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.sendButtonText}>Send Feedback</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
    },
    content: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        height: 100,
        textAlignVertical: 'top',
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    sendButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.6,
    }
});
