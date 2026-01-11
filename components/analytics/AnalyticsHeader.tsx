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
            {/* 기간 선택 세그먼트 */}
            <View style={styles.rangeContainer}>
                <View style={styles.segmentedControl}>
                    {(['today', '7days', '30days'] as DateRange[]).map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.segmentBtn, selectedRange === r && styles.segmentBtnActive]}
                            onPress={() => onRangeChange(r)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.segmentText, selectedRange === r && styles.segmentTextActive]}>
                                {r === 'today' ? '오늘' : r === '7days' ? '7일' : '30일'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 과목 필터 칩 */}
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
                        name="medal"
                        size={12}
                        color={selectedFilter === 'mock' ? COLORS.white : COLORS.primary}
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
        paddingVertical: 16,
        backgroundColor: COLORS.bg,
    },
    rangeContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 16,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    segmentBtnActive: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    segmentTextActive: {
        color: COLORS.primary,
    },
    filterScroll: {
        paddingHorizontal: 20,
        paddingBottom: 4,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
    },
    filterTextActive: {
        color: COLORS.white,
    },
});
