import { Ionicons } from '@expo/vector-icons'; // ⭐️ 다시 추가
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateRange, SubjectFilter } from '../../lib/analytics-utils';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
import { Subject } from '../../lib/types';

import { useBreakpoint } from '../ui/Layout';

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
    const { isAtLeastTablet } = useBreakpoint();
    const [isShowingModal, setIsShowingModal] = useState(false);

    const getSelectedLabel = () => {
        if (selectedFilter === 'all') return '전체 과목';
        if (selectedFilter === 'mock') return '모의고사';
        const subject = subjects.find(s => s.id === selectedFilter);
        return subject ? subject.name : '과목';
    };

    return (
        <View style={[styles.container, isAtLeastTablet && styles.containerTablet]}>
            <View style={[styles.topRow, isAtLeastTablet && styles.topRowTablet]}>
                {/* 1. 과목 선택 (열림 표시 화살표 추가) */}
                <TouchableOpacity
                    style={[styles.subjectDropdown, isAtLeastTablet && styles.subjectDropdownTablet]}
                    onPress={() => setIsShowingModal(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.subjectTitle} numberOfLines={1}>{getSelectedLabel()}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 2. 날짜 선택 세그먼트 */}
                <View style={[styles.segmentedControl, isAtLeastTablet && styles.segmentedControlTablet]}>
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

            {/* 드롭다운 모달 */}
            <Modal
                visible={isShowingModal}
                transparent
                animationType="fade"
                onRequestClose={() => setIsShowingModal(false)}
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setIsShowingModal(false)}
                >
                    <View style={styles.dropdownPositioner}>
                        <View style={styles.dropdownCard}>
                            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                                <TouchableOpacity
                                    style={[styles.optionItem, selectedFilter === 'all' && styles.optionItemActive]}
                                    onPress={() => {
                                        onFilterChange('all');
                                        setIsShowingModal(false);
                                    }}
                                >
                                    <Text style={[styles.optionText, selectedFilter === 'all' && styles.optionTextActive]}>전체 과목</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.optionItem, selectedFilter === 'mock' && styles.optionItemActive]}
                                    onPress={() => {
                                        onFilterChange('mock');
                                        setIsShowingModal(false);
                                    }}
                                >
                                    <Text style={[styles.optionText, selectedFilter === 'mock' && styles.optionTextActive]}>모의고사</Text>
                                </TouchableOpacity>

                                <View style={styles.divider} />

                                {subjects.filter(s => !s.isArchived).map((s) => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.optionItem, selectedFilter === s.id && styles.optionItemActive]}
                                        onPress={() => {
                                            onFilterChange(s.id);
                                            setIsShowingModal(false);
                                        }}
                                    >
                                        <Text style={[styles.optionText, selectedFilter === s.id && styles.optionTextActive]}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: COLORS.bg,
    },
    containerTablet: {
        paddingTop: 16, // A bit more space
        paddingBottom: 24,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        gap: 8,
    },
    topRowTablet: {
        paddingHorizontal: 0,
        gap: 24, // Match Grid gap
    },
    subjectDropdown: {
        flex: 0.7,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingLeft: 20, // 왼쪽 여백을 조금 더 줌 (화살표가 오른쪽에 있으므로)
        paddingRight: 12,
        paddingVertical: 12,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 4,
        ...SHADOWS.small,
    },
    subjectDropdownTablet: {
        flex: 1,
        paddingVertical: 14,
    },
    subjectTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
    },
    segmentedControl: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: RADIUS.lg,
        padding: 4,
    },
    segmentedControlTablet: {
        padding: 6,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    segmentBtnActive: {
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    segmentTextActive: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    dropdownPositioner: {
        position: 'absolute',
        top: 152,
        left: SPACING.xxl,
    },
    dropdownCard: {
        width: 180,
        maxHeight: 320,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: 4,
        ...SHADOWS.heavy,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionItem: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
    },
    optionItemActive: {
        backgroundColor: COLORS.surfaceVariant,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    optionTextActive: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
        marginHorizontal: 8,
    }
});