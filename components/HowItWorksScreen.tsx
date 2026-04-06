import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import {
    Wallet,
    History,
    Users,
    Settings,
    Bell,
    PlusCircle,
    CheckCircle,
    PieChart,
    AlertCircle,
    DollarSign,
    Bot,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface GuideSection {
    icon: React.ReactElement;
    title: string;
    description: string;
    steps?: string[];
}

interface HowItWorksScreenProps {
    onGetStarted?: () => void;
    showGetStartedButton?: boolean;
    onClose?: () => void;
}

export default function HowItWorksScreen({ onGetStarted, showGetStartedButton = false, onClose }: HowItWorksScreenProps) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const sections: GuideSection[] = [
        {
            icon: <Wallet size={28} color={colors.primary} />,
            title: 'What is this App?',
            description: 'This is a comprehensive expense tracking app that helps you manage your finances, track spending, set budgets, split bills with friends, and stay on top of your financial goals.',
        },
        {
            icon: <DollarSign size={28} color={colors.success} />,
            title: 'Set Your Budget',
            description: 'Start by setting a budget for a specific period to manage your spending effectively.',
            steps: [
                'Go to the Expenses tab',
                'Tap "Set Budget" button',
                'Enter budget amount and duration (e.g. "5000 for 10 days")',
                'Type "Add 2000" to top up existing budget without resetting dates',
                'Your budget will track spending automatically',
            ],
        },
        {
            icon: <PlusCircle size={28} color={colors.primary} />,
            title: 'Add Expenses',
            description: 'Track your daily spending by adding expenses with natural language.',
            steps: [
                'Tap the + button on the Expenses tab',
                'Type your expense naturally (e.g., "Lunch 450 food")',
                'Or split bills: "Dinner 800 split 4 person"',
                'Track debts: "Lend 500 to Ram" or "Borrow 200 from Sam"',
                'These debt transactions appear in Friends tab, not Total Expenses',
            ],
        },
        {
            icon: <PieChart size={28} color={colors.warning} />,
            title: 'View Expenses',
            description: 'Your expenses are organized and easy to view.',
            steps: [
                'See total spending at the top of Expenses tab',
                'View budget progress card with remaining amount',
                'Filter expenses by category',
                'Each expense shows description, amount, and category',
                'Swipe or tap to delete individual expenses',
            ],
        },
        {
            icon: <History size={28} color={colors.primary} />,
            title: 'History Tab',
            description: 'Track your spending over time and analyze patterns.',
            steps: [
                'View monthly and total expense summaries',
                'See all expenses in chronological order',
                'Search expenses by description or date',
                'View budget history and transactions',
                'Track when budgets were set or updated',
            ],
        },
        {
            icon: <Users size={28} color={colors.primary} />,
            title: 'Friends & Split Bills',
            description: 'Manage shared expenses and track who owes you money.',
            steps: [
                'Split bills by adding "split X person" when creating expense',
                'Go to Friends tab to see all people who owe money',
                'View each friend\'s pending amount',
                'Mark as paid with the checkmark button when settled',
                'Delete friend records with the trash icon',
            ],
        },
        {
            icon: <Bell size={28} color={colors.error} />,
            title: 'Notifications',
            description: 'Stay informed about your spending and bills.',
            steps: [
                'Enable notifications in Settings',
                'Get alerts when approaching budget limit',
                'Set up recurring bill reminders',
                'Receive daily spending limit alerts',
                'Budget period ending reminders',
            ],
        },
        {
            icon: <PieChart size={28} color={colors.primary} />,
            title: 'Spending Insights',
            description: 'Visualize your spending habits with the new Insights tab.',
            steps: [
                'View a Donut Chart of your monthly spending',
                'See category breakdown with percentages and totals',
                'Toggle between months to compare spending',
                'Track progress bars for each category',
            ],
        },
        {
            icon: <Bot size={28} color={colors.primary} />,
            title: 'AI Financial Assistant',
            description: 'Get personalized insights and help with your finances.',
            steps: [
                'Double-tap anywhere on the screen to trigger the AI',
                'Ask about your spending distribution: "How much did I spend on Snacks?"',
                'Get help with budgeting and financial goals',
                'Analyze your budget history through conversational AI',
            ],
        },
        {
            icon: <CheckCircle size={28} color={colors.success} />,
            title: 'Quick Tips',
            description: 'Get the most out of your expense tracker.',
            steps: [
                'Use natural language: "Coffee 80 snacks" or "Tea 20" works perfectly',
                'Double-tap to quickly chat with your AI assistant',
                'View Budget History and transactions in the History tab',
                'Use the "Snacks" category for daily small expenses like tea/chai',
                'Set realistic budgets to avoid overspending',
                'Check Insights regularly to understand spending patterns',
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>How It Works</Text>
                    <Text style={styles.subtitle}>
                        Learn how to manage your finances with this expense tracking app
                    </Text>
                </View>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                {section.icon}
                            </View>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>

                        <Text style={styles.sectionDescription}>{section.description}</Text>

                        {section.steps && (
                            <View style={styles.stepsList}>
                                {section.steps.map((step, stepIndex) => (
                                    <View key={stepIndex} style={styles.stepItem}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>{stepIndex + 1}</Text>
                                        </View>
                                        <Text style={styles.stepText}>{step}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.footer}>
                    <AlertCircle size={20} color={colors.textSecondary} />
                    <Text style={styles.footerText}>
                        Your data is automatically saved to your device and persists across sessions.
                        Backups are created automatically to ensure your data is safe.
                    </Text>
                </View>

                {(showGetStartedButton || onClose) && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.getStartedButton}
                            onPress={showGetStartedButton ? onGetStarted : onClose}
                        >
                            <Text style={styles.getStartedButtonText}>
                                {showGetStartedButton ? 'Got it - Start using app' : 'Back to Settings'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    section: {
        marginHorizontal: 20,
        marginTop: 20,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    sectionDescription: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    stepsList: {
        gap: 12,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.surface,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: colors.text,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: 20,
        marginTop: 24,
        padding: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        gap: 12,
    },
    footerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textSecondary,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    getStartedButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    getStartedButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.surface,
    },
});
