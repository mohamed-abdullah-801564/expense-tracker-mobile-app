import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Pressable,
} from 'react-native';
import { ChevronDown, Search, X, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';
import { currencies, CountryCurrency } from '@/constants/currencies';

interface CurrencyPickerProps {
    selectedCountryName: string;
    onSelectCountryName: (countryName: string) => void;
    title?: string;
}

export default function CurrencyPicker({ selectedCountryName, onSelectCountryName, title }: CurrencyPickerProps) {
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const styles = createStyles(colors);

    // Find the currently selected currency details
    const activeCurrency = useMemo(() => {
        return currencies.find(c => c.countryName === selectedCountryName) || currencies[0];
    }, [selectedCountryName]);

    // Filter currencies based on search query
    const filteredCurrencies = useMemo(() => {
        if (!searchQuery.trim()) return currencies;
        const query = searchQuery.toLowerCase().trim();
        return currencies.filter(
            item =>
                item.countryName.toLowerCase().includes(query) ||
                item.currencyCode.toLowerCase().includes(query) ||
                item.currencySymbol.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleSelect = (item: CountryCurrency) => {
        onSelectCountryName(item.countryName);
        setSearchQuery('');
        setModalVisible(false);
    };

    const renderItem = ({ item }: { item: CountryCurrency }) => {
        const isSelected = item.countryName === selectedCountryName;
        return (
            <TouchableOpacity
                style={[
                    styles.rowItem,
                    isSelected && styles.rowItemActive
                ]}
                onPress={() => handleSelect(item)}
            >
                <View style={styles.rowLeft}>
                    <Text style={styles.flagEmoji}>{item.flag}</Text>
                    <View style={styles.textContainer}>
                        <Text style={styles.currencyCode}>{item.currencyCode}</Text>
                        <Text style={styles.countryName}>{item.countryName}</Text>
                    </View>
                </View>
                <View style={styles.rowRight}>
                    <Text style={styles.currencySymbol}>{item.currencySymbol}</Text>
                    {isSelected && (
                        <View style={styles.checkWrapper}>
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Apple-style Dropdown Selection Button */}
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <View style={styles.dropdownLeft}>
                    <Text style={styles.dropdownFlag}>{activeCurrency.flag}</Text>
                    <Text style={styles.dropdownText}>
                        {activeCurrency.currencyCode} ({activeCurrency.currencySymbol}) - {activeCurrency.countryName}
                    </Text>
                </View>
                <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Sleek Bottom Sheet Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setModalVisible(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.sheetContainer}
                    >
                        <SafeAreaView style={styles.sheetContent}>
                            {/* Grab handle/indicator */}
                            <View style={styles.grabHandle} />

                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>{title || "Select Currency"}</Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => {
                                        setSearchQuery('');
                                        setModalVisible(false);
                                    }}
                                >
                                    <X size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Search bar */}
                            <View style={styles.searchContainer}>
                                <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search country, code, or symbol..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCorrect={false}
                                    clearButtonMode="while-editing"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setSearchQuery('')}
                                        style={styles.clearSearchButton}
                                    >
                                        <X size={14} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Currency List */}
                            <FlatList
                                data={filteredCurrencies}
                                keyExtractor={(item) => item.currencyCode + '_' + item.countryName}
                                renderItem={renderItem}
                                contentContainerStyle={styles.listContent}
                                keyboardShouldPersistTaps="handled"
                                initialNumToRender={15}
                                removeClippedSubviews={true}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No currencies found matching "{searchQuery}"</Text>
                                    </View>
                                }
                            />
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        width: '100%',
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    dropdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownFlag: {
        fontSize: 22,
    },
    dropdownText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '75%',
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    sheetContent: {
        flex: 1,
    },
    grabHandle: {
        width: 36,
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        paddingTop: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    closeButton: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 6,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    clearSearchButton: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderRadius: 8,
    },
    rowItemActive: {
        backgroundColor: Platform.OS === 'ios' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(79, 70, 229, 0.08)',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    flagEmoji: {
        fontSize: 28,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    currencyCode: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    countryName: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    checkWrapper: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
