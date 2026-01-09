import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateRange, SubjectFilter } from '../../lib/analytics-utils';
import { COLORS } from '../../lib/theme';
import { Subject } from '../../lib/types';

interface Props {
    selectedRange: DateRange;
    onRangeChange: (range: DateRange) => void;
    selectedFilter: SubjectFilter;
    onFilterChange: (filter: SubjectFilter) => void;
    subjects: Subject[];
}

export const AnalyticsHeader: React.FC<Props> = ({
    selectedRange,
    onRangeChange,
    selectedFilter,
    onFilterChange,
    subjects,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.rangeRow}>
                {(['today', '7days', '30days'] as DateRange[]).map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.rangeBtn, selectedRange === r && styles.rangeBtnActive]}
                        onPress={() => onRangeChange(r)}
                    >
                        <Text style={[styles.rangeText, selectedRange === r && styles.rangeTextActive]}>
                            {r === 'today' ? '오늘' : r === '7days' ? '최근 7일' : '최근 30일'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                    style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                    onPress={() => onFilterChange('all')}
                >
                    <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>전체</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterChip, selectedFilter === 'mock' && styles.filterChipActive]}
                    onPress={() => onFilterChange('mock')}
                >
                    <Ionicons
                        name="school-outline"
                        size={14}
                        color={selectedFilter === 'mock' ? COLORS.white : COLORS.textMuted}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.filterText, selectedFilter === 'mock' && styles.filterTextActive]}>모의고사</Text>
                </TouchableOpacity>

                {subjects.filter(s => !s.isArchived).map((s) => (
                    <TouchableOpacity
                        key={s.id}
                        style={[styles.filterChip, selectedFilter === s.id && styles.filterChipActive]}
                        onPress={() => onFilterChange(s.id)}
                    >
                        <Text style={[styles.filterText, selectedFilter === s.id && styles.filterTextActive]}>
                            {s.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        backgroundColor: COLORS.bg,
        gap: 12,
    },
    rangeRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 8,
    },
    rangeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rangeBtnActive: {
        backgroundColor: COLORS.text,
        borderColor: COLORS.text,
    },
    rangeText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    rangeTextActive: {
        color: COLORS.white,
    },
    filterScroll: {
        paddingHorizontal: 24,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    filterTextActive: {
        color: COLORS.white,
    },
});
