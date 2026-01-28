import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { Search, Filter, X, Calendar } from 'lucide-react-native';
import { ExpenseCategory } from '@/types/expense';
import { SearchFilters } from '@/utils/search-filter';
import { useTheme } from '@/hooks/theme-store';

interface SearchBarProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    placeholder?: string;
}

const categories: (ExpenseCategory | 'All')[] = [
    'All', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'
];

export default function SearchBar({ filters, onFiltersChange, placeholder = 'Search expenses...' }: SearchBarProps) {
    const { colors } = useTheme();
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);

    const styles = createStyles(colors);

    const handleSearchChange = (text: string) => {
        onFiltersChange({ ...filters, searchText: text });
    };

    const handleApplyFilters = () => {
        onFiltersChange(tempFilters);
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        const resetFilters: SearchFilters = {
            searchText: '',
            category: 'All',
            dateFrom: undefined,
            dateTo: undefined,
            amountMin: undefined,
            amountMax: undefined,
        };
        setTempFilters(resetFilters);
        onFiltersChange(resetFilters);
        setShowFilters(false);
    };

    const hasActiveFilters = filters.category !== 'All' ||
        filters.dateFrom || filters.dateTo ||
        filters.amountMin !== undefined || filters.amountMax !== undefined;

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textSecondary}
                        value={filters.searchText}
                        onChangeText={handleSearchChange}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                    onPress={() => setShowFilters(true)}
                >
                    <Filter size={20} color={hasActiveFilters ? colors.surface : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showFilters}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Expenses</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryButton,
                                            tempFilters.category === category && styles.categoryButtonActive
                                        ]}
                                        onPress={() => setTempFilters({ ...tempFilters, category })}
                                    >
                                        <Text style={[
                                            styles.categoryButtonText,
                                            tempFilters.category === category && styles.categoryButtonTextActive
                                        ]}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Date Range</Text>
                            <View style={styles.dateRow}>
                                <View style={styles.dateInputContainer}>
                                    <Calendar size={16} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.dateInput}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textSecondary}
                                        value={tempFilters.dateFrom || ''}
                                        onChangeText={(text) => setTempFilters({ ...tempFilters, dateFrom: text || undefined })}
                                    />
                                </View>
                                <View style={styles.dateInputContainer}>
                                    <Calendar size={16} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.dateInput}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textSecondary}
                                        value={tempFilters.dateTo || ''}
                                        onChangeText={(text) => setTempFilters({ ...tempFilters, dateTo: text || undefined })}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Amount Range</Text>
                            <View style={styles.amountRow}>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Min amount"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={tempFilters.amountMin?.toString() || ''}
                                    onChangeText={(text) => setTempFilters({
                                        ...tempFilters,
                                        amountMin: text ? parseFloat(text) : undefined
                                    })}
                                />
                                <Text style={styles.amountSeparator}>to</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Max amount"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={tempFilters.amountMax?.toString() || ''}
                                    onChangeText={(text) => setTempFilters({
                                        ...tempFilters,
                                        amountMax: text ? parseFloat(text) : undefined
                                    })}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        paddingVertical: 0,
    },
    filterButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    categoryButtonTextActive: {
        color: colors.surface,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 45,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        paddingVertical: 8,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    amountInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountSeparator: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.surface,
    },
});