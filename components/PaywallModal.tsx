import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Platform,
    Alert,
    Animated,
    Switch,
} from 'react-native';
import {
    X,
    Sparkles,
    Check,
    Star,
    Zap,
    Camera,
    FileSpreadsheet,
    ShieldCheck,
    Cloud,
    Crown,
    CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';
import { useSubscription, PaywallReason } from '@/hooks/subscription-store';
import { CelebrationRain } from '@/components/ui/celebration-rain';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    reason?: PaywallReason;
}

export default function PaywallModal({ visible, onClose, reason = 'general' }: PaywallModalProps) {
    const { colors, currencyCode, currencyCountryName } = useTheme();
    const { upgradeToPro, startTrial, trialActive, isPro, restorePurchases } = useSubscription();
    const [isAnnual, setIsAnnual] = useState<boolean>(true);
    const [showCelebration, setShowCelebration] = useState<boolean>(false);
    const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

    // Staggered entrance animation for cards
    const animCard1 = useRef(new Animated.Value(0)).current;
    const animCard2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            animCard1.setValue(0);
            animCard2.setValue(0);

            Animated.stagger(140, [
                Animated.spring(animCard1, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.spring(animCard2, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const styles = createStyles(colors);

    // Dynamic price formatting matching user's currency
    const isIndia = currencyCode === 'INR' || colors.currencySymbol === '₹';
    const currencySymbol = colors.currencySymbol || '₹';

    const pricing = isIndia
        ? {
              monthlyPrice: '99',
              yearlyPrice: '799',
              yearlyMonthlyEquivalent: '66',
              currency: '₹',
              savingsPercent: '33%',
          }
        : {
              monthlyPrice: '1.99',
              yearlyPrice: '14.99',
              yearlyMonthlyEquivalent: '1.25',
              currency: currencySymbol,
              savingsPercent: '37%',
          };

    const handleToggleAnnual = (value: boolean) => {
        setIsAnnual(value);
        if (value) {
            // Trigger gift & confetti celebration rain when annual is chosen!
            setShowCelebration(true);
        }
    };

    const handleSubscribePlan = async (plan: 'yearly' | 'monthly') => {
        setIsSubscribing(true);
        try {
            const success = await upgradeToPro(plan);
            if (success) {
                // Trigger gift rain celebration upon upgrade!
                setShowCelebration(true);
                setTimeout(() => {
                    Alert.alert(
                        'Welcome to Expense Tracker Pro! 👑🎉',
                        `You are now subscribed to the ${plan === 'yearly' ? 'Annual Pro' : 'Monthly Pro'} plan!\n\nAll premium features including Automatic UPI Tracking, Unlimited Gemini OCR scans, and Google Drive sync are active.`,
                        [{ text: 'Start Exploring', onPress: onClose }]
                    );
                }, 600);
            }
        } catch (e) {
            Alert.alert('Subscription Error', 'Could not complete subscription. Please try again.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleStartTrial = async () => {
        try {
            await startTrial();
            setShowCelebration(true);
            setTimeout(() => {
                Alert.alert(
                    '7-Day Free Trial Activated! 🚀',
                    'You now have 7 days of full Pro access including automatic UPI tracking and unlimited AI receipt scans.',
                    [{ text: 'Let’s Go', onPress: onClose }]
                );
            }, 600);
        } catch (e) {
            Alert.alert('Trial Error', 'Could not activate trial.');
        }
    };

    const handleRestore = async () => {
        try {
            const res = await restorePurchases();
            if (res.isPro) {
                setShowCelebration(true);
            }
            Alert.alert(
                'Restore Purchases',
                res.message,
                res.isPro ? [{ text: 'Great!', onPress: onClose }] : [{ text: 'OK' }]
            );
        } catch (e) {
            Alert.alert('Restore Purchases', 'Could not restore purchases. Please try again.');
        }
    };

    const getReasonSubtitle = () => {
        switch (reason) {
            case 'auto_upi':
                return 'Auto-capture UPI payments from GPay, PhonePe, and Paytm with zero manual typing.';
            case 'csv_limit':
                return 'You reached the 3 free bank statement imports limit. Unlock unlimited imports with Pro.';
            case 'ocr_limit':
                return 'You reached the 3 daily AI receipt scans limit. Unlock unlimited instant scans with Pro.';
            default:
                return 'Choose the plan that works for you. Automated UPI tracking, unlimited AI scans & 100% on-device privacy.';
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header with Close */}
                <View style={styles.header}>
                    <View style={styles.badge}>
                        <Crown size={14} color="#F59E0B" />
                        <Text style={styles.badgeText}>EXPENSE TRACKER PRO</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Title & Description */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Simple, Transparent Pricing</Text>
                        <Text style={styles.subtitle}>{getReasonSubtitle()}</Text>
                    </View>

                    {/* Annual Billing Toggle with Savings Badge */}
                    <View style={styles.toggleRow}>
                        <Text style={[styles.toggleLabel, !isAnnual && styles.toggleLabelActive]}>Monthly</Text>
                        <Switch
                            value={isAnnual}
                            onValueChange={handleToggleAnnual}
                            trackColor={{ false: colors.border, true: '#F59E0B' }}
                            thumbColor={colors.surface}
                            style={{ marginHorizontal: 8 }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.toggleLabel, isAnnual && styles.toggleLabelActive]}>Annual billing</Text>
                            <View style={styles.savingsPill}>
                                <Text style={styles.savingsPillText}>Save {pricing.savingsPercent}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Staggered Row-by-Row Cards */}
                    <View style={styles.cardsStack}>
                        {/* CARD 1: ANNUAL PRO (Featured / Popular) */}
                        <Animated.View
                            style={[
                                styles.planCard,
                                styles.annualCard,
                                {
                                    opacity: animCard1,
                                    transform: [
                                        {
                                            translateY: animCard1.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [40, 0],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            {/* Popular Gold Ribbon */}
                            <View style={styles.popularRibbon}>
                                <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                                <Text style={styles.popularRibbonText}>MOST POPULAR</Text>
                            </View>

                            <View style={styles.cardHeader}>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.planName}>ANNUAL PRO</Text>
                                        <View style={styles.bestValuePill}>
                                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.planSubdescription}>
                                        Complete financial control • Best overall savings
                                    </Text>
                                </View>
                            </View>

                            {/* Price Big Display */}
                            <View style={styles.priceRow}>
                                <Text style={styles.priceCurrency}>{pricing.currency}</Text>
                                <Text style={styles.priceAmount}>{pricing.yearlyPrice}</Text>
                                <Text style={styles.pricePeriod}>/ year</Text>
                            </View>
                            <Text style={styles.breakdownText}>
                                Just {pricing.currency}{pricing.yearlyMonthlyEquivalent} / month • Billed annually (Save {pricing.savingsPercent})
                            </Text>

                            {/* Features Bullet List */}
                            <View style={styles.featuresList}>
                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>
                                        <Text style={{ fontWeight: '700' }}>Auto-track UPI:</Text> GPay, PhonePe & Paytm notifications
                                    </Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>
                                        <Text style={{ fontWeight: '700' }}>Unlimited Gemini AI</Text> high-res receipt scans
                                    </Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>
                                        <Text style={{ fontWeight: '700' }}>Unlimited Bank Imports:</Text> HDFC, SBI, ICICI, Axis CSVs
                                    </Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>
                                        <Text style={{ fontWeight: '700' }}>Google Drive Cloud Sync</Text> & automatic restore
                                    </Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>
                                        <Text style={{ fontWeight: '700' }}>100% On-Device Privacy:</Text> Zero external servers
                                    </Text>
                                </View>
                            </View>

                            {/* Annual CTA Button */}
                            <TouchableOpacity
                                style={styles.annualCtaButton}
                                onPress={() => handleSubscribePlan('yearly')}
                                activeOpacity={0.85}
                                disabled={isSubscribing}
                            >
                                <Sparkles size={16} color="#FFFFFF" />
                                <Text style={styles.annualCtaText}>
                                    Upgrade to Annual Pro ({pricing.currency}{pricing.yearlyPrice}/yr)
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* CARD 2: MONTHLY PRO */}
                        <Animated.View
                            style={[
                                styles.planCard,
                                styles.monthlyCard,
                                {
                                    opacity: animCard2,
                                    transform: [
                                        {
                                            translateY: animCard2.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [40, 0],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.planName}>MONTHLY PRO</Text>
                                    <Text style={styles.planSubdescription}>
                                        Flexible monthly access • Cancel anytime
                                    </Text>
                                </View>
                            </View>

                            {/* Monthly Price Display */}
                            <View style={styles.priceRow}>
                                <Text style={styles.priceCurrency}>{pricing.currency}</Text>
                                <Text style={styles.priceAmount}>{pricing.monthlyPrice}</Text>
                                <Text style={styles.pricePeriod}>/ month</Text>
                            </View>
                            <Text style={styles.breakdownText}>Billed monthly • No long-term commitment</Text>

                            {/* Monthly Features Checklist */}
                            <View style={styles.featuresList}>
                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>Auto-track UPI from GPay, PhonePe, Paytm</Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>Unlimited Gemini AI receipt scans</Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>Unlimited bank statement CSV imports</Text>
                                </View>

                                <View style={styles.featureLine}>
                                    <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                        <Check size={13} color="#10B981" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureLineText}>Google Drive sync & on-device privacy</Text>
                                </View>
                            </View>

                            {/* Monthly CTA Button */}
                            <TouchableOpacity
                                style={styles.monthlyCtaButton}
                                onPress={() => handleSubscribePlan('monthly')}
                                activeOpacity={0.85}
                                disabled={isSubscribing}
                            >
                                <Text style={styles.monthlyCtaText}>
                                    Get Monthly Pro ({pricing.currency}{pricing.monthlyPrice}/mo)
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Free Trial Button (if trial not used yet) */}
                    {!trialActive && !isPro && (
                        <TouchableOpacity
                            style={styles.trialButton}
                            onPress={handleStartTrial}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.trialButtonText}>Start 7-Day Free Trial (No Charge Today)</Text>
                        </TouchableOpacity>
                    )}

                    {/* Restore Purchases & Google Play Notice */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleRestore}>
                            <Text style={styles.restoreText}>Restore Purchases</Text>
                        </TouchableOpacity>
                        <Text style={styles.termsText}>
                            Payments are securely processed via Google Play Store. Cancel anytime from Google Play Store &gt; Subscriptions. Auto-renews until cancelled.
                        </Text>
                    </View>
                </ScrollView>

                {/* Gift & Confetti Celebration Rain */}
                <CelebrationRain
                    active={showCelebration}
                    onComplete={() => setShowCelebration(false)}
                />
            </View>
        </Modal>
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
        paddingTop: 18,
        paddingBottom: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B18',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#F59E0B30',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#F59E0B',
        letterSpacing: 0.6,
    },
    closeButton: {
        padding: 6,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContainer: {
        paddingHorizontal: 18,
        paddingBottom: 40,
    },
    titleSection: {
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 19,
        paddingHorizontal: 12,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        paddingVertical: 8,
    },
    toggleLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleLabelActive: {
        color: colors.text,
        fontWeight: '700',
    },
    savingsPill: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B98140',
    },
    savingsPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },
    cardsStack: {
        gap: 16,
        marginBottom: 16,
    },
    planCard: {
        borderRadius: 20,
        padding: 20,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    annualCard: {
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    monthlyCard: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    popularRibbon: {
        position: 'absolute',
        top: -12,
        right: 20,
        backgroundColor: '#F59E0B',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    popularRibbonText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.4,
    },
    cardHeader: {
        marginBottom: 12,
    },
    planName: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    bestValuePill: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    bestValueText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#F59E0B',
    },
    planSubdescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceCurrency: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginRight: 2,
    },
    priceAmount: {
        fontSize: 38,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -1,
    },
    pricePeriod: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginLeft: 4,
    },
    breakdownText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 16,
    },
    featuresList: {
        gap: 10,
        marginBottom: 20,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border + '60',
    },
    featureLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureLineText: {
        fontSize: 13,
        color: colors.text,
        flex: 1,
        lineHeight: 18,
    },
    annualCtaButton: {
        backgroundColor: '#F59E0B',
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    annualCtaText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    monthlyCtaButton: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.text,
    },
    monthlyCtaText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    trialButton: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primary,
        marginBottom: 8,
    },
    trialButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    footer: {
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    restoreText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    termsText: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 16,
    },
});
