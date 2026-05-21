import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { Users, CheckCircle, Edit2, Trash2, X, AlertTriangle, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react-native';
import { useSplitExpenses } from '@/hooks/split-expense-store';
import { useTheme } from '@/hooks/theme-store';
import { FriendSummary, SplitExpense } from '@/types/expense';
import { EditFriendNameModal } from './EditFriendNameModal';
import { parseDebt } from '@/utils/split-expense-parser';

export default function FriendsScreen() {
    const { friendSummaries, markAsPaid, deleteSplitExpense, addSplitExpenses, isLoading } = useSplitExpenses();
    const { colors } = useTheme();
    const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
    const [editingSplit, setEditingSplit] = useState<SplitExpense | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ split: SplitExpense; isPending: boolean } | null>(null);

    // Debt Modal State
    const [debtModal, setDebtModal] = useState<{ visible: boolean; type: 'lend' | 'borrow' }>({ visible: false, type: 'lend' });
    const [debtInput, setDebtInput] = useState('');
    const [debtDescription, setDebtDescription] = useState('');

    // Quick Action State
    const [quickAction, setQuickAction] = useState<{ visible: boolean; friendName: string }>({ visible: false, friendName: '' });
    const [quickAmount, setQuickAmount] = useState('');
    const [quickDescription, setQuickDescription] = useState('');

    const styles = createStyles(colors);

    const handleDebtSubmit = () => {
        if (!debtInput.trim()) {
            setDebtModal({ ...debtModal, visible: false });
            return;
        }

        const normalizedInput = debtInput.toLowerCase();
        const hasDebtKeyword =
            normalizedInput.includes('borrow') ||
            normalizedInput.includes('lend') ||
            normalizedInput.includes('gave') ||
            normalizedInput.includes('got');

        let inputToParse = debtInput;
        if (!hasDebtKeyword) {
            inputToParse = debtModal.type === 'lend' ? `Lent ${debtInput}` : `Borrowed ${debtInput}`;
        }

        const parsed = parseDebt(inputToParse);

        if (parsed) {
            const newSplit: SplitExpense = {
                id: Date.now().toString(),
                expenseId: `debt_${Date.now()}`,
                friendName: parsed.friendName,
                amount: parsed.amount,
                description: debtDescription.trim() || (debtModal.type === 'lend' ? 'Lent' : 'Borrowed'),
                category: 'Other',
                date: new Date().toISOString(),
                isPaid: false,
                createdAt: new Date().toISOString(),
                type: parsed.type
            };

            addSplitExpenses([newSplit]);
            setDebtInput('');
            setDebtDescription('');
            setDebtModal({ ...debtModal, visible: false });
        } else {
            Alert.alert("Invalid Input", "Could not understand the amount or friend name. Try '500 to Ram'.");
        }
    };

    const handleMarkAsPaid = (splitId: string) => {
        markAsPaid(splitId);
    };

    const handleDeleteSplit = (split: SplitExpense) => {
        if (!split.isPaid && split.amount > 0) {
            setDeleteConfirmation({ split, isPending: true });
        } else {
            deleteSplitExpense(split.id);
        }
    };

    const confirmDelete = () => {
        if (deleteConfirmation) {
            deleteSplitExpense(deleteConfirmation.split.id);
            setDeleteConfirmation(null);
        }
    };

    const toggleExpand = (friendName: string) => {
        setExpandedFriend(expandedFriend === friendName ? null : friendName);
    };

    const handleQuickSubmit = (type: 'lend' | 'borrow') => {
        if (!quickAmount || isNaN(parseFloat(quickAmount))) {
            Alert.alert("Invalid Input", "Please enter a valid amount.");
            return;
        }

        const newSplit: SplitExpense = {
            id: Date.now().toString(),
            expenseId: `quick_${Date.now()}`,
            friendName: quickAction.friendName,
            amount: parseFloat(quickAmount),
            description: quickDescription.trim() || 'Quick Update',
            category: 'Other',
            date: new Date().toISOString(),
            isPaid: false,
            createdAt: new Date().toISOString(),
            type: type
        };

        addSplitExpenses([newSplit]);

        // Reset and close
        setQuickAmount('');
        setQuickDescription('');
        setQuickAction({ visible: false, friendName: '' });
    };

    const openQuickAction = (friendName: string) => {
        setQuickAction({ visible: true, friendName });
        setQuickAmount('');
        setQuickDescription('');
    };

    const renderSplitItem = (split: SplitExpense) => {
        const isBorrow = split.type === 'borrow';
        const isLend = split.type === 'lend';

        return (
            <View key={split.id} style={styles.splitItem}>
                <View style={[styles.splitIconContainer,
                isBorrow ? { backgroundColor: '#FEE2E2' } :
                    isLend ? { backgroundColor: '#D1FAE5' } :
                        { backgroundColor: '#E0E7FF' }
                ]}>
                    {isBorrow ? <ArrowDownLeft size={16} color={colors.error} /> :
                        isLend ? <ArrowUpRight size={16} color={colors.success} /> :
                            <Users size={16} color={colors.primary} />}
                </View>

                <View style={styles.splitInfo}>
                    <View style={styles.splitHeader}>
                        <Text style={styles.splitDescription}>{split.description}</Text>
                        <Text style={[styles.splitAmount, isBorrow && { color: colors.error }]}>
                            {isBorrow ? '-' : ''}{colors.currencySymbol}{split.amount.toFixed(2)}
                        </Text>
                    </View>
                    <Text style={styles.splitDate}>
                        {new Date(split.date).toLocaleDateString()} • {split.category}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    {!split.isPaid && (
                        <TouchableOpacity
                            style={styles.markPaidButton}
                            onPress={() => handleMarkAsPaid(split.id)}
                        >
                            <CheckCircle size={20} color={colors.success} />
                        </TouchableOpacity>
                    )}
                    {split.isPaid && (
                        <View style={styles.paidBadge}>
                            <Text style={styles.paidText}>{isBorrow ? 'Repaid' : 'Paid'}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteSplit(split)}
                    >
                        <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderFriendCard = useCallback(({ item }: { item: FriendSummary }) => {
        const isExpanded = expandedFriend === item.friendName;
        const pendingSplits = item.splits.filter(s => !s.isPaid);
        const paidSplits = item.splits.filter(s => s.isPaid);

        const netBalance = item.netBalance;
        const netBalanceColor = netBalance > 0 ? colors.success : netBalance < 0 ? colors.error : colors.textSecondary;
        const netBalanceText = netBalance > 0 ? `Owes you ${colors.currencySymbol}${netBalance.toFixed(2)}` :
            netBalance < 0 ? `You owe ${colors.currencySymbol}${Math.abs(netBalance).toFixed(2)}` :
                `Settled`;

        return (
            <View style={styles.friendCard}>
                <TouchableOpacity
                    style={styles.friendHeader}
                    onPress={() => toggleExpand(item.friendName)}
                >
                    <View style={styles.friendInfo}>
                        <View style={styles.friendNameRow}>
                            <Users size={24} color={colors.primary} />
                            <Text style={styles.friendName}>{item.friendName}</Text>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => {
                                    if (item.splits.length > 0) {
                                        setEditingSplit(item.splits[0]);
                                    }
                                }}
                            >
                                <Edit2 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.friendStats}>
                            <Text style={[styles.friendStatValue, { color: netBalanceColor, fontWeight: '700' }]}>
                                {netBalanceText}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => openQuickAction(item.friendName)}
                    >
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.splitCountBadge}>
                        <Text style={styles.splitCountText}>{item.splitCount}</Text>
                    </View>
                </TouchableOpacity >

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {pendingSplits.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Pending / Active</Text>
                                {pendingSplits.map(renderSplitItem)}
                            </>
                        )}

                        {paidSplits.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Settled / Paid</Text>
                                {paidSplits.map(renderSplitItem)}
                            </>
                        )}
                    </View>
                )
                }
            </View >
        );
    }, [expandedFriend, colors, styles, setEditingSplit, toggleExpand]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const totalPending = friendSummaries.reduce((sum, f) => sum + f.pendingAmount, 0);
    const totalPaid = friendSummaries.reduce((sum, f) => sum + f.totalPaid, 0);
    const totalNetBalance = friendSummaries.reduce((sum, f) => sum + f.netBalance, 0);

    return (
        <View style={styles.container}>
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                    onPress={() => setDebtModal({ visible: true, type: 'lend' })}
                >
                    <ArrowUpRight size={20} color="white" />
                    <Text style={styles.actionButtonText}>Gave / Lent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={() => setDebtModal({ visible: true, type: 'borrow' })}
                >
                    <ArrowDownLeft size={20} color="white" />
                    <Text style={styles.actionButtonText}>Got / Borrowed</Text>
                </TouchableOpacity>
            </View>

            {friendSummaries.length === 0 ? (
                <ScrollView style={styles.container}>
                    <View style={styles.emptyContainer}>
                        <Users size={64} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>No Split Expenses Yet</Text>
                        <Text style={styles.emptyDescription}>
                            When you add expenses with &quot;split&quot; in the description,
                            {'\n'}they&apos;ll appear here for tracking.
                        </Text>
                        <View style={styles.exampleBox}>
                            <Text style={styles.exampleTitle}>Example:</Text>
                            <Text style={styles.exampleText}>• &quot;Lunch 400 split 4 person&quot;</Text>
                            <Text style={styles.exampleText}>• &quot;Dinner 600 split 3&quot;</Text>
                            <Text style={styles.exampleText}>• &quot;Movie 300 split 2&quot;</Text>
                        </View>
                    </View>
                </ScrollView>
            ) : (
                <>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Net Balance</Text>
                                <Text style={[
                                    styles.summaryValue,
                                    { color: totalNetBalance >= 0 ? colors.success : colors.error }
                                ]}>
                                    {totalNetBalance >= 0 ? '+' : ''}{colors.currencySymbol}{totalNetBalance.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Paid</Text>
                                <Text style={[styles.summaryValue, styles.paidAmount]}>
                                    {colors.currencySymbol}{totalPaid.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <FlatList
                        data={friendSummaries}
                        keyExtractor={(item) => item.friendName}
                        renderItem={renderFriendCard}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={8}
                        maxToRenderPerBatch={8}
                        windowSize={8}
                        removeClippedSubviews={true}
                        updateCellsBatchingPeriod={50}
                    />
                </>
            )}

            {editingSplit && (
                <EditFriendNameModal
                    visible={!!editingSplit}
                    split={editingSplit}
                    onClose={() => setEditingSplit(null)}
                />
            )}

            <Modal
                visible={debtModal.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDebtModal({ visible: false, type: 'lend' })}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, { backgroundColor: colors.surface }]}>
                        <View style={styles.deleteModalHeader}>
                            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
                                {debtModal.type === 'lend' ? 'Lent Money' : 'Borrowed Money'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setDebtModal({ visible: false, type: 'lend' });
                                setDebtDescription('');
                                setDebtInput('');
                            }}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                            e.g. "500 {debtModal.type === 'lend' ? 'to' : 'from'} Ram"
                        </Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 12 }]}
                            placeholder={debtModal.type === 'lend' ? "Amount (e.g. 500 to Ram)..." : "Amount (e.g. 500 from Ram)..."}
                            placeholderTextColor={colors.textSecondary}
                            value={debtInput}
                            onChangeText={setDebtInput}
                            autoFocus
                        />

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                            Reason (Optional)
                        </Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            placeholder="e.g. Lunch, Movie (Optional)"
                            placeholderTextColor={colors.textSecondary}
                            value={debtDescription}
                            onChangeText={setDebtDescription}
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleDebtSubmit}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={quickAction.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setQuickAction({ ...quickAction, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, { backgroundColor: colors.surface }]}>
                        <View style={styles.deleteModalHeader}>
                            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
                                {quickAction.friendName}
                            </Text>
                            <TouchableOpacity onPress={() => setQuickAction({ ...quickAction, visible: false })}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={quickAmount}
                            onChangeText={setQuickAmount}
                            autoFocus
                        />

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reason (Optional)</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            placeholder="e.g. Lunch, Ticket (Optional)"
                            placeholderTextColor={colors.textSecondary}
                            value={quickDescription}
                            onChangeText={setQuickDescription}
                        />

                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={[styles.deleteModalButton, { backgroundColor: colors.success }]}
                                onPress={() => handleQuickSubmit('lend')}
                            >
                                <ArrowUpRight size={20} color="white" style={{ marginBottom: 4 }} />
                                <Text style={styles.confirmDeleteText}>Gave / Lent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deleteModalButton, { backgroundColor: colors.error }]}
                                onPress={() => handleQuickSubmit('borrow')}
                            >
                                <ArrowDownLeft size={20} color="white" style={{ marginBottom: 4 }} />
                                <Text style={styles.confirmDeleteText}>Got / Borrowed</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {deleteConfirmation && (
                <Modal
                    visible={true}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setDeleteConfirmation(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.deleteModal, { backgroundColor: colors.surface }]}>
                            <View style={styles.deleteModalHeader}>
                                <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Delete Confirmation</Text>
                                <TouchableOpacity onPress={() => setDeleteConfirmation(null)}>
                                    <X size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.warningContainer, { backgroundColor: colors.background }]}>
                                <AlertTriangle size={40} color={colors.warning} />
                                <Text style={[styles.warningText, { color: colors.text }]}>
                                    This transaction is active.
                                </Text>
                                <Text style={[styles.warningSubtext, { color: colors.textSecondary }]}>
                                    Delete anyway?
                                </Text>
                            </View>

                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.cancelDeleteButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={() => setDeleteConfirmation(null)}
                                >
                                    <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.confirmDeleteButton, { backgroundColor: colors.error }]}
                                    onPress={confirmDelete}
                                >
                                    <Text style={styles.confirmDeleteText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    summaryCard: {
        backgroundColor: colors.surface,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
    summaryLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    pendingAmount: {
        color: colors.warning,
    },
    paidAmount: {
        color: colors.success,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    friendCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    friendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    friendInfo: {
        flex: 1,
        gap: 8,
    },
    friendNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    friendName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    editButton: {
        padding: 4,
    },
    friendStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    friendStatLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    friendStatValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    splitCountBadge: {
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    quickActionButton: {
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    splitCountText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    expandedContent: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 8,
        marginBottom: 4,
    },
    splitItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    splitIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    splitInfo: {
        flex: 1,
        gap: 4,
    },
    splitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    splitDescription: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    splitAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginLeft: 8,
    },
    splitDate: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    markPaidButton: {
        padding: 8,
    },
    deleteButton: {
        padding: 8,
    },
    paidBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    paidText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginTop: 24,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    exampleBox: {
        backgroundColor: colors.surface,
        padding: 20,
        borderRadius: 16,
        width: '100%',
        gap: 8,
    },
    exampleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    exampleText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModal: {
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
    deleteModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    warningContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    warningText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    warningSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteModalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelDeleteButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    confirmDeleteButton: {
        backgroundColor: '#EF4444',
    },
    cancelDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    confirmDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },

    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
    },
    saveButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
