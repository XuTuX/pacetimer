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
        if (selectedFilter === 'all') return '전체 과목';
        if (selectedFilter === 'mock') return '모의고사';
        const subject = subjects.find(s => s.id === selectedFilter);
        return subject ? subject.name : '과목';
    };

    return (
        <View style={styles.container}>
            {/* 1. 상단 과목 드롭다운 */}
            <View style={styles.filterTriggerRow}>
                <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setIsShowingModal(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={selectedFilter === 'mock' ? 'medal' : 'layers'}
                        size={14}
                        color={COLORS.primary}
                    />
                    <Text style={styles.dropdownTriggerText}>{getSelectedLabel()}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            {/* 2. 하단 날짜 세그먼트 */}
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
                    {/* 버튼 바로 아래에 위치하도록 Top 조정 (140~150 사이로 기기마다 조정 필요) */}
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
                                    {selectedFilter === 'all' && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.optionItem, selectedFilter === 'mock' && styles.optionItemActive]}
                                    onPress={() => {
                                        onFilterChange('mock');
                                        setIsShowingModal(false);
                                    }}
                                >
                                    <View style={styles.optionLeft}>
                                        <Ionicons name="medal" size={12} color={selectedFilter === 'mock' ? COLORS.primary : COLORS.textMuted} />
                                        <Text style={[styles.optionText, selectedFilter === 'mock' && styles.optionTextActive]}>모의고사</Text>
                                    </View>
                                    {selectedFilter === 'mock' && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
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
                                        {selectedFilter === s.id && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
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
        gap: 12,
    },
    filterTriggerRow: {
        paddingHorizontal: SPACING.xxl,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        // 그림자를 더 부드럽게
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    dropdownTriggerText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    rangeContainer: {
        paddingHorizontal: SPACING.xxl,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: RADIUS.lg,
        padding: 4,
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
        color: COLORS.textMuted,
    },
    segmentTextActive: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)', // 배경을 살짝 어둡게 해서 모달 집중도 향상
    },
    dropdownPositioner: {
        position: 'absolute',
        top: 155, // ⭐️ 중요: 버튼 바로 아래로 수치 조정 (이미지 기준 약 150~160)
        left: SPACING.xxl,
    },
    dropdownCard: {
        width: 160,
        maxHeight: 280,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: 6,
        // 드롭다운이 공중에 떠있는 느낌을 주는 강한 그림자
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
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
        fontWeight: '500',
        color: COLORS.text,
    },
    optionTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
        marginHorizontal: 8,
    }
});