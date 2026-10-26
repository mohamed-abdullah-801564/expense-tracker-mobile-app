import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, CheckSquare, Square, X, Tag, FileText, Calendar, Landmark } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';
import { ExpenseCategory } from '@/types/expense';
import { CATEGORIES } from '@/constants/categories';
import { ParsedBankTransaction } from '@/utils/bank-statement-parser';

interface CsvImportModalProps {
    visible: boolean;
    onClose: () => void;
    transactions: ParsedBankTransaction[];
    onImport: (selectedTransactions: ParsedBankTransaction[]) => void;
}

export default function CsvImportModal({
    visible,
    onClose,
    transactions: initialTransactions,
    onImport,
}: CsvImportModalProps) {
    const { colors } = useTheme();
    const [items, setItems] = useState<ParsedBankTransaction[]>(initialTransactions);
    const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);

    // Update internal state if initialTransactions changes
    React.useEffect(() => {
        setItems(initialTransactions);
    }, [initialTransactions]);

    const styles = createStyles(colors);

    const selectedItems = useMemo(() => items.filter(i => i.selected), [items]);

    const totalAmount = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + item.amount, 0);
    }, [selectedItems]);

    const allSelected = useMemo(() => {
        return items.length > 0 && items.every(i => i.selected);
    }, [items]);

    const toggleSelectAll = () => {
        const nextState = !allSelected;
        setItems(prev => prev.map(item => ({ ...item, selected: nextState })));
    };

    const toggleSelectItem = (index: number) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
    };

    const handleCategoryChange = (category: ExpenseCategory) => {
        if (editingCategoryIndex === null) return;
        setItems(prev => {
            const next = [...prev];
            next[editingCategoryIndex] = { ...next[editingCategoryIndex], category };
            return next;
        });
        setEditingCategoryIndex(null);
    };

    const handleDescriptionChange = (index: number, newDesc: string) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], description: newDesc };
            return next;
        });
    };

    const handleImportSubmit = () => {
        if (selectedItems.length === 0) return;
        onImport(selectedItems);
    };

    const renderTransactionItem = ({ item, index }: { item: ParsedBankTransaction; index: number }) => {
        return (
            <View style={[styles.card, !item.selected && styles.cardUnselected]}>
                <View style={styles.cardHeader}>
                    <TouchableOpacity
                        style={styles.checkboxTouch}
                        onPress={() => toggleSelectItem(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        {item.selected ? (
                            <CheckSquare size={22} color={colors.primary} />
                        ) : (
                            <Square size={22} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.cardBody}>
                        <TextInput
                            style={[styles.descriptionInput, !item.selected && styles.textDisabled]}
                            value={item.description}
                            onChangeText={(text) => handleDescriptionChange(index, text)}
                            placeholder="Expense Description"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <View style={styles.cardMetaRow}>
                            <View style={styles.dateBadge}>
                                <Calendar size={12} color={colors.textSecondary} />
                                <Text style={styles.dateText}>{item.date}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.categoryChip}
                                onPress={() => setEditingCategoryIndex(index)}
                            >
                                <Tag size={12} color={colors.primary} />
                                <Text style={styles.categoryChipText}>{item.category}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.amountContainer}>
                        <Text style={[styles.amountText, !item.selected && styles.textDisabled]}>
                            {colors.currencySymbol}{item.amount.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Landmark size={24} color={colors.primary} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.headerTitle}>Bank Statement Review</Text>
                            <Text style={styles.headerSubtitle}>
                                Select & verify debit transactions to import
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Summary bar */}
                <View style={styles.summaryBar}>
                    <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
                        {allSelected ? (
                            <CheckSquare size={20} color={colors.primary} />
                        ) : (
                            <Square size={20} color={colors.textSecondary} />
                        )}
                        <Text style={styles.selectAllText}>
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.summaryRight}>
                        <Text style={styles.summaryCount}>
                            Found <Text style={{ fontWeight: '700', color: colors.text }}>{selectedItems.length}</Text> of {items.length}
                        </Text>
                        <Text style={styles.summaryTotal}>
                            Total: <Text style={{ color: colors.error, fontWeight: '700' }}>{colors.currencySymbol}{totalAmount.toFixed(2)}</Text>
                        </Text>
                    </View>
                </View>

                {/* List of candidates */}
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransactionItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FileText size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No valid debit transactions found in CSV</Text>
                        </View>
                    }
                />

                {/* Footer Action */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.importButton,
                            selectedItems.length === 0 && styles.importButtonDisabled,
                        ]}
                        onPress={handleImportSubmit}
                        disabled={selectedItems.length === 0}
                    >
                        <Check size={20} color={colors.surface} />
                        <Text style={styles.importButtonText}>
                            Import Selected ({selectedItems.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Category Selection Modal */}
                <Modal
                    visible={editingCategoryIndex !== null}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setEditingCategoryIndex(null)}
                >
                    <TouchableOpacity
                        style={styles.pickerOverlay}
                        activeOpacity={1}
                        onPress={() => setEditingCategoryIndex(null)}
                    >
                        <View style={styles.pickerCard}>
                            <Text style={styles.pickerTitle}>Select Category</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={styles.pickerOption}
                                        onPress={() => handleCategoryChange(cat as ExpenseCategory)}
                                    >
                                        <Text style={styles.pickerOptionText}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
        },
        headerSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
        },
        closeButton: {
            padding: 6,
        },
        summaryBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        selectAllRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        selectAllText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
        },
        summaryRight: {
            alignItems: 'flex-end',
        },
        summaryCount: {
            fontSize: 12,
            color: colors.textSecondary,
        },
        summaryTotal: {
            fontSize: 14,
            color: colors.text,
        },
        listContent: {
            padding: 16,
            paddingBottom: 24,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        cardUnselected: {
            opacity: 0.5,
            backgroundColor: colors.background,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        checkboxTouch: {
            paddingRight: 10,
        },
        cardBody: {
            flex: 1,
            marginRight: 8,
        },
        descriptionInput: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
            paddingVertical: 2,
        },
        textDisabled: {
            color: colors.textSecondary,
        },
        cardMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
        },
        dateBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.background,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        dateText: {
            fontSize: 11,
            color: colors.textSecondary,
        },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.background,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
        },
        categoryChipText: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.primary,
        },
        amountContainer: {
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
        amountText: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.error,
        },
        footer: {
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        importButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            gap: 8,
        },
        importButtonDisabled: {
            backgroundColor: colors.border,
        },
        importButtonText: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.surface,
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
        },
        emptyText: {
            fontSize: 16,
            fontWeight: '500',
            color: colors.textSecondary,
            marginTop: 12,
        },
        pickerOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        pickerCard: {
            width: '100%',
            maxWidth: 320,
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        pickerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 14,
            textAlign: 'center',
        },
        pickerOption: {
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        pickerOptionText: {
            fontSize: 16,
            fontWeight: '500',
            color: colors.text,
            textAlign: 'center',
        },
    });
