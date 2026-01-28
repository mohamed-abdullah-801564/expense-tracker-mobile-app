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

interface BudgetHistoryProps {
    transactions: BudgetTransaction[];
    onClose?: () => void;
}

export function BudgetHistory({ transactions, onClose }: BudgetHistoryProps) {
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
        const iconColor = item.type === 'add' ? '#10B981' : '#4F46E5';
        const backgroundColor = item.type === 'add' ? '#ECFDF5' : '#EEF2FF';

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
                            ₹{item.amount.toFixed(2)}
                            {item.previousAmount && item.type === 'add' && (
                                <Text style={styles.previousAmount}>
                                    {' '}(was ₹{item.previousAmount.toFixed(2)})
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
                        <Calendar size={12} color="#9CA3AF" />
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
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <History size={24} color="#4F46E5" />
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
                    <History size={48} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Budget History</Text>
                    <Text style={styles.emptyText}>
                        Budget changes will appear here when you update your budget.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    closeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#4F46E5',
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
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        color: '#1a1a1a',
        marginBottom: 2,
    },
    transactionAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
    },
    previousAmount: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
    },
    transactionDescription: {
        fontSize: 14,
        color: '#6B7280',
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
        color: '#9CA3AF',
    },
    deductionBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    deductionText: {
        fontSize: 10,
        color: '#D97706',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#4B5563',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 22,
    },
});