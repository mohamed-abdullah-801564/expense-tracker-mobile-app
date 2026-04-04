import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    SafeAreaView,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
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
    HelpCircle
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';
import { useNotifications } from '@/hooks/notification-store';
import { useExpenses } from '@/hooks/expense-store';
import { ExpenseCategory } from '@/types/expense';
import HowItWorksScreen from '@/components/HowItWorksScreen';

const categories: ExpenseCategory[] = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];

export default function SettingsScreen() {
    const { colors, isDarkMode, toggleTheme } = useTheme();
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
        createBackup
    } = useExpenses();

    const [showAddBill, setShowAddBill] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
    const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
    const [billForm, setBillForm] = useState({
        name: '',
        amount: '',
        category: 'Other' as ExpenseCategory,
        dueDate: '',
        frequency: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    });

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
        setIsExporting(true);
        try {
            const data = await exportAllData();
            if (data && data.expenses && Array.isArray(data.expenses)) {
                let report = "EXPENSE REPORT\n----------------\n";

                // Sort expenses by date (newest first)
                const sortedExpenses = [...data.expenses].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                sortedExpenses.forEach((item: any) => {
                    if (item.isDeleted) return;
                    const dateObj = new Date(item.date);
                    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

                    report += `Item: ${item.description}\n`;
                    report += `Amount: ₹${item.amount.toFixed(2)}\n`;
                    report += `Date: ${formattedDate}\n`;
                    report += `Category: ${item.category}\n`;
                    report += "----------------\n";
                });

                const fileUri = FileSystem.documentDirectory + 'expenses-report.txt';

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
            await createBackup();
            Alert.alert(
                'Backup Created',
                'A backup of your data has been created successfully. This backup will be used for recovery if needed.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Backup error:', error);
            Alert.alert('Backup Failed', 'Failed to create backup. Please try again.');
        } finally {
            setIsCreatingBackup(false);
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
                                        ₹{bill.amount} • {bill.category} • {bill.frequency}
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
                            <Shield size={20} color={colors.success} />
                            <Text style={styles.dataButtonText}>
                                {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Database size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                            Your data is automatically saved to device storage and persists across app sessions.
                            Backups are created automatically when you make changes.
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