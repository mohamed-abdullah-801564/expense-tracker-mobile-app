import React from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';

export default function CategoryFilter() {
    const { selectedCategory, setSelectedCategory } = useExpenses();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <TouchableOpacity
                style={[
                    styles.chip,
                    !selectedCategory && styles.chipActive,
                    !selectedCategory && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedCategory(null)}
            >
                <Text style={[
                    styles.chipText,
                    !selectedCategory && styles.chipTextActive
                ]}>
                    All
                </Text>
            </TouchableOpacity>

            {CATEGORIES.map((category) => {
                const IconComponent = LucideIcons[CATEGORY_ICONS[category] as keyof typeof LucideIcons] as React.ComponentType<any>;
                const isActive = selectedCategory === category;

                return (
                    <TouchableOpacity
                        key={category}
                        style={[
                            styles.chip,
                            isActive && styles.chipActive,
                            isActive && { backgroundColor: CATEGORY_COLORS[category] }
                        ]}
                        onPress={() => setSelectedCategory(isActive ? null : category)}
                    >
                        <IconComponent
                            size={16}
                            color={isActive ? 'white' : CATEGORY_COLORS[category]}
                        />
                        <Text style={[
                            styles.chipText,
                            isActive && styles.chipTextActive,
                            !isActive && { color: CATEGORY_COLORS[category] }
                        ]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        maxHeight: 50,
        marginVertical: 12,
    },
    content: {
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.border,
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    chipTextActive: {
        color: 'white',
    },
});