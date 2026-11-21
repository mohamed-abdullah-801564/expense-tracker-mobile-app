import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Platform,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
    Moon,
    Sun,
    Bell,
    Plus,
    Trash2,
    Calendar,
    DollarSign,
    Download,
    Database,
    Shield,
    HelpCircle,
    Star,
    FileText,
    Landmark,
    Sliders,
    Smartphone,
    Zap,
    Sparkles,
    CloudUpload,
    CloudDownload,
    Crown,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/hooks/theme-store';
import { useNotifications } from '@/hooks/notification-store';
import { useExpenses } from '@/hooks/expense-store';
import { useAutoTracking } from '@/hooks/use-auto-tracking';
import { useSubscription } from '@/hooks/subscription-store';
import { ExpenseCategory } from '@/types/expense';
import HowItWorksScreen from '@/components/HowItWorksScreen';
import CurrencyPicker from './CurrencyPicker';
import { parseBankStatementCsv, ParsedBankTransaction } from '@/utils/bank-statement-parser';
import CsvImportModal from '@/components/CsvImportModal';
import { posthog, posthogLogger } from '@/utils/posthog';

const categories: ExpenseCategory[] = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];

export default function SettingsScreen() {
    const {
        colors,
        isDarkMode,
        toggleTheme,
        currencyCountryName,
        updateCurrencyCountryName,
        homeCurrencyCountryName,
        updateHomeCurrencyCountryName
    } = useTheme();
    const {
        settings,
        updateSettings,
        recurringBills,
        addRecurringBill,
        removeRecurringBill,
        toggleBillActive
    } = useNotifications();
    const {
        allExpenses,
        budget,
        budgetHistory,
        exportAllData,
        importAllData,
        createBackup,
        setFeedbackModalVisible,
        addExpense,
        dashboardMode,
        setDashboardMode
    } = useExpenses();
    const {
        isAutoTrackingEnabled,
        setAutoTrackingEnabled,
        processNotification
    } = useAutoTracking();
    const {
        isPro,
        plan,
        trialActive,
        trialDaysRemaining,
        csvImportsUsed,
        maxFreeCsvImports,
        canUseFeature,
        recordCsvImport,
        openPaywall,
        cancelPro,
    } = useSubscription();

    const [showAddBill, setShowAddBill] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
    const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
    const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
    const [csvTransactions, setCsvTransactions] = useState<ParsedBankTransaction[]>([]);
    const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
    const [isImportingCsv, setIsImportingCsv] = useState<boolean>(false);
    const [billForm, setBillForm] = useState({
        name: '',
        amount: '',
        category: 'Other' as ExpenseCategory,
        dueDate: '',
        frequency: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    });

    const readFileContent = async (asset: DocumentPicker.DocumentPickerAsset): Promise<string> => {
        // Strategy 1: If asset.file has text() method (Web / Blob File API)
        if (asset.file && typeof (asset.file as any).text === 'function') {
            try {
                return await (asset.file as any).text();
            } catch (e) {
                console.log('asset.file.text() failed, trying other methods:', e);
            }
        }

        const uri = asset.uri;

        // Strategy 2: Global fetch (React Native handles file:// and content:// URIs directly via OkHttp / ContentResolver)
        try {
            const response = await fetch(uri);
            const text = await response.text();
            if (text && text.trim().length > 0) {
                return text;
            }
        } catch (fetchErr) {
            console.log('fetch file reader failed, falling back to FileSystem:', fetchErr);
        }

        // Strategy 3: FileSystem.readAsStringAsync (Legacy Expo FileSystem)
        try {
            const text = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            if (text && text.trim().length > 0) {
                return text;
            }
        } catch (fsErr) {
            console.warn('FileSystem.readAsStringAsync failed:', fsErr);
            throw fsErr;
        }

        throw new Error('File content is empty or unreadable');
    };

    const handleManageSubscription = () => {
        Alert.alert(
            'Expense Tracker Pro Active 👑',
            `Plan: ${plan === 'yearly' ? 'Annual Pro (Billed Yearly)' : plan === 'monthly' ? 'Monthly Pro (Billed Monthly)' : 'Lifetime Pro'}\n\nStatus: Active (Development / Test Sandbox)\n\nAll Pro Features Unlocked:\n• Automatic UPI Payment Detection\n• Unlimited Gemini AI Receipt Scans\n• Unlimited Bank Statement CSV Imports\n• Google Drive Auto-Sync & Cloud Backup\n\nNote: In development test mode, subscriptions are simulated on-device. Live subscriptions appear in Google Play after publishing to Play Store.`,
            [
                {
                    text: 'Switch Plan',
                    onPress: () => openPaywall('settings'),
                },
                {
                    text: 'Reset Test Pro',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Reset Subscription',
                            'Are you sure you want to reset back to the free tier for testing?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Reset to Free',
                                    style: 'destructive',
                                    onPress: async () => {
                                        await cancelPro();
                                        Alert.alert('Reset Complete', 'You are now back on the free plan.');
                                    }
                                }
                            ]
                        );
                    }
                },
                { text: 'Done', style: 'cancel' },
            ]
        );
    };

    const handleImportCsv = async () => {
        if (!canUseFeature('csv_import')) {
            openPaywall('csv_limit');
            return;
        }
        setIsImportingCsv(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                setIsImportingCsv(false);
                return;
            }

            const asset = result.assets[0];
            const csvContent = await readFileContent(asset);

            const parsed = parseBankStatementCsv(csvContent);
            if (parsed.length === 0) {
                Alert.alert(
                    'No Debit Expenses Found',
                    'Could not find any debit transaction rows in the selected CSV file. Please make sure you uploaded a valid Indian bank statement.'
                );
                setIsImportingCsv(false);
                return;
            }

            setCsvTransactions(parsed);
            setShowCsvModal(true);
        } catch (error: any) {
            console.error('Error importing CSV bank statement:', error);
            Alert.alert('Import Failed', 'An error occurred while reading the CSV file.');
        } finally {
            setIsImportingCsv(false);
        }
    };

    const handleConfirmCsvImport = (selectedItems: ParsedBankTransaction[]) => {
        if (selectedItems.length === 0) return;

        const isDuplicate = (item: ParsedBankTransaction) => {
            return allExpenses.some(
                e => !e.isDeleted &&
                e.date === item.date &&
                Math.abs(e.amount - item.amount) < 0.01 &&
                e.description.trim().toLowerCase() === item.description.trim().toLowerCase()
            );
        };

        const duplicates = selectedItems.filter(isDuplicate);
        const nonDuplicates = selectedItems.filter(item => !isDuplicate(item));

        const executeImport = async (itemsToImport: ParsedBankTransaction[]) => {
            if (itemsToImport.length === 0) {
                setShowCsvModal(false);
                Alert.alert('No New Expenses', 'All selected items were duplicates and were skipped.');
                return;
            }

            const expensesToAdd = itemsToImport.map(item => ({
                amount: item.amount,
                description: item.description,
                category: item.category,
                date: item.date,
                source: 'bank_statement' as const,
            }));

            addExpense(expensesToAdd);
            await recordCsvImport();
            posthog?.capture('csv_import_completed', {
                imported_item_count: itemsToImport.length,
                selected_item_count: selectedItems.length,
                skipped_duplicate_count: selectedItems.length - itemsToImport.length,
            });
            posthogLogger?.info('csv_import_persisted', {
                imported_item_count: itemsToImport.length,
                skipped_duplicate_count: selectedItems.length - itemsToImport.length,
            });
            setShowCsvModal(false);

            Alert.alert(
                'Import Successful',
                `Successfully imported ${itemsToImport.length} expenses from bank statement!`,
                [{ text: 'OK' }]
            );
        };

        if (duplicates.length > 0) {
            Alert.alert(
                'Potential Duplicates Detected',
                `${duplicates.length} of the ${selectedItems.length} selected transaction(s) match existing expenses with the same date, amount, and description.\n\nWould you like to skip duplicates?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Skip Duplicates', onPress: () => executeImport(nonDuplicates) },
                    { text: 'Import All', onPress: () => executeImport(selectedItems) },
                ]
            );
        } else {
            executeImport(selectedItems);
        }
    };

    const styles = createStyles(colors);

    const handleAddBill = () => {
        if (!billForm.name || !billForm.amount || !billForm.dueDate) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        addRecurringBill({
            name: billForm.name,
            amount: parseFloat(billForm.amount),
            category: billForm.category,
            dueDate: billForm.dueDate,
            frequency: billForm.frequency,
            isActive: true,
        });

        setBillForm({
            name: '',
            amount: '',
            category: 'Other',
            dueDate: '',
            frequency: 'monthly',
        });
        setShowAddBill(false);
    };

    const handleDeleteBill = (id: string, name: string) => {
        Alert.alert(
            'Delete Bill',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => removeRecurringBill(id) },
            ]
        );
    };

    const handleExportData = async () => {
        if (Platform.OS === 'web') {
            setIsExporting(true);
            try {
                const data = await exportAllData();
                if (data && data.expenses && Array.isArray(data.expenses)) {
                    let report = "Description,Amount,Date,Category\n";

                    // Sort expenses by date (newest first)
                    const sortedExpenses = [...data.expenses].sort((a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    sortedExpenses.forEach((item: any) => {
                        if (item.isDeleted) return;
                        const dateObj = new Date(item.date);
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        const escapedDescription = `"${item.description.replace(/"/g, '""')}"`;

                        report += `${escapedDescription},${item.amount.toFixed(2)},${formattedDate},${item.category}\n`;
                    });

                    // Web download fallback
                    const blob = new Blob([report], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'expenses_export.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    Alert.alert('Success', 'Expense report downloaded successfully!');
                } else {
                    Alert.alert('Export Failed', 'No data to export.');
                }
            } catch (error) {
                console.error('Export error:', error);
                Alert.alert('Export Failed', 'An error occurred while exporting data.');
            } finally {
                setIsExporting(false);
            }
            return;
        }

        setIsExporting(true);
        try {
            const data = await exportAllData();
            if (data && data.expenses && Array.isArray(data.expenses)) {
                let report = "Description,Amount,Date,Category\n";

                // Sort expenses by date (newest first)
                const sortedExpenses = [...data.expenses].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                sortedExpenses.forEach((item: any) => {
                    if (item.isDeleted) return;
                    const dateObj = new Date(item.date);
                    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                    const escapedDescription = `"${item.description.replace(/"/g, '""')}"`;

                    report += `${escapedDescription},${item.amount.toFixed(2)},${formattedDate},${item.category}\n`;
                });

                const fileUri = FileSystem.documentDirectory + 'expenses_export.csv';

                await FileSystem.writeAsStringAsync(fileUri, report);

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert('Sharing Unavailable', 'Sharing is not available on this device');
                }
            } else {
                Alert.alert('Export Failed', 'No data to export.');
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', 'An error occurred while exporting data.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            const data = await exportAllData();
            if (!data) {
                Alert.alert('Backup Failed', 'No data available to backup.');
                return;
            }

            const jsonString = JSON.stringify(data, null, 2);
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `expense_tracker_backup_${dateStr}.json`;

            if (Platform.OS === 'web') {
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                Alert.alert('Backup Created', 'Backup file downloaded successfully.');
                return;
            }

            const fileUri = FileSystem.documentDirectory + fileName;
            await FileSystem.writeAsStringAsync(fileUri, jsonString);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Save Backup to Google Drive / Files',
                    UTI: 'public.json',
                });
            } else {
                Alert.alert('Backup Created', `Saved to ${fileName}`);
            }
        } catch (error) {
            console.error('Backup error:', error);
            Alert.alert('Backup Failed', 'Failed to create backup. Please try again.');
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleRestoreBackup = async () => {
        setIsRestoringBackup(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/json', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            const content = await readFileContent(asset);
            const parsed = JSON.parse(content);

            if (!parsed || (!parsed.expenses && !parsed.budget)) {
                Alert.alert(
                    'Invalid Backup File',
                    'The selected file does not appear to be a valid Expense Tracker backup.'
                );
                return;
            }

            const expenseCount = Array.isArray(parsed.expenses) ? parsed.expenses.length : 0;
            const hasBudget = !!parsed.budget;

            Alert.alert(
                'Confirm Restore',
                `Found ${expenseCount} expense(s)${hasBudget ? ' and budget plan' : ''} in this backup.\n\nRestoring will replace current expenses with this backup. Do you want to proceed?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Restore Now',
                        style: 'destructive',
                        onPress: async () => {
                            const success = await importAllData(parsed);
                            if (success) {
                                Alert.alert(
                                    'Restore Successful 🎉',
                                    `Successfully restored ${expenseCount} expenses and your financial history!`
                                );
                            } else {
                                Alert.alert('Restore Failed', 'Could not restore backup data.');
                            }
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Restore error:', error);
            Alert.alert('Restore Failed', 'Failed to read or parse the selected backup file.');
        } finally {
            setIsRestoringBackup(false);
        }
    };

    const getStorageStats = () => {
        return {
            expenses: allExpenses.length,
            budget: budget ? 1 : 0,
            budgetTransactions: budgetHistory.length,
            recurringBills: recurringBills.length,
        };
    };

    const stats = getStorageStats();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.howItWorksButton}
                        onPress={() => setShowHowItWorks(true)}
                    >
                        <View style={styles.settingLeft}>
                            <HelpCircle size={20} color={colors.primary} />
                            <Text style={styles.howItWorksText}>How It Works - App Guide</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Luxury VIP Pro Subscription Card */}
                <View style={[styles.section, { padding: 0, overflow: 'hidden', backgroundColor: 'transparent' }]}>
                    {isPro ? (
                        <TouchableOpacity
                            style={styles.luxuryProCard}
                            onPress={handleManageSubscription}
                            activeOpacity={0.88}
                        >
                            {/* Top Row: Crown Badge & Status */}
                            <View style={styles.luxuryHeaderRow}>
                                <View style={styles.luxuryBadge}>
                                    <Crown size={15} color="#F59E0B" />
                                    <Text style={styles.luxuryBadgeText}>EXPENSE TRACKER PRO</Text>
                                </View>
                                <View style={styles.goldStatusPill}>
                                    <Text style={styles.goldStatusPillText}>
                                        {plan === 'yearly' ? '👑 ANNUAL VIP' : plan === 'monthly' ? '👑 MONTHLY VIP' : '👑 ACTIVE'}
                                    </Text>
                                </View>
                            </View>

                            {/* Middle Title & Subtitle */}
                            <Text style={styles.luxuryTitle}>All Premium Features Unlocked</Text>
                            <Text style={styles.luxurySubtitle}>
                                100% on-device privacy • Unlimited AI & auto-tracking
                            </Text>

                            {/* Feature Chips */}
                            <View style={styles.chipRow}>
                                <View style={styles.chip}>
                                    <Text style={styles.chipText}>⚡ Auto-UPI</Text>
                                </View>
                                <View style={styles.chip}>
                                    <Text style={styles.chipText}>📸 Gemini OCR</Text>
                                </View>
                                <View style={styles.chip}>
                                    <Text style={styles.chipText}>☁️ Drive Sync</Text>
                                </View>
                            </View>

                            {/* Action Bar */}
                            <View style={styles.luxuryActionBar}>
                                <Text style={styles.luxuryActionText}>Manage Subscription</Text>
                                <Text style={styles.luxuryArrow}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ) : trialActive ? (
                        <TouchableOpacity
                            style={[styles.luxuryProCard, { borderColor: colors.primary }]}
                            onPress={() => openPaywall('settings')}
                            activeOpacity={0.88}
                        >
                            <View style={styles.luxuryHeaderRow}>
                                <View style={[styles.luxuryBadge, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '18' }]}>
                                    <Sparkles size={15} color={colors.primary} />
                                    <Text style={[styles.luxuryBadgeText, { color: colors.primary }]}>PRO TRIAL ACTIVE</Text>
                                </View>
                                <View style={[styles.goldStatusPill, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.goldStatusPillText, { color: '#FFFFFF' }]}>
                                        {trialDaysRemaining} DAYS LEFT
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.luxuryTitle}>Enjoying Pro Features?</Text>
                            <Text style={styles.luxurySubtitle}>
                                Lock in 33% annual savings before your trial ends.
                            </Text>

                            <View style={styles.chipRow}>
                                <View style={styles.chip}><Text style={styles.chipText}>⚡ Auto-UPI</Text></View>
                                <View style={styles.chip}><Text style={styles.chipText}>📸 Gemini OCR</Text></View>
                                <View style={styles.chip}><Text style={styles.chipText}>☁️ Drive Sync</Text></View>
                            </View>

                            <View style={styles.luxuryActionBar}>
                                <Text style={[styles.luxuryActionText, { color: colors.primary }]}>View Plans & Save 33%</Text>
                                <Text style={[styles.luxuryArrow, { color: colors.primary }]}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.luxuryProCard}
                            onPress={() => openPaywall('settings')}
                            activeOpacity={0.88}
                        >
                            <View style={styles.luxuryHeaderRow}>
                                <View style={styles.luxuryBadge}>
                                    <Crown size={15} color="#F59E0B" />
                                    <Text style={styles.luxuryBadgeText}>EXPENSE TRACKER PRO</Text>
                                </View>
                                <View style={styles.goldStatusPill}>
                                    <Text style={styles.goldStatusPillText}>SAVE 33%</Text>
                                </View>
                            </View>

                            <Text style={styles.luxuryTitle}>Automate Your Finances</Text>
                            <Text style={styles.luxurySubtitle}>
                                Auto-track UPI payments, unlimited Gemini AI receipt scans, bank imports & cloud backup.
                            </Text>

                            <View style={styles.chipRow}>
                                <View style={styles.chip}><Text style={styles.chipText}>⚡ Auto-UPI</Text></View>
                                <View style={styles.chip}><Text style={styles.chipText}>📸 Gemini OCR</Text></View>
                                <View style={styles.chip}><Text style={styles.chipText}>📄 Bank CSVs</Text></View>
                                <View style={styles.chip}><Text style={styles.chipText}>☁️ Cloud Sync</Text></View>
                            </View>

                            <View style={styles.luxuryCtaRow}>
                                <View style={styles.luxuryCtaButton}>
                                    <Sparkles size={14} color="#FFFFFF" />
                                    <Text style={styles.luxuryCtaButtonText}>Upgrade to Pro • View Plans</Text>
                                    <Text style={[styles.luxuryArrow, { color: '#FFFFFF', fontSize: 16 }]}>›</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            {isDarkMode ? <Moon size={20} color={colors.text} /> : <Sun size={20} color={colors.text} />}
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                    <View style={[styles.settingItem, { borderBottomWidth: 0, paddingBottom: 6 }]}>
                        <View style={styles.settingLeft}>
                            <DollarSign size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Primary Currency</Text>
                        </View>
                    </View>
                    <View style={{ paddingTop: 4, paddingBottom: 12 }}>
                        <CurrencyPicker
                            selectedCountryName={currencyCountryName}
                            onSelectCountryName={updateCurrencyCountryName}
                        />
                    </View>
                    <View style={[styles.settingItem, { borderBottomWidth: 0, paddingBottom: 6, paddingTop: 12 }]}>
                        <View style={styles.settingLeft}>
                            <DollarSign size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Home Country Currency (For Remittance)</Text>
                        </View>
                    </View>
                    <View style={{ paddingTop: 4, paddingBottom: 12 }}>
                        <CurrencyPicker
                            selectedCountryName={homeCurrencyCountryName}
                            onSelectCountryName={updateHomeCurrencyCountryName}
                            title="Select Home Country Currency"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Financial Tracking Mode</Text>
                    <View style={[styles.settingItem, { borderBottomWidth: 0, paddingBottom: 6 }]}>
                        <View style={styles.settingLeft}>
                            <Sliders size={20} color={colors.text} />
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.settingLabel}>Dashboard Mode</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                    {dashboardMode === 'income'
                                        ? 'Income mode: Track monthly salary, cash flow & net savings'
                                        : 'Budget mode: Track spending limits, remaining allowance & daily caps'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.modeToggleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.modeToggleButton,
                                dashboardMode === 'budget' && [styles.modeToggleActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => setDashboardMode('budget')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.modeToggleText,
                                dashboardMode === 'budget' ? styles.modeToggleTextActive : { color: colors.text }
                            ]}>
                                Budget Mode
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modeToggleButton,
                                dashboardMode === 'income' && [styles.modeToggleActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => setDashboardMode('income')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.modeToggleText,
                                dashboardMode === 'income' ? styles.modeToggleTextActive : { color: colors.text }
                            ]}>
                                Income Mode
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Bell size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Budget Alerts</Text>
                        </View>
                        <Switch
                            value={settings.budgetAlerts}
                            onValueChange={(value) => updateSettings({ budgetAlerts: value })}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <DollarSign size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Daily Limit Alerts</Text>
                        </View>
                        <Switch
                            value={settings.dailyLimitAlerts}
                            onValueChange={(value) => updateSettings({ dailyLimitAlerts: value })}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Calendar size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Recurring Bill Reminders</Text>
                        </View>
                        <Switch
                            value={settings.recurringBillReminders}
                            onValueChange={(value) => updateSettings({ recurringBillReminders: value })}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Bell size={20} color={colors.text} />
                            <Text style={styles.settingLabel}>Budget Period Reminders</Text>
                        </View>
                        <Switch
                            value={settings.budgetPeriodReminders}
                            onValueChange={(value) => updateSettings({ budgetPeriodReminders: value })}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { alignItems: 'center', marginBottom: 12 }]}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                            Auto-Tracking (UPI)
                        </Text>
                        {!isPro && !trialActive && (
                            <TouchableOpacity
                                style={[styles.proTrialBadge, { backgroundColor: colors.primary + '18' }]}
                                onPress={() => openPaywall('auto_upi')}
                                activeOpacity={0.7}
                            >
                                <Sparkles size={12} color={colors.primary} />
                                <Text style={[styles.proTrialBadgeText, { color: colors.primary }]}>
                                    7-DAY TRIAL
                                </Text>
                            </TouchableOpacity>
                        )}
                        {trialActive && (
                            <View style={[styles.proTrialBadge, { backgroundColor: colors.primary + '18' }]}>
                                <Text style={[styles.proTrialBadgeText, { color: colors.primary }]}>
                                    TRIAL: {trialDaysRemaining}D
                                </Text>
                            </View>
                        )}
                        {isPro && (
                            <View style={[styles.proTrialBadge, { backgroundColor: '#10B98118' }]}>
                                <Text style={[styles.proTrialBadgeText, { color: '#10B981' }]}>
                                    PRO
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.settingItem, { borderBottomWidth: 0, paddingBottom: 6 }]}>
                        <View style={[styles.settingLeft, { flex: 1, paddingRight: 12 }]}>
                            <Smartphone size={20} color={colors.text} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Track UPI & Bank Alerts</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 }}>
                                    Auto-records expenses from Google Pay, PhonePe, Paytm, CRED and Banks on-device.
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isAutoTrackingEnabled}
                            onValueChange={(val) => {
                                if (val && !canUseFeature('auto_upi')) {
                                    openPaywall('auto_upi');
                                    return;
                                }
                                setAutoTrackingEnabled(val);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    {isAutoTrackingEnabled && (
                        <TouchableOpacity
                            style={[styles.testTrackingButton, { borderColor: colors.border }]}
                            onPress={() => {
                                Alert.alert(
                                    'Test Auto-Tracking',
                                    'Simulate a payment notification:',
                                    [
                                        {
                                            text: 'GPay ₹450 (Swiggy)',
                                            onPress: async () => {
                                                const res = await processNotification(
                                                    'Paid to Swiggy',
                                                    '₹450.00 paid to Swiggy with Bank Account **1234',
                                                    'com.google.android.apps.nbu.paisa.user'
                                                );
                                                if (res.success) {
                                                    Alert.alert('Auto-Tracked!', 'Successfully recorded ₹450 to Swiggy under Food category.');
                                                }
                                            }
                                        },
                                        {
                                            text: 'PhonePe ₹120 (Chai)',
                                            onPress: async () => {
                                                const res = await processNotification(
                                                    'Payment of ₹120 successful',
                                                    'Paid to Chai Point using HDFC Bank **5678',
                                                    'com.phonepe.app'
                                                );
                                                if (res.success) {
                                                    Alert.alert('Auto-Tracked!', 'Successfully recorded ₹120 to Chai Point under Food category.');
                                                }
                                            }
                                        },
                                        { text: 'Cancel', style: 'cancel' }
                                    ]
                                );
                            }}
                        >
                            <Zap size={16} color={colors.primary} />
                            <Text style={[styles.testTrackingText, { color: colors.primary }]}>
                                Test Notification Auto-Capture
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recurring Bills</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddBill(true)}
                        >
                            <Plus size={20} color={colors.surface} />
                        </TouchableOpacity>
                    </View>

                    {recurringBills.length === 0 ? (
                        <Text style={styles.emptyText}>No recurring bills added yet</Text>
                    ) : (
                        recurringBills.map((bill) => (
                            <View key={bill.id} style={styles.billItem}>
                                <View style={styles.billInfo}>
                                    <Text style={styles.billName}>{bill.name}</Text>
                                    <Text style={styles.billDetails}>
                                        {colors.currencySymbol}{bill.amount} • {bill.category} • {bill.frequency}
                                    </Text>
                                    <Text style={styles.billDue}>Due: {bill.dueDate}</Text>
                                </View>
                                <View style={styles.billActions}>
                                    <Switch
                                        value={bill.isActive}
                                        onValueChange={() => toggleBillActive(bill.id)}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={colors.surface}
                                        style={styles.billSwitch}
                                    />
                                    <TouchableOpacity
                                        onPress={() => handleDeleteBill(bill.id, bill.name)}
                                        style={styles.deleteButton}
                                    >
                                        <Trash2 size={16} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>

                    <View style={styles.statsContainer}>
                        <Text style={styles.statsTitle}>Storage Statistics</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.expenses}</Text>
                                <Text style={styles.statLabel}>Expenses</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.budget}</Text>
                                <Text style={styles.statLabel}>Budget</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.budgetTransactions}</Text>
                                <Text style={styles.statLabel}>Budget History</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{stats.recurringBills}</Text>
                                <Text style={styles.statLabel}>Recurring Bills</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.dataButton}
                        onPress={handleImportCsv}
                        disabled={isImportingCsv}
                    >
                        <View style={styles.settingLeft}>
                            <Landmark size={20} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dataButtonText}>
                                    {isImportingCsv ? 'Reading CSV...' : 'Import Bank Statement (.CSV)'}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                    {isPro
                                        ? 'Unlimited imports (Pro Active)'
                                        : `${Math.max(0, maxFreeCsvImports - csvImportsUsed)} of ${maxFreeCsvImports} free imports left`}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dataButton}
                        onPress={handleExportData}
                        disabled={isExporting}
                    >
                        <View style={styles.settingLeft}>
                            <Download size={20} color={colors.primary} />
                            <Text style={styles.dataButtonText}>
                                {isExporting ? 'Exporting...' : 'Export Data'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dataButton}
                        onPress={handleCreateBackup}
                        disabled={isCreatingBackup}
                    >
                        <View style={styles.settingLeft}>
                            <CloudUpload size={20} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dataButtonText}>
                                    {isCreatingBackup ? 'Creating Backup...' : 'Backup to Google Drive / Files (.JSON)'}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                    Save complete snapshot of expenses & budget to Drive
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dataButton}
                        onPress={handleRestoreBackup}
                        disabled={isRestoringBackup}
                    >
                        <View style={styles.settingLeft}>
                            <CloudDownload size={20} color={colors.success} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dataButtonText}>
                                    {isRestoringBackup ? 'Selecting Backup...' : 'Restore from Google Drive / Files (.JSON)'}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                    Recover data from your Google Drive backup file
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dataButton}
                        onPress={() => setFeedbackModalVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Star size={20} color={colors.primary} />
                            <Text style={styles.dataButtonText}>Give Feedback</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Database size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                            Your financial data stays 100% private on your device. Backup to Google Drive to keep your history safe even if you uninstall the app.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showHowItWorks}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowHowItWorks(false)}
            >
                <View style={styles.guideModalOverlay}>
                    <View style={styles.guideModalContainer}>
                        <View style={styles.guideModalHeader}>
                            <Text style={styles.guideModalTitle}>App Guide</Text>
                            <TouchableOpacity onPress={() => setShowHowItWorks(false)}>
                                <Text style={styles.cancelButton}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <HowItWorksScreen onClose={() => setShowHowItWorks(false)} />
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showAddBill}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddBill(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Recurring Bill</Text>
                        <TouchableOpacity onPress={() => setShowAddBill(false)}>
                            <Text style={styles.cancelButton}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Bill Name *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g., Electricity Bill"
                                placeholderTextColor={colors.textSecondary}
                                value={billForm.name}
                                onChangeText={(text) => setBillForm({ ...billForm, name: text })}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Amount *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="0.00"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={billForm.amount}
                                onChangeText={(text) => setBillForm({ ...billForm, amount: text })}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryChip,
                                            billForm.category === category && styles.categoryChipActive
                                        ]}
                                        onPress={() => setBillForm({ ...billForm, category })}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            billForm.category === category && styles.categoryChipTextActive
                                        ]}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Due Date * (DD/MM/YYYY)</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="15/01/2024"
                                placeholderTextColor={colors.textSecondary}
                                value={billForm.dueDate}
                                onChangeText={(text) => setBillForm({ ...billForm, dueDate: text })}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Frequency</Text>
                            <View style={styles.frequencyRow}>
                                {(['monthly', 'weekly', 'yearly'] as const).map((freq) => (
                                    <TouchableOpacity
                                        key={freq}
                                        style={[
                                            styles.frequencyButton,
                                            billForm.frequency === freq && styles.frequencyButtonActive
                                        ]}
                                        onPress={() => setBillForm({ ...billForm, frequency: freq })}
                                    >
                                        <Text style={[
                                            styles.frequencyButtonText,
                                            billForm.frequency === freq && styles.frequencyButtonTextActive
                                        ]}>
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.addBillButton} onPress={handleAddBill}>
                            <Text style={styles.addBillButtonText}>Add Bill</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <CsvImportModal
                visible={showCsvModal}
                onClose={() => setShowCsvModal(false)}
                transactions={csvTransactions}
                onImport={handleConfirmCsvImport}
            />
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: colors.surface,
        marginHorizontal: 20,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
    },
    proCard: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 14,
        backgroundColor: colors.surface,
    },
    proCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    proIconBadge: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proCardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    proCardSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    proStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    proUpgradeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    proTrialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    proTrialBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    luxuryProCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        padding: 16,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    luxuryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    luxuryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F59E0B18',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F59E0B35',
    },
    luxuryBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#F59E0B',
        letterSpacing: 0.6,
    },
    goldStatusPill: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    goldStatusPillText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#F59E0B',
        letterSpacing: 0.4,
    },
    luxuryTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3,
        marginBottom: 3,
    },
    luxurySubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    chip: {
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipText: {
        fontSize: 11,
        color: colors.text,
        fontWeight: '600',
    },
    luxuryActionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    luxuryActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F59E0B',
    },
    luxuryArrow: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F59E0B',
    },
    luxuryCtaRow: {
        paddingTop: 4,
    },
    luxuryCtaButton: {
        backgroundColor: '#F59E0B',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    luxuryCtaButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 4,
        marginTop: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modeToggleButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeToggleActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    modeToggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modeToggleTextActive: {
        color: '#FFFFFF',
    },
    testTrackingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    testTrackingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    currencySelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 12,
        gap: 6,
    },
    currencyButton: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currencyButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: colors.text,
    },
    addButton: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
    },
    billItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    billInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    billDetails: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    billDue: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    billActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    billSwitch: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    deleteButton: {
        padding: 4,
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
    cancelButton: {
        fontSize: 16,
        color: colors.primary,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryScroll: {
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    categoryChipTextActive: {
        color: colors.surface,
    },
    frequencyRow: {
        flexDirection: 'row',
        gap: 8,
    },
    frequencyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    frequencyButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    frequencyButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    frequencyButtonTextActive: {
        color: colors.surface,
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    addBillButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    addBillButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.surface,
    },
    statsContainer: {
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    dataButton: {
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dataButtonText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.background,
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    howItWorksButton: {
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    howItWorksText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '600',
    },
    guideModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    guideModalContainer: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
        overflow: 'hidden',
    },
    guideModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    guideModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
});