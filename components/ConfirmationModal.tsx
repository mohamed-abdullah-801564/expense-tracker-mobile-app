import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface ConfirmationModalProps {
    isVisible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    countdownSeconds?: number;
}

export function ConfirmationModal({
    isVisible,
    title,
    message,
    onConfirm,
    onCancel,
    countdownSeconds = 5,
}: ConfirmationModalProps) {
    const [countdown, setCountdown] = useState<number>(countdownSeconds);
    const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
    const { colors } = useTheme();

    useEffect(() => {
        if (isVisible) {
            setCountdown(countdownSeconds);
            setIsCountdownActive(true);
        } else {
            setIsCountdownActive(false);
        }
    }, [isVisible, countdownSeconds]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (isCountdownActive && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        } else if (isCountdownActive && countdown === 0) {
            setIsCountdownActive(false);
            onConfirm();
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [countdown, isCountdownActive, onConfirm]);

    const handleCancel = () => {
        setIsCountdownActive(false);
        onCancel();
    };

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <AlertTriangle size={24} color="#EF4444" />
                        </View>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    {isCountdownActive && (
                        <View style={styles.countdownContainer}>
                            <Text style={[styles.countdownText, { color: colors.error }]}>
                                Auto-confirming in {countdown} seconds...
                            </Text>
                            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${((countdownSeconds - countdown) / countdownSeconds) * 100}%`, backgroundColor: colors.error }
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={handleCancel}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton, { backgroundColor: colors.error }]}
                            onPress={() => {
                                setIsCountdownActive(false);
                                onConfirm();
                            }}
                        >
                            <Text style={styles.confirmButtonText}>Confirm Now</Text>
                        </TouchableOpacity>
                    </View>
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
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    countdownContainer: {
        marginBottom: 20,
    },
    countdownText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 2,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    confirmButton: {
        backgroundColor: '#EF4444',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});