import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Platform,
    LayoutAnimation,
} from 'react-native';
import {
    Wallet,
    Target,
    Users,
    Send,
    ChevronDown,
    ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface HowItWorksScreenProps {
    onGetStarted?: () => void;
    showGetStartedButton?: boolean;
    onClose?: () => void;
    scrollEnabled?: boolean;
}

export default function HowItWorksScreen({ onGetStarted, showGetStartedButton = false, onClose, scrollEnabled = true }: HowItWorksScreenProps) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const cards = [
        {
            icon: <Wallet size={26} color={colors.primary} />,
            title: 'Smart AI Input',
            shortDescription: "Type expenses naturally like 'Coffee 50 morning'.",
            detailedDescription: "Say goodbye to complex forms. Simply type your transaction details naturally, such as 'Lunch 250 food' or 'Taxi 120 transport', and our AI will automatically parse the amount, description, and category instantly.",
        },
        {
            icon: <Target size={26} color={colors.warning} />,
            title: 'Dynamic Budgets',
            shortDescription: 'Track spending ceilings and daily burn limits automatically.',
            detailedDescription: "Set budget amounts and custom periods like '5000 for 10 days'. You can top up your active budget using the 'Add 2000' command, and check your remaining limit or daily burn rate at any time.",
        },
        {
            icon: <Users size={26} color={colors.success} />,
            title: 'Split with Friends',
            shortDescription: 'Track who owes you money safely inside the Friends tab.',
            detailedDescription: "Split bills by writing 'split 4 with John, Sarah' when adding expenses. The app records individual shares, monitors who owes you money, and helps you track and settle up debts in a single tap.",
        },
        {
            icon: <Send size={26} color={colors.primary} />,
            title: 'Global Remittances',
            shortDescription: 'View dynamic home currency conversions for international transfers.',
            detailedDescription: "Remit money and view conversion estimates instantly. Our integration fetches real-time Frankfurter API exchange rates from your local active currency code directly to your home currency code.",
        },
    ];

    const toggleExpand = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const content = (
        <View style={styles.innerContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>How It Works</Text>
                <Text style={styles.subtitle}>
                    Master your finances with four elegant, powerful tools
                </Text>
            </View>

            <View style={styles.rowsContainer}>
                {cards.map((card, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.row,
                                isExpanded && styles.rowExpanded
                            ]}
                            onPress={() => toggleExpand(index)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.rowTop}>
                                <View style={styles.iconContainer}>
                                    {card.icon}
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.rowTitle}>{card.title}</Text>
                                    <Text style={styles.rowDescription}>{card.shortDescription}</Text>
                                </View>
                                <View style={styles.chevronContainer}>
                                    {isExpanded ? (
                                        <ChevronUp size={20} color={colors.textSecondary} />
                                    ) : (
                                        <ChevronDown size={20} color={colors.textSecondary} />
                                    )}
                                </View>
                            </View>
                            {isExpanded && (
                                <View style={styles.rowDetail}>
                                    <Text style={styles.detailText}>{card.detailedDescription}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {(showGetStartedButton || onClose) && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={showGetStartedButton ? onGetStarted : onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionButtonText}>
                            {showGetStartedButton ? 'Got it - Start using app' : 'Back to Settings'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (!scrollEnabled) {
        return (
            <View style={styles.container}>
                {content}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {content}
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
        flexGrow: 1,
    },
    innerContainer: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        paddingVertical: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
        marginTop: Platform.OS === 'android' ? 24 : 0,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 12,
    },
    rowsContainer: {
        gap: 20,
        marginBottom: 40,
    },
    row: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
    rowExpanded: {
        borderColor: colors.primary,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    rowDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    chevronContainer: {
        marginLeft: 8,
    },
    rowDetail: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    detailText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 22,
    },
    buttonContainer: {
        marginTop: 'auto',
        width: '100%',
        paddingVertical: 12,
    },
    actionButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
