import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateRange, SubjectFilter } from '../../lib/analytics-utils';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
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
    const [isShowingModal, setIsShowingModal] = useState(false);

    const getSelectedLabel = () => {
        if (selectedFilter === 'all') return '전체';
        if (selectedFilter === 'mock') return '모의고사';
        const subject = subjects.find(s => s.id === selectedFilter);
        return subject ? subject.name : '과목';
    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                {/* 1. 과목 선택 (콤팩트 드롭다운) */}
                <TouchableOpacity
                    style={styles.subjectDropdown}
                    onPress={() => setIsShowingModal(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={selectedFilter === 'mock' ? 'medal' : 'layers'}
                        size={16}
                        color={COLORS.primary}
                    />
                    <Text style={styles.subjectTitle} numberOfLines={1}>{getSelectedLabel()}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 2. 날짜 선택 세그먼트 (함께 한 줄에 배치) */}
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
                                    {selectedFilter === 'all' && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.optionItem, selectedFilter === 'mock' && styles.optionItemActive]}
                                    onPress={() => {
                                        onFilterChange('mock');
                                        setIsShowingModal(false);
                                    }}
                                >
                                    <View style={styles.optionLeft}>
                                        <Ionicons name="medal" size={14} color={selectedFilter === 'mock' ? COLORS.primary : COLORS.textMuted} />
                                        <Text style={[styles.optionText, selectedFilter === 'mock' && styles.optionTextActive]}>모의고사</Text>
                                    </View>
                                    {selectedFilter === 'mock' && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
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
                                        {selectedFilter === s.id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
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
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        gap: 8,
    },
    subjectDropdown: {
        flex: 1, // 과목 이름이 길어질 수 있으므로 유동적으로
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
        ...SHADOWS.small,
    },
    subjectTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: RADIUS.lg,
        padding: 3,
    },
    segmentBtn: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    segmentBtnActive: {
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
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
        top: 152, // ⭐️ 한 줄로 올라감에 따라 위치 재조정
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
    },
    optionItemActive: {
        backgroundColor: COLORS.surfaceVariant,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionText: {
        fontSize: 13,
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