import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Calendar, Clock, Filter, History as HistoryIcon } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { FilterType, filterExpensesByType, FilteredExpenseResult } from '@/utils/expense-filter';
import { SearchFilters, searchAndFilterExpenses } from '@/utils/search-filter';
import { useDebounce } from '@/hooks/use-debounce';
import SearchBar from '@/components/SearchBar';
import { BudgetHistory } from '@/components/BudgetHistory';
import { currencies } from '@/constants/currencies';
import { getFallbackRate } from '@/utils/expense-parser';

export default function HistoryScreen() {
    const { allExpenses, isLoading, budgetHistory } = useExpenses();
    const { colors, currencyCode, homeCurrencyCode } = useTheme();
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('This Month');
    const [showHistory, setShowHistory] = useState(false);
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

        return (
            <View style={[styles.expenseItem, item.isDeleted && styles.deletedItem]}>
                <View style={styles.expenseHeader}>
                    <View style={styles.expenseInfo}>
                        <Text style={[styles.expenseDescription, item.isDeleted && styles.deletedText]}>
                            {item.description} {item.isDeleted && '(Deleted)'}
                        </Text>
                        <Text style={styles.expenseCategory}>{item.category}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.expenseAmount, item.isDeleted && styles.deletedText]}>
                            {colors.currencySymbol}{item.amount.toFixed(2)}
                        </Text>
                        {item.isRemittance && (
                            <Text style={styles.remittanceSubtext}>
                                ≈ {displayHomeSymbol}{displayConvertedAmount} sent home
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.expenseFooter}>
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
                    <Text style={styles.expenseMonthYear}>{item.month} {item.year}</Text>
                </View>
            </View>
        );
    }, [colors, styles, currencyCode, homeCurrencyCode]);

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
                    Showing {filteredExpenses.length} expenses
                    {selectedFilter === 'This Month' && ' for this month'}
                </Text>
            </View>

            <FlatList
                data={filteredExpenses}
                keyExtractor={(item, index) => `${item.date}-${item.time}-${index}`}
                renderItem={renderExpenseItem}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                getItemLayout={(data, index) => ({
                    length: 100,
                    offset: 100 * index,
                    index,
                })}
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
    remittanceSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
});