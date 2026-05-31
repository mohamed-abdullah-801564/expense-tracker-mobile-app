import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Calendar, Clock, Filter, History as HistoryIcon, ChevronDown, ChevronUp } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { FilterType, filterExpensesByType, FilteredExpenseResult } from '@/utils/expense-filter';
import { SearchFilters, searchAndFilterExpenses } from '@/utils/search-filter';
import { useDebounce } from '@/hooks/use-debounce';
import SearchBar from '@/components/SearchBar';
import { BudgetHistory } from '@/components/BudgetHistory';
import { currencies } from '@/constants/currencies';
import { getFallbackRate } from '@/utils/expense-parser';

function groupExpensesByGroupId(expenses: FilteredExpenseResult[]): FilteredExpenseResult[] {
    const grouped: Record<string, FilteredExpenseResult & { maxAmountCategory?: { category: any; amount: number } }> = {};
    const result: FilteredExpenseResult[] = [];

    for (const exp of expenses) {
        const groupId = exp.groupId;
        if (groupId === undefined || groupId === null || groupId === '') {
            result.push(exp);
            continue;
        }

        const existing = grouped[groupId];
        if (existing) {
            existing.amount += exp.amount;
            
            // Combine description
            const descParts = existing.description.split(', ').map(d => d.trim());
            const newDesc = exp.description.trim();
            if (!descParts.includes(newDesc)) {
                descParts.push(newDesc);
            }
            existing.description = descParts.join(', ');

            // Update dominant category (highest amount)
            if (existing.maxAmountCategory && exp.amount > existing.maxAmountCategory.amount) {
                existing.maxAmountCategory = { category: exp.category, amount: exp.amount };
                existing.category = exp.category;
            }

            // Bundle item breakdown into items array
            if (!existing.items) {
                existing.items = [];
            }
            // Add sub-item breakdown
            existing.items.push({
                name: exp.description,
                qty: 1,
                total: exp.amount,
                category: exp.category
            });

            // Remittance accumulation
            if (exp.isRemittance) {
                existing.isRemittance = true;
                existing.remittanceCode = exp.remittanceCode || existing.remittanceCode;
                existing.historicalConvertedAmount = (existing.historicalConvertedAmount || 0) + (exp.historicalConvertedAmount || 0);
                existing.historicalHomeSymbol = exp.historicalHomeSymbol || existing.historicalHomeSymbol;
            }
        } else {
            // First item in this group
            const items = exp.items ? [...exp.items] : [];
            if (items.length === 0) {
                items.push({
                    name: exp.description,
                    qty: 1,
                    total: exp.amount,
                    category: exp.category
                });
            }
            const groupItem: FilteredExpenseResult & { maxAmountCategory?: { category: any; amount: number } } = {
                ...exp,
                items
            };
            groupItem.maxAmountCategory = { category: exp.category, amount: exp.amount };
            grouped[groupId] = groupItem;
            result.push(groupItem);
        }
    }

    // Clean up temporary property before returning
    for (const item of result) {
        if (item.groupId) {
            delete (item as any).maxAmountCategory;
        }
    }

    return result;
}

export default function HistoryScreen() {
    const { allExpenses, isLoading, budgetHistory } = useExpenses();
    const { colors, currencyCode, homeCurrencyCode } = useTheme();
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('This Month');
    const [showHistory, setShowHistory] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const toggleItemExpanded = useCallback((id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        searchText: '',
        category: 'All',
        dateFrom: undefined,
        dateTo: undefined,
        amountMin: undefined,
        amountMax: undefined,
    });

    const debouncedSearchFilters = useDebounce(searchFilters, 300);

    const filteredExpenses = useMemo(() => {
        const timeFiltered = filterExpensesByType(allExpenses, selectedFilter);
        // Use debounced filters for expensive filtering operation
        return searchAndFilterExpenses(timeFiltered, debouncedSearchFilters);
    }, [allExpenses, selectedFilter, debouncedSearchFilters]);

    const groupedFilteredExpenses = useMemo(() => {
        return groupExpensesByGroupId(filteredExpenses);
    }, [filteredExpenses]);

    const styles = createStyles(colors);

    const renderExpenseItem = useCallback(({ item }: { item: FilteredExpenseResult & { isDeleted?: boolean } }) => {
        let displayHomeSymbol = item.historicalHomeSymbol;
        let displayConvertedAmount = item.historicalConvertedAmount !== undefined 
            ? item.historicalConvertedAmount.toFixed(2) 
            : undefined;

        if (item.isRemittance && (displayHomeSymbol === undefined || displayConvertedAmount === undefined)) {
            const targetRemittanceCode = item.remittanceCode || homeCurrencyCode;
            const matched = currencies.find(c => c.currencyCode === targetRemittanceCode);
            displayHomeSymbol = matched ? matched.currencySymbol : targetRemittanceCode;
            const rate = getFallbackRate(currencyCode, targetRemittanceCode);
            displayConvertedAmount = (item.amount * rate).toFixed(2);
        }

        const hasItems = !!(item.items && item.items.length > 0);
        const isExpanded = !!(item.id && expandedItems[item.id]);

        const CardComponent = hasItems ? TouchableOpacity : View;
        const cardProps = hasItems ? {
            activeOpacity: 0.7,
            onPress: () => item.id && toggleItemExpanded(item.id),
        } : {};

        return (
            <CardComponent style={[styles.expenseItem, item.isDeleted && styles.deletedItem]} {...cardProps}>
                <View style={styles.expenseHeader}>
                    <View style={styles.expenseInfo}>
                        <Text style={[styles.expenseDescription, item.isDeleted && styles.deletedText]}>
                            {item.description} {item.isDeleted && '(Deleted)'}
                        </Text>
                        <Text style={styles.expenseCategory}>{item.category}</Text>
                        
                        {item.isRemittance && (
                            <View style={styles.remittanceContainer}>
                                <View style={styles.dateTimeContainer}>
                                    <Calendar size={14} color={colors.textSecondary} />
                                    <Text style={styles.expenseDate}>{item.date}</Text>
                                    {item.time && (
                                        <>
                                            <Clock size={14} color={colors.textSecondary} />
                                            <Text style={styles.expenseTime}>{item.time}</Text>
                                        </>
                                    )}
                                </View>
                                <Text style={styles.remittanceSubtext}>
                                    ≈ {displayHomeSymbol}{displayConvertedAmount} sent home
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.amountContainer}>
                            <Text style={[styles.expenseAmount, item.isDeleted && styles.deletedText]}>
                                {colors.currencySymbol}{item.amount.toFixed(2)}
                            </Text>
                        </View>
                        {hasItems && (
                            <View style={{ paddingLeft: 4 }}>
                                {isExpanded ? (
                                    <ChevronUp size={18} color={colors.textSecondary} />
                                ) : (
                                    <ChevronDown size={18} color={colors.textSecondary} />
                                )}
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.expenseFooter}>
                    {!item.isRemittance ? (
                        <View style={styles.dateTimeContainer}>
                            <Calendar size={14} color={colors.textSecondary} />
                            <Text style={styles.expenseDate}>{item.date}</Text>
                            {item.time && (
                                <>
                                    <Clock size={14} color={colors.textSecondary} />
                                    <Text style={styles.expenseTime}>{item.time}</Text>
                                </>
                            )}
                        </View>
                    ) : (
                        <View />
                    )}
                    <Text style={styles.expenseMonthYear}>{item.month} {item.year}</Text>
                </View>
                {hasItems && isExpanded && (
                    <View style={styles.subTableContainer}>
                        <View style={styles.subTableHeader}>
                            <Text style={[styles.subTableHeaderText, { flex: 2, color: colors.textSecondary }]}>Item</Text>
                            <Text style={[styles.subTableHeaderText, { flex: 0.5, textAlign: 'center', color: colors.textSecondary }]}>Qty</Text>
                            <Text style={[styles.subTableHeaderText, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>Price</Text>
                        </View>
                        {item.items?.map((subItem, idx) => (
                            <View key={idx} style={styles.subTableRow}>
                                <Text style={[styles.subTableRowText, { flex: 2, color: colors.text }]} numberOfLines={1}>
                                    {subItem.name}
                                </Text>
                                <Text style={[styles.subTableRowText, { flex: 0.5, textAlign: 'center', color: colors.textSecondary }]}>
                                    {subItem.qty}
                                </Text>
                                <Text style={[styles.subTableRowText, { flex: 1, textAlign: 'right', color: colors.text }]}>
                                    {colors.currencySymbol}{subItem.total.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </CardComponent>
        );
    }, [colors, styles, currencyCode, homeCurrencyCode, expandedItems, toggleItemExpanded]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading expense history...</Text>
            </View>
        );
    }

    const renderFilterButton = (filter: FilterType) => (
        <TouchableOpacity
            key={filter}
            style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter)}
        >
            <Text style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive
            ]}>
                {filter}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Expense History</Text>
                <View style={styles.filterContainer}>
                    <Filter size={16} color={colors.textSecondary} />
                    <Text style={styles.filterLabel}>Filter:</Text>
                </View>
            </View>

            <SearchBar
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
                placeholder="Search by description, amount, or date..."
            />

            <View style={styles.filtersRow}>
                {(['This Month', 'Total Expenses'] as FilterType[]).map(renderFilterButton)}
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => setShowHistory(true)}
                >
                    <HistoryIcon size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                    Showing {groupedFilteredExpenses.length} expenses
                    {selectedFilter === 'This Month' && ' for this month'}
                </Text>
            </View>

            <FlatList
                data={groupedFilteredExpenses}
                keyExtractor={(item, index) => item.groupId ? `${item.groupId}-${index}` : `${item.date}-${item.time}-${index}`}
                renderItem={renderExpenseItem}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No expenses found</Text>
                        <Text style={styles.emptySubtext}>
                            {selectedFilter === 'This Month'
                                ? 'No expenses recorded for this month'
                                : 'No expenses recorded yet'
                            }
                        </Text>
                    </View>
                }
            />

            <Modal
                visible={showHistory}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowHistory(false)}
            >
                <BudgetHistory
                    transactions={budgetHistory}
                    onClose={() => setShowHistory(false)}
                />
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    filtersRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    historyButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginLeft: 'auto',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterButtonTextActive: {
        color: colors.surface,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.background,
    },
    summaryText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    listContent: {
        paddingVertical: 8,
        paddingBottom: 100,
    },
    expenseItem: {
        backgroundColor: colors.card,
        marginHorizontal: 20,
        marginVertical: 4,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    expenseInfo: {
        flex: 1,
    },
    expenseDescription: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    expenseCategory: {
        fontSize: 14,
        color: colors.textSecondary,
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    expenseAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.error,
    },
    expenseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    expenseDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginRight: 8,
    },
    expenseTime: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    expenseMonthYear: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center', // Centered card style or 'flex-end' for slide up
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    deletedItem: {
        opacity: 0.6,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deletedText: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
    },
    amountContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    remittanceContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginTop: 8,
        marginBottom: 4,
        gap: 4,
    },
    remittanceSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    subTableContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 6,
    },
    subTableHeader: {
        flexDirection: 'row',
        paddingBottom: 4,
        marginBottom: 4,
    },
    subTableHeaderText: {
        fontSize: 12,
        fontWeight: '600',
    },
    subTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    subTableRowText: {
        fontSize: 13,
        fontWeight: '500',
    },
});