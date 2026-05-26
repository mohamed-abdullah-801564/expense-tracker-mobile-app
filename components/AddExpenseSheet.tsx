import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { X, Camera as CameraIcon, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useExpenses } from '@/hooks/expense-store';
import { useSplitExpenses } from '@/hooks/split-expense-store';
import { useTheme } from '@/hooks/theme-store';
import { parseExpenseWithAI, validateAmount, getFallbackRate } from '@/utils/expense-parser';
import { parseSplitExpense, createSplitExpenses, parseDebt, ParsedSplitWithNames } from '@/utils/split-expense-parser';
import { SplitExpense } from '@/types/expense';
import { currencies } from '@/constants/currencies';
import { checkDailyScanLimit, incrementDailyScanCount, scanReceiptWithGemini } from '@/utils/ocr-scanner';
import { CATEGORIES, CATEGORY_COLORS } from '@/constants/categories';

interface AddExpenseSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function AddExpenseSheet({ visible, onClose }: AddExpenseSheetProps) {
    const [input, setInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [scannedData, setScannedData] = useState<{
        items: Array<{ itemName: string; price: string; category: string }>;
    } | null>(null);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const handleCategorySelect = (selectedCategory: string) => {
        if (activeItemIndex !== null && scannedData) {
            const updatedItems = [...scannedData.items];
            updatedItems[activeItemIndex].category = selectedCategory;
            setScannedData({ items: updatedItems });
        }
        setCategoryModalVisible(false);
        setActiveItemIndex(null);
    };
    const { addExpense } = useExpenses();
    const { addSplitExpenses } = useSplitExpenses();
    const { colors, homeCurrencyCode, currencyCountryName } = useTheme();

    const placeholders = [
        "Sent 500 to family for rent",
        "Coffee 40 morning",
        "Lunch 450 split 3 with Ram, Sam",
        "Bought snacks 120",
    ];
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const processReceiptImage = async (base64: string) => {
        setIsScanning(true);
        try {
            // Send base64 payload to client-side Gemini 2.5 Flash OCR
            const result = await scanReceiptWithGemini(base64);
            
            // Check for invalid document guard
            if (result.error === 'invalid_document' || !result.items) {
                Alert.alert(
                    "Invalid Document",
                    "Oops! That doesn't look like a valid receipt. Please upload a clear photo of your store receipt or bill so we can parse it for you! 💐"
                );
                return;
            }

            // Increment local daily scan storage count upon success
            await incrementDailyScanCount();

            // Pre-fill states for "Review First" workflow
            setScannedData({
                items: result.items.map(item => ({
                    itemName: item.itemName,
                    price: item.price.toString(),
                    category: item.category === 'Others' ? 'Other' : item.category
                }))
            });

        } catch (error: any) {
            console.error("OCR scan failed:", error);
            Alert.alert("Scan Failed", error.message || "Failed to analyze receipt. Please try typing manually.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleCameraScan = async () => {
        // 1. Check daily rate limiting guard
        const limitCheck = await checkDailyScanLimit();
        if (!limitCheck.allowed) {
            Alert.alert(
                "Limit Reached",
                "Daily scan limit reached (5/5). Please type your expense manually or try again tomorrow."
            );
            return;
        }

        // 2. Request camera permissions
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Camera access is required to scan receipts.");
            return;
        }

        // 3. Launch camera
        try {
            const pickerResult = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
                return;
            }

            const base64 = pickerResult.assets[0].base64;
            if (!base64) {
                Alert.alert("Error", "Could not read image data.");
                return;
            }

            await processReceiptImage(base64);
        } catch (error: any) {
            console.error("Camera OCR scan failed:", error);
            Alert.alert("Scan Failed", error.message || "Failed to analyze receipt. Please try typing manually.");
        }
    };

    const handleGalleryScan = async () => {
        // 1. Check daily rate limiting guard
        const limitCheck = await checkDailyScanLimit();
        if (!limitCheck.allowed) {
            Alert.alert(
                "Limit Reached",
                "Daily scan limit reached (5/5). Please type your expense manually or try again tomorrow."
            );
            return;
        }

        // 2. Request media library permissions
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Gallery access is required to upload receipts.");
            return;
        }

        // 3. Launch library
        try {
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
                return;
            }

            const base64 = pickerResult.assets[0].base64;
            if (!base64) {
                Alert.alert("Error", "Could not read image data.");
                return;
            }

            await processReceiptImage(base64);
        } catch (error: any) {
            console.error("Gallery OCR scan failed:", error);
            Alert.alert("Scan Failed", error.message || "Failed to analyze receipt. Please try typing manually.");
        }
    };

    const handleSubmit = async () => {
        // Review First workflow submission path
        if (scannedData) {
            if (scannedData.items.length === 0) {
                Alert.alert('No Items', 'There are no items to save.');
                return;
            }

            // Validate all items
            for (let i = 0; i < scannedData.items.length; i++) {
                const item = scannedData.items[i];
                if (!item.itemName.trim()) {
                    Alert.alert('Missing Name', `Please provide a name for item #${i + 1}`);
                    return;
                }
                const priceNum = parseFloat(item.price);
                if (isNaN(priceNum) || priceNum <= 0) {
                    Alert.alert('Invalid Price', `Please enter a valid price for "${item.itemName}"`);
                    return;
                }
            }

            setIsParsing(true);
            try {
                const expenseDate = new Date().toISOString();
                
                // Save each item as a separate expense
                for (const item of scannedData.items) {
                    const priceNum = parseFloat(item.price);
                    const isRemittance = item.category === 'Remittance';

                    let historicalPrimarySymbol: string | undefined = undefined;
                    let historicalHomeSymbol: string | undefined = undefined;
                    let historicalConvertedAmount: number | undefined = undefined;

                    if (isRemittance) {
                        const targetCode = homeCurrencyCode;
                        const matchedCountry = currencies.find(c => c.currencyCode === targetCode);
                        const activeCurrencyEntry = currencies.find(c => c.countryName === currencyCountryName);
                        const primaryCode = activeCurrencyEntry ? activeCurrencyEntry.currencyCode : 'INR';
                        
                        historicalPrimarySymbol = colors.currencySymbol;
                        historicalHomeSymbol = matchedCountry ? matchedCountry.currencySymbol : targetCode;
                        
                        let rate = getFallbackRate(primaryCode, targetCode);

                        try {
                            const res = await fetch(`https://api.frankfurter.app/latest?from=${primaryCode}&to=${targetCode}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.rates && data.rates[targetCode]) {
                                    rate = data.rates[targetCode];
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to fetch real-time rate for snapshot lock, using fallback:', e);
                        }

                        historicalConvertedAmount = parseFloat((priceNum * rate).toFixed(2));
                    }

                    // Clean category: if it's 'Others', map it to 'Other'
                    const finalCategory = (item.category === 'Others' ? 'Other' : item.category) as any;

                    addExpense({
                        amount: priceNum,
                        description: item.itemName,
                        category: finalCategory,
                        date: expenseDate,
                        isRemittance,
                        remittanceCode: isRemittance ? homeCurrencyCode : undefined,
                        historicalPrimarySymbol,
                        historicalHomeSymbol,
                        historicalConvertedAmount,
                    });
                }

                setScannedData(null);
                setInput('');
                onClose();
            } catch (error: any) {
                Alert.alert('Error Saving Scanned Expenses', error.message || 'Failed to save.');
            } finally {
                setIsParsing(false);
            }
            return;
        }

        // Standard Natural Language submission path
        if (!input.trim()) {
            Alert.alert('Error', 'Please enter an expense description');
            return;
        }

        // Check for Debt (Lend/Borrow)
        const debtData = parseDebt(input);
        if (debtData) {
            const expenseDate = new Date().toISOString();
            const expenseId = Date.now().toString();

            const newSplit: SplitExpense = {
                id: `${expenseId}_${debtData.type}`,
                expenseId,
                friendName: debtData.friendName,
                amount: debtData.amount,
                description: debtData.description,
                category: 'Other',
                date: expenseDate,
                isPaid: false,
                createdAt: expenseDate,
                type: debtData.type,
            };

            addSplitExpenses([newSplit]);

            if (debtData.type === 'lend') {
                // Lending is NOT added to expenses, only Friends tab
                Alert.alert("Lending Recorded", "Tracked in Friends tab.");
            } else {
                // Borrowing
                Alert.alert("Borrowing Recorded", "Tracked in Friends tab.");
            }

            setInput('');
            onClose();
            return;
        }

        setIsParsing(true);
        try {
            const parsed = await parseExpenseWithAI(input, colors.currencySymbol, homeCurrencyCode);

            if (!parsed.amount || isNaN(parsed.amount) || parsed.amount === 0) {
                Alert.alert('Missing Amount', `Please mention the price (e.g., 'Coffee 50')`);
                setIsParsing(false);
                return;
            }

            const validation = validateAmount(parsed.amount, colors.currencySymbol);
            if (!validation.valid) {
                Alert.alert('Invalid Amount', validation.error || 'Please enter a valid amount');
                setIsParsing(false);
                return;
            }

            const expenseDate = new Date().toISOString();
            const expenseId = Date.now().toString();

            let splitData: ParsedSplitWithNames | null = null;
            try {
                splitData = parseSplitExpense(input);
            } catch (e) {
                console.error('Split parser failed:', e);
            }

            let userAmount = parsed.amount;

            if (splitData) {
                try {
                    const totalFriendsShare = splitData.amountPerPerson * (splitData.splitCount - 1);
                    userAmount = parsed.amount - totalFriendsShare;
                } catch (e) {
                    console.error('Calculation share failed:', e);
                    splitData = null; // Revert to normal expense if share calc fails
                }
            }

            let historicalPrimarySymbol: string | undefined = undefined;
            let historicalHomeSymbol: string | undefined = undefined;
            let historicalConvertedAmount: number | undefined = undefined;

            if (parsed.category === 'Remittance') {
                parsed.isRemittance = true;
            }

            if (parsed.isRemittance) {
                const targetCode = parsed.remittanceCode || homeCurrencyCode;
                const matchedCountry = currencies.find(c => c.currencyCode === targetCode);
                
                // Map the active symbol to its 3-letter currency code by looking it up in currencies list using currencyCountryName state
                const activeCurrencyEntry = currencies.find(c => c.countryName === currencyCountryName);
                const primaryCode = activeCurrencyEntry ? activeCurrencyEntry.currencyCode : 'INR';
                
                historicalPrimarySymbol = colors.currencySymbol;
                historicalHomeSymbol = matchedCountry ? matchedCountry.currencySymbol : targetCode;
                
                let rate = getFallbackRate(primaryCode, targetCode);

                try {
                    const res = await fetch(`https://api.frankfurter.app/latest?from=${primaryCode}&to=${targetCode}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.rates && data.rates[targetCode]) {
                            rate = data.rates[targetCode];
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch real-time rate for snapshot lock, using fallback:', e);
                }

                historicalConvertedAmount = parseFloat((userAmount * rate).toFixed(2));
            }

            addExpense({
                ...parsed,
                amount: userAmount, 
                date: expenseDate,
                historicalPrimarySymbol,
                historicalHomeSymbol,
                historicalConvertedAmount,
            });

            if (splitData) {
                try {
                    const splits = createSplitExpenses(splitData, expenseId, expenseDate, splitData.friendNames);
                    addSplitExpenses(splits);
                    Alert.alert(
                        'Split Expense Added',
                        `Expense split among ${splitData.splitCount} people. ${splitData.splitCount - 1} friend(s) owe ${colors.currencySymbol}${splitData.amountPerPerson.toFixed(2)} each.`,
                        [{ text: 'OK' }]
                    );
                } catch (e) {
                    console.error('Add split expenses failed:', e);
                    Alert.alert('Partially Saved', 'Main expense saved, but failed to record the splits.');
                }
            }

            setInput('');
            onClose();
        } catch (error: any) {
            let errorMessage = 'Failed to parse expense. Please try again.';
            if (error?.message) errorMessage = error.message;
            
            Alert.alert('Parsing Error', errorMessage);
            console.error('Error parsing expense:', error);
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Add Expense</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                    >
                        {isScanning ? (
                            <View style={styles.scanningContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.scanningText, { color: colors.textSecondary }]}>
                                    AI Scanning Receipt...
                                </Text>
                            </View>
                        ) : scannedData ? (
                            <View style={styles.reviewContainer}>
                                <Text style={[styles.reviewHeader, { color: colors.text }]}>
                                    Review Scanned Items
                                </Text>

                                <View style={styles.itemHeaderRow}>
                                    <Text style={[styles.itemHeaderLabel, { flex: 3.5, color: colors.textSecondary }]}>Item Name</Text>
                                    <Text style={[styles.itemHeaderLabel, { flex: 1.8, color: colors.textSecondary }]}>Price ({colors.currencySymbol})</Text>
                                    <Text style={[styles.itemHeaderLabel, { flex: 2.2, color: colors.textSecondary }]}>Category</Text>
                                    <View style={{ width: 30 }} />
                                </View>

                                <View style={styles.itemStack}>
                                    {scannedData.items.map((item, index) => {
                                        const cat = item.category === 'Others' ? 'Other' : item.category;
                                        const catColor = CATEGORY_COLORS[cat as any] || colors.primary;
                                        return (
                                            <View key={index} style={styles.itemRow}>
                                                <TextInput
                                                    style={[styles.itemNameInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                                    value={item.itemName}
                                                    onChangeText={(text) => {
                                                        const updatedItems = [...scannedData.items];
                                                        updatedItems[index].itemName = text;
                                                        setScannedData({ items: updatedItems });
                                                    }}
                                                    placeholder="Item name"
                                                    placeholderTextColor={colors.textSecondary}
                                                />
                                                <TextInput
                                                    style={[styles.itemPriceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                                    value={item.price}
                                                    onChangeText={(text) => {
                                                        const updatedItems = [...scannedData.items];
                                                        updatedItems[index].price = text;
                                                        setScannedData({ items: updatedItems });
                                                    }}
                                                    keyboardType="numeric"
                                                    placeholder="0.00"
                                                    placeholderTextColor={colors.textSecondary}
                                                />
                                                <TouchableOpacity
                                                    style={[styles.itemCategoryBtn, { borderColor: catColor }]}
                                                    onPress={() => {
                                                        setActiveItemIndex(index);
                                                        setCategoryModalVisible(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.itemCategoryIndicator, { backgroundColor: catColor }]} />
                                                    <Text style={[styles.itemCategoryBtnText, { color: colors.text }]} numberOfLines={1}>
                                                        {item.category}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteRowBtn}
                                                    onPress={() => {
                                                        const updatedItems = scannedData.items.filter((_, i) => i !== index);
                                                        setScannedData(updatedItems.length > 0 ? { items: updatedItems } : null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Trash2 size={16} color={colors.error || '#EF4444'} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.reviewActions}>
                                    <TouchableOpacity
                                        style={[styles.button, { backgroundColor: colors.primary }]}
                                        onPress={handleSubmit}
                                    >
                                        <Text style={styles.buttonText}>Save Expenses</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { borderColor: colors.border }]}
                                        onPress={() => setScannedData(null)}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                                            Cancel Scan
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.label, { color: colors.text }]}>
                                    Describe your expense naturally
                                </Text>
                                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                    e.g., "Coffee 50 morning", "Lunch 400 split 4 with John, Sarah, Mike", "Dinner 600 split 2 with Alex"
                                </Text>

                                <View style={styles.inputContainer}>
                                    <TouchableOpacity
                                        style={[styles.galleryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={handleGalleryScan}
                                        activeOpacity={0.7}
                                    >
                                        <ImageIcon size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: colors.background,
                                                borderColor: colors.border,
                                                color: colors.text,
                                                paddingRight: 56,
                                                paddingLeft: 56,
                                            }
                                        ]}
                                        placeholder={placeholders[placeholderIndex]}
                                        placeholderTextColor={colors.textSecondary}
                                        value={input}
                                        onChangeText={setInput}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                        autoFocus
                                        maxLength={140}
                                    />
                                    <TouchableOpacity
                                        style={[styles.cameraButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={handleCameraScan}
                                        activeOpacity={0.7}
                                    >
                                        <CameraIcon size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.primary }, isParsing && styles.buttonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={isParsing}
                                >
                                    {isParsing ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.buttonText}>Add Expense</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.examples}>
                                    <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>Quick Examples:</Text>
                                    {[
                                        `Lunch 150`,
                                        'Dinner 400 split 4 with John, Sarah, Mike',
                                        'Movie 300 split 2 with Alex',
                                        `Coffee 50 morning`,
                                        'Borrowed 500 from Ram',
                                        'Lent 200 to Sam'
                                    ].map((example, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.exampleChip, { backgroundColor: colors.background }]}
                                            onPress={() => setInput(example)}
                                        >
                                            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{example}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>

                {/* Category Selection Modal */}
                <Modal
                    visible={categoryModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        setCategoryModalVisible(false);
                        setActiveItemIndex(null);
                    }}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => {
                            setCategoryModalVisible(false);
                            setActiveItemIndex(null);
                        }}
                    >
                        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
                                <TouchableOpacity onPress={() => {
                                    setCategoryModalVisible(false);
                                    setActiveItemIndex(null);
                                }}>
                                    <X size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.modalScroll}>
                                <View style={styles.modalOptionsContainer}>
                                    {CATEGORIES.map((cat) => {
                                        const catColor = CATEGORY_COLORS[cat] || colors.primary;
                                        return (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.modalOption, { borderColor: colors.border }]}
                                                onPress={() => handleCategorySelect(cat)}
                                            >
                                                <View style={[styles.modalOptionIndicator, { backgroundColor: catColor }]} />
                                                <Text style={[styles.modalOptionText, { color: colors.text }]}>{cat}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    hint: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        backgroundColor: '#F9FAFB',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    examples: {
        gap: 8,
    },
    examplesTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    exampleChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    exampleText: {
        fontSize: 14,
        color: '#4B5563',
    },
    scrollContent: {
        maxHeight: '100%',
    },
    scrollContentContainer: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    inputContainer: {
        position: 'relative',
        width: '100%',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 32,
        right: 12,
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    galleryButton: {
        position: 'absolute',
        bottom: 32,
        left: 12,
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    scanningContainer: {
        paddingVertical: 50,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    scanningText: {
        fontSize: 16,
        fontWeight: '600',
    },
    reviewContainer: {
        width: '100%',
        gap: 12,
    },
    reviewHeader: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    categoriesScroll: {
        marginVertical: 8,
    },
    categoriesContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    categoryBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    reviewActions: {
        marginTop: 16,
        gap: 12,
    },
    cancelButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    itemHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    itemStack: {
        gap: 10,
        marginBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemNameInput: {
        flex: 3.5,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        height: 38,
    },
    itemPriceInput: {
        flex: 1.8,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        height: 38,
    },
    itemCategoryBtn: {
        flex: 2.2,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 38,
        gap: 6,
    },
    itemCategoryIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    itemCategoryBtnText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    deleteRowBtn: {
        width: 30,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 320,
        maxHeight: '60%',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
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
    modalScroll: {
        flexGrow: 0,
    },
    modalOptionsContainer: {
        gap: 8,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 10,
    },
    modalOptionIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});