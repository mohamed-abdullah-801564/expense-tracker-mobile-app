import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon } from 'lucide-react-native';
import Svg, { G, Path } from 'react-native-svg';
import * as LucideIcons from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, addYears, subYears } from 'date-fns';

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.55;
const RADIUS = CHART_SIZE / 2.5;
const STROKE_WIDTH = 30;
const CENTER = CHART_SIZE / 2;

type ViewMode = 'Month' | 'Year';

const AnimatedProgressBar = ({ percentage, color, border }: { percentage: number, color: string, border: string }) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: percentage,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [percentage]);

    return (
        <View style={[styles.progressBarContainer, { backgroundColor: border }]}>
            <Animated.View 
                style={[
                    styles.progressBar, 
                    { 
                        backgroundColor: color,
                        width: animatedWidth.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                        })
                    }
                ]} 
            />
        </View>
    );
};

export default function InsightsScreen() {
    const { allExpenses } = useExpenses();
    const { colors } = useTheme();
    const [viewMode, setViewMode] = useState<ViewMode>('Month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const filteredExpenses = useMemo(() => {
        const start = viewMode === 'Month' ? startOfMonth(currentDate) : startOfYear(currentDate);
        const end = viewMode === 'Month' ? endOfMonth(currentDate) : endOfYear(currentDate);

        return allExpenses.filter(expense => {
            if (expense.isDeleted) return false;
            const expenseDate = new Date(expense.date);
            return isWithinInterval(expenseDate, { start, end });
        });
    }, [allExpenses, currentDate, viewMode]);

    const stats = useMemo(() => {
        const totals: Record<string, number> = {};
        let grandTotal = 0;

        filteredExpenses.forEach(exp => {
            totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
            grandTotal += exp.amount;
        });

        const sortedStats = Object.entries(totals)
            .map(([category, total]) => ({
                category,
                total,
                percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
                color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other,
            }))
            .sort((a, b) => b.total - a.total);

        return {
            items: sortedStats,
            total: grandTotal,
        };
    }, [filteredExpenses]);

    const renderDonutChart = () => {
        if (stats.total === 0) {
            return (
                <View style={[styles.chartPlaceholder, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary }}>No expenses found</Text>
                </View>
            );
        }

        let currentAngle = -90; 
        const segments = stats.items.map((stat, index) => {
            const angle = (stat.percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const x1 = CENTER + RADIUS * Math.cos((startAngle * Math.PI) / 180);
            const y1 = CENTER + RADIUS * Math.sin((startAngle * Math.PI) / 180);
            const x2 = CENTER + RADIUS * Math.cos((currentAngle * Math.PI) / 180);
            const y2 = CENTER + RADIUS * Math.sin((currentAngle * Math.PI) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const d = `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

            return (
                <Path
                    key={index}
                    d={d}
                    stroke={stat.color}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                />
            );
        });

        return (
            <View style={styles.chartLegendContainer}>
                <View style={styles.chartContainer}>
                    <Svg width={CHART_SIZE} height={CHART_SIZE}>
                        <G>
                            {segments}
                        </G>
                    </Svg>
                    <View style={styles.chartInnerContent}>
                        <Text style={[styles.totalSpentText, { color: colors.text }]}>
                            ₹{stats.total.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.legendContainer}>
                    {stats.items.slice(0, 5).map((stat) => (
                        <View key={stat.category} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: stat.color }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {stat.category} {stat.percentage.toFixed(1)}%
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const nextTime = () => setCurrentDate(prev => viewMode === 'Month' ? addMonths(prev, 1) : addYears(prev, 1));
    const prevTime = () => setCurrentDate(prev => viewMode === 'Month' ? subMonths(prev, 1) : subYears(prev, 1));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={[styles.segmentedControl, { backgroundColor: colors.border + '50' }]}>
                    {(['Month', 'Year'] as ViewMode[]).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setViewMode(mode)}
                            style={[
                                styles.segmentButton,
                                viewMode === mode && { backgroundColor: colors.primary }
                            ]}
                        >
                            <Text style={[
                                styles.segmentText,
                                { color: viewMode === mode ? '#FFF' : colors.textSecondary }
                            ]}>
                                {mode}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.dateNavigator}>
                    <TouchableOpacity onPress={prevTime} style={styles.navButton}>
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.dateText, { color: colors.text }]}>
                        {viewMode === 'Month' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'yyyy')}
                    </Text>
                    <TouchableOpacity onPress={nextTime} style={styles.navButton}>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {renderDonutChart()}

                    <View style={styles.statsSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top lists</Text>

                        {stats.items.map((item) => {
                            const IconComponent = LucideIcons[CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] as keyof typeof LucideIcons] as React.ComponentType<any>;
                            return (
                                <View key={item.category} style={styles.card}>
                                    <View style={[styles.iconBadge, { backgroundColor: item.color + '1A' }]}>
                                        {IconComponent && <IconComponent size={20} color={item.color} />}
                                    </View>
                                    
                                    <View style={styles.cardMain}>
                                        <View style={styles.cardHeader}>
                                            <Text style={[styles.categoryName, { color: colors.text }]}>
                                                {item.category} <Text style={{ fontSize: 12, fontWeight: '400', color: colors.textSecondary }}>{item.percentage.toFixed(1)}%</Text>
                                            </Text>
                                            <Text style={[styles.categoryAmount, { color: colors.text }]}>
                                                ₹{item.total.toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                        <AnimatedProgressBar percentage={item.percentage} color={item.color} border={colors.border + '50'} />
                                    </View>
                                </View>
                            );
                        })}

                        {stats.items.length === 0 && (
                            <View style={styles.emptyState}>
                                <PieChartIcon size={48} color={colors.border} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    Start adding expenses to see insights
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    navButton: {
        padding: 4,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '700',
        minWidth: 140,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    chartLegendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    chartContainer: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartInnerContent: {
        position: 'absolute',
        alignItems: 'center',
    },
    totalSpentText: {
        fontSize: 20,
        fontWeight: '800',
    },
    legendContainer: {
        flex: 1,
        paddingLeft: 20,
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    chartPlaceholder: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        borderRadius: CHART_SIZE / 2,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: 20,
    },
    statsSection: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardMain: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '700',
    },
    categoryAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 10,
        borderRadius: 5,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
