import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { History, Plus, RefreshCw, Calendar } from 'lucide-react-native';
import { BudgetTransaction } from '@/types/expense';
import { useTheme } from '@/hooks/theme-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BudgetHistoryProps {
    transactions: BudgetTransaction[];
    onClose?: () => void;
}

export function BudgetHistory({ transactions, onClose }: BudgetHistoryProps) {
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderTransaction = ({ item }: { item: BudgetTransaction }) => {
        const IconComponent = item.type === 'add' ? Plus : RefreshCw;
        const iconColor = item.type === 'add' ? colors.success : colors.primary;
        const backgroundColor = item.type === 'add'
            ? (isDarkMode ? '#064E3B' : '#ECFDF5')
            : (isDarkMode ? '#1E1B4B' : '#EEF2FF');

        return (
            <View style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                    <View style={[styles.iconContainer, { backgroundColor }]}>
                        <IconComponent size={20} color={iconColor} />
                    </View>
                    <View style={styles.transactionInfo}>
                        <Text style={styles.transactionType}>
                            {item.type === 'add' ? 'Added to Budget' : 'Replaced Budget'}
                        </Text>
                        <Text style={styles.transactionAmount}>
                            {colors.currencySymbol}{item.amount.toFixed(2)}
                            {item.previousAmount && item.type === 'add' && (
                                <Text style={styles.previousAmount}>
                                    {' '}(was {colors.currencySymbol}{item.previousAmount.toFixed(2)})
                                </Text>
                            )}
                        </Text>
                    </View>
                </View>

                <Text style={styles.transactionDescription}>
                    {item.description}
                </Text>

                <View style={styles.transactionFooter}>
                    <View style={styles.dateContainer}>
                        <Calendar size={12} color={colors.textSecondary} />
                        <Text style={styles.transactionDate}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                    {item.deductExistingExpenses && (
                        <View style={styles.deductionBadge}>
                            <Text style={styles.deductionText}>Expenses Deducted</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            />
            <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom || 20 }]}>
                <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
                    <View style={styles.headerLeft}>
                        <History size={24} color={colors.primary} />
                        <Text style={styles.title}>Budget History</Text>
                    </View>
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Done</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {transactions.length > 0 ? (
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTransaction}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <History size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>No Budget History</Text>
                        <Text style={styles.emptyText}>
                            Budget changes will appear here when you update your budget.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    closeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.primary,
        borderRadius: 16,
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    transactionItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    transactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    transactionAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.success,
    },
    previousAmount: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.textSecondary,
    },
    transactionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    transactionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    deductionBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    deductionText: {
        fontSize: 10,
        color: colors.warning,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});