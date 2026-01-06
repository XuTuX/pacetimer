import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ExamSession } from '../lib/storage';

// --- 테마 컬러 (민트 그린 및 저대비 회색) ---
const THEME_GREEN = {
    point: '#00D094',
    pointLight: '#E6F9F4',
    textMain: '#1C1C1E',
    textMuted: '#8E8E93',
    accent: '#FF5252', // 평균보다 느린 문항 표시용
    border: '#F2F2F7',
};

export type LapSortMode = 'number' | 'slowest';

type Props = {
    session: ExamSession;
    initialSortMode?: LapSortMode;
    style?: StyleProp<ViewStyle>;
    showDate?: boolean;
    onBack?: () => void;
};

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
};

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function SessionDetail({ session, initialSortMode = 'number', style, showDate = true, onBack }: Props) {
    const [lapSortMode, setLapSortMode] = useState<LapSortMode>(initialSortMode);
    const viewShotRef = useRef<View>(null);

    const analysis = useMemo(() => {
        const average = session.totalQuestions ? Math.floor(session.totalSeconds / session.totalQuestions) : 0;
        const slowCount = session.laps.filter(l => l.duration > average).length;
        const maxDuration = Math.max(...session.laps.map(l => l.duration));
        return { average, slowCount, maxDuration };
    }, [session]);

    const sortedLaps = useMemo(() => {
        const copy = [...session.laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [session.laps, lapSortMode]);

    const handleShare = async () => {
        try {
            if (viewShotRef.current) {
                const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.9 });
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <View style={[styles.container, style]}>
            {/* 1. 상단 헤더 */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color={THEME_GREEN.textMain} />
                        </TouchableOpacity>
                    )}
                    <View>
                        <Text style={styles.title}>{session.title}</Text>
                        <Text style={styles.subInfo}>{session.categoryName} · {formatDate(session.date)}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.miniShareBtn}>
                    <Ionicons name="share-outline" size={20} color={THEME_GREEN.textMuted} />
                </TouchableOpacity>
            </View>

            {/* 2. 주요 지표 (심플한 레이아웃) */}
            <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>총 시간</Text>
                    <Text style={styles.summaryValue}>{formatTime(session.totalSeconds)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>평균 페이스</Text>
                    <Text style={styles.summaryValue}>{formatTime(analysis.average)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>문항 수</Text>
                    <Text style={styles.summaryValue}>{session.totalQuestions}개</Text>
                </View>
            </View>

            {/* 3. 섹션 헤더 및 정렬 필터 */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>상세 기록</Text>
                    {analysis.slowCount > 0 && (
                        <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>평균 초과 {analysis.slowCount}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.filterRow}>
                    {(['number', 'slowest'] as LapSortMode[]).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setLapSortMode(mode)}
                            style={[styles.filterBtn, lapSortMode === mode && styles.filterBtnActive]}
                        >
                            <Text style={[styles.filterBtnText, lapSortMode === mode && styles.filterBtnTextActive]}>
                                {mode === 'number' ? '번호순' : '느린순'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 4. 문항 리스트 (텍스트 중심) */}
            <View style={styles.lapList}>
                {sortedLaps.map((lap) => {
                    const isSlow = lap.duration > analysis.average;
                    return (
                        <View key={lap.questionNo} style={styles.lapItem}>
                            <View style={styles.lapMainInfo}>
                                <View style={styles.lapNoContainer}>
                                    <Text style={styles.lapNoText}>Q{String(lap.questionNo).padStart(2, '0')}</Text>
                                    {isSlow && <View style={styles.slowDot} />}
                                </View>
                                <Text style={[styles.lapTimeText, isSlow && { color: THEME_GREEN.accent }]}>
                                    {formatTime(lap.duration)}
                                </Text>
                            </View>

                            {/* 상대적 길이를 보여주는 아주 얇은 배경 바 */}
                            <View style={styles.lapBarMiniBg}>
                                <View style={[styles.lapBarMini, {
                                    width: `${(lap.duration / analysis.maxDuration) * 100}%` as any,
                                    backgroundColor: isSlow ? THEME_GREEN.accent : THEME_GREEN.point,
                                    opacity: isSlow ? 0.6 : 0.4
                                }]} />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#FFF', gap: 28 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { padding: 4 },
    title: { fontSize: 19, fontWeight: '800', color: THEME_GREEN.textMain },
    subInfo: { fontSize: 13, color: THEME_GREEN.textMuted, marginTop: 2, fontWeight: '500' },
    miniShareBtn: { padding: 8, backgroundColor: '#F2F2F7', borderRadius: 12 },

    // Summary (차트 대신 깔끔한 그리드)
    summaryGrid: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 10
    },
    summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
    summaryLabel: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '600' },
    summaryValue: { fontSize: 16, fontWeight: '800', color: THEME_GREEN.textMain },

    // Section Header
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: THEME_GREEN.textMain },
    alertBadge: { backgroundColor: THEME_GREEN.pointLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    alertBadgeText: { fontSize: 11, color: THEME_GREEN.point, fontWeight: '700' },

    filterRow: { flexDirection: 'row', backgroundColor: '#F2F2F7', padding: 3, borderRadius: 10 },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    filterBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    filterBtnText: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '600' },
    filterBtnTextActive: { color: THEME_GREEN.textMain, fontWeight: '800' },

    // Lap List (차트 요소를 뺀 순수 리스트)
    lapList: { gap: 4 },
    lapItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: THEME_GREEN.border,
        gap: 8
    },
    lapMainInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lapNoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lapNoText: { fontSize: 15, fontWeight: '700', color: THEME_GREEN.textMain },
    slowDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: THEME_GREEN.accent },

    lapTimeText: { fontSize: 15, fontWeight: '800', color: THEME_GREEN.textMain, fontVariant: ['tabular-nums'] },

    // 시각적 보조용 마이크로 바
    lapBarMiniBg: { width: '100%', height: 3, backgroundColor: '#F2F2F7', borderRadius: 1.5, overflow: 'hidden' },
    lapBarMini: { height: '100%' },
});