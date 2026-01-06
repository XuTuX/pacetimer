import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ExamSession } from '../lib/storage';

const THEME_GREEN = {
    point: '#00D094',
    pointLight: '#E6F9F4',
    textMain: '#1C1C1E',
    textMuted: '#8E8E93',
    accent: '#FF5252',
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

    // 1. 캡처를 위한 Ref 생성
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

    // 2. 공유 함수 수정
    const handleShare = async () => {
        try {
            if (!viewShotRef.current) {
                Alert.alert("알림", "공유 이미지를 생성할 수 없습니다.");
                return;
            }

            // 이미지 캡처
            const uri = await captureRef(viewShotRef, {
                format: 'png',
                quality: 0.8,
            });

            // 공유 다이얼로그 열기
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("알림", "공유 기능을 사용할 수 없는 환경입니다.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("오류", "이미지 생성 중 오류가 발생했습니다.");
        }
    };

    return (
        <View style={[styles.container, style]}>
            {/* --- 실제 화면에 보이는 UI --- */}
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
                            <View style={styles.lapBarMiniBg}>
                                <View style={[styles.lapBarMini, {
                                    width: `${(lap.duration / analysis.maxDuration) * 100}%` as any,
                                    backgroundColor: isSlow ? THEME_GREEN.accent : THEME_GREEN.point,
                                    opacity: 0.5
                                }]} />
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* --- 3. 캡처용 숨겨진 뷰 (화면 밖 왼쪽 -5000에 배치) --- */}
            <View
                collapsable={false}
                ref={viewShotRef}
                style={styles.hiddenShareContainer}
            >
                <LinearGradient
                    colors={[THEME_GREEN.point, '#00A878']}
                    style={styles.shareCard}
                >
                    <Text style={styles.shareBrand}>PACETIME</Text>
                    <View style={styles.shareInnerCard}>
                        <Text style={styles.shareCategory}>{session.categoryName}</Text>
                        <Text style={styles.shareTitle}>{session.title}</Text>
                        <Text style={styles.shareDate}>{formatDate(session.date)}</Text>

                        <View style={styles.shareDivider} />

                        <View style={styles.shareStatRow}>
                            <View style={styles.shareStatItem}>
                                <Text style={styles.shareStatLabel}>Total Time</Text>
                                <Text style={styles.shareStatValue}>{formatTime(session.totalSeconds)}</Text>
                            </View>
                            <View style={styles.shareStatItem}>
                                <Text style={styles.shareStatLabel}>Average</Text>
                                <Text style={styles.shareStatValue}>{formatTime(analysis.average)}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.shareFooter}>성장하는 페이스 메이커, 페이스 타임</Text>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#FFF', gap: 28 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { padding: 4 },
    title: { fontSize: 19, fontWeight: '800', color: THEME_GREEN.textMain },
    subInfo: { fontSize: 13, color: THEME_GREEN.textMuted, marginTop: 2, fontWeight: '500' },
    miniShareBtn: { padding: 8, backgroundColor: '#F2F2F7', borderRadius: 12 },

    summaryGrid: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 20, paddingVertical: 20 },
    summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
    summaryLabel: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '600' },
    summaryValue: { fontSize: 16, fontWeight: '800', color: THEME_GREEN.textMain },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: THEME_GREEN.textMain },
    alertBadge: { backgroundColor: THEME_GREEN.pointLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    alertBadgeText: { fontSize: 11, color: THEME_GREEN.point, fontWeight: '700' },

    filterRow: { flexDirection: 'row', backgroundColor: '#F2F2F7', padding: 3, borderRadius: 10 },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    filterBtnActive: { backgroundColor: '#FFF' },
    filterBtnText: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '600' },
    filterBtnTextActive: { color: THEME_GREEN.textMain, fontWeight: '800' },

    lapList: { gap: 4 },
    lapItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: THEME_GREEN.border, gap: 8 },
    lapMainInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lapNoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lapNoText: { fontSize: 15, fontWeight: '700', color: THEME_GREEN.textMain },
    slowDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: THEME_GREEN.accent },
    lapTimeText: { fontSize: 15, fontWeight: '800', color: THEME_GREEN.textMain, fontVariant: ['tabular-nums'] },
    lapBarMiniBg: { width: '100%', height: 3, backgroundColor: '#F2F2F7', borderRadius: 1.5, overflow: 'hidden' },
    lapBarMini: { height: '100%' },

    // --- 공유 카드용 스타일 (화면 밖 배치) ---
    hiddenShareContainer: {
        position: 'absolute',
        left: -5000, // 화면 밖
        width: 320,
    },
    shareCard: {
        padding: 30,
        borderRadius: 32,
        alignItems: 'center',
    },
    shareBrand: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 20, opacity: 0.9 },
    shareInnerCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    shareCategory: { fontSize: 12, fontWeight: '800', color: THEME_GREEN.point, marginBottom: 8 },
    shareTitle: { fontSize: 20, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 4 },
    shareDate: { fontSize: 13, color: '#888', marginBottom: 20 },
    shareDivider: { width: '100%', height: 1, backgroundColor: '#EEE', marginBottom: 20 },
    shareStatRow: { flexDirection: 'row', width: '100%' },
    shareStatItem: { flex: 1, alignItems: 'center' },
    shareStatLabel: { fontSize: 10, color: '#AAA', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
    shareStatValue: { fontSize: 16, fontWeight: '800', color: '#111' },
    shareFooter: { color: 'white', fontSize: 11, fontWeight: '600', marginTop: 24, opacity: 0.8 },
});