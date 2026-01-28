import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategoryStats } from '@/types/expense';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-store';

interface StatsCardProps {
    stat: CategoryStats;
}

export function StatsCard({ stat }: StatsCardProps) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const IconComponent = LucideIcons[CATEGORY_ICONS[stat.category] as keyof typeof LucideIcons] as React.ComponentType<any>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: CATEGORY_COLORS[stat.category] + '20' }]}>
                    <IconComponent size={20} color={CATEGORY_COLORS[stat.category]} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.category}>{stat.category}</Text>
                    <Text style={styles.count}>{stat.count} expenses</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.amount}>₹{stat.total.toFixed(2)}</Text>
                <Text style={[styles.percentage, { color: CATEGORY_COLORS[stat.category] }]}>
                    {stat.percentage.toFixed(1)}%
                </Text>
            </View>

            <View style={styles.progressBar}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${stat.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[stat.category]
                        }
                    ]}
                />
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    category: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    count: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    amount: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    percentage: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
});