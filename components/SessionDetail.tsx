import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ExamSession } from '../lib/storage';
import { COLORS } from '../lib/theme';

export type LapSortMode = 'number' | 'slowest';

type Props = {
    session: ExamSession;
    initialSortMode?: LapSortMode;
    style?: StyleProp<ViewStyle>;
    showDate?: boolean;
    onBack?: () => void;
};

const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
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
            if (!viewShotRef.current) {
                Alert.alert("알림", "공유 이미지를 생성할 수 없습니다.");
                return;
            }
            const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.8 });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("알림", "공유 기능을 사용할 수 없는 환경입니다.");
            }
        } catch (e) {
            if (__DEV__) {
                console.error(e);
            }
            Alert.alert("오류", "이미지 생성 중 오류가 발생했습니다.");
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    )}
                    <View>
                        <Text style={styles.title}>{session.title}</Text>
                        <Text style={styles.subInfo}>{session.categoryName} · {formatDate(session.date)}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.miniShareBtn}>
                    <Ionicons name="share-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>총 시간</Text>
                    <Text style={styles.summaryValue}>{formatTime(session.totalSeconds)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>평균 페이스</Text>
                    <Text style={styles.summaryValue}>{formatTime(analysis.average)}</Text>
                </View>
                <View style={styles.summaryDivider} />
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
                {sortedLaps.map((lap: { questionNo: number; duration: number }) => {
                    const isSlow = lap.duration > analysis.average;
                    return (
                        <View key={lap.questionNo} style={styles.lapItem}>
                            <View style={styles.lapMainInfo}>
                                <View style={styles.lapNoContainer}>
                                    <View style={[styles.lapNoCircle, isSlow && { backgroundColor: COLORS.accentLight }]}>
                                        <Text style={[styles.lapNoText, isSlow && { color: COLORS.accent }]}>
                                            Q{String(lap.questionNo).padStart(2, '0')}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.lapTimeText, isSlow && { color: COLORS.accent }]}>
                                    {formatTime(lap.duration)}
                                </Text>
                            </View>
                            <View style={styles.lapBarContainer}>
                                <View style={[styles.lapBar, {
                                    width: `${Math.max(5, (lap.duration / analysis.maxDuration) * 100)}%` as any,
                                    backgroundColor: isSlow ? COLORS.accent : COLORS.primary,
                                }]} />
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Hidden Share Card */}
            <View collapsable={false} ref={viewShotRef} style={styles.hiddenShareContainer}>
                <LinearGradient colors={[COLORS.primary, '#00A878']} style={styles.shareCard}>
                    <Text style={styles.shareBrand}>PACETIME</Text>
                    <View style={styles.shareInnerCard}>
                        <View style={styles.shareHeader}>
                            <Text style={styles.shareCategory}>{session.categoryName}</Text>
                            <Text style={styles.shareDate}>{formatDate(session.date)}</Text>
                        </View>
                            <Text style={styles.shareTitle}>{session.title}</Text>
                        <View style={styles.shareStatGrid}>
                            <View style={styles.shareStatItem}>
                                <Text style={styles.shareStatLabel}>총 시간</Text>
                                <Text style={styles.shareStatValue}>{formatTime(session.totalSeconds)}</Text>
                            </View>
                            <View style={styles.shareStatItem}>
                                <Text style={styles.shareStatLabel}>평균</Text>
                                <Text style={styles.shareStatValue}>{formatTime(analysis.average)}</Text>
                            </View>
                            <View style={styles.shareStatItem}>
                                <Text style={styles.shareStatLabel}>문항</Text>
                                <Text style={styles.shareStatValue}>{session.totalQuestions}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.shareFooter}>모든 순간의 페이스메이커, 페이스타임</Text>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: COLORS.bg, gap: 32 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    subInfo: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
    miniShareBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
    summaryDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
    summaryLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
    summaryValue: { fontSize: 17, fontWeight: '800', color: COLORS.text },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    alertBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    alertBadgeText: { fontSize: 11, color: COLORS.accent, fontWeight: '800' },

    filterRow: { flexDirection: 'row', backgroundColor: COLORS.surfaceVariant, padding: 4, borderRadius: 16 },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    filterBtnActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    filterBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
    filterBtnTextActive: { color: COLORS.text },

    lapList: { gap: 12 },
    lapItem: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    lapMainInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lapNoContainer: { flexDirection: 'row', alignItems: 'center' },
    lapNoCircle: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    lapNoText: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
    lapTimeText: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
    lapBarContainer: { width: '100%', height: 6, backgroundColor: COLORS.surfaceVariant, borderRadius: 3, overflow: 'hidden' },
    lapBar: { height: '100%', borderRadius: 3 },

    hiddenShareContainer: { position: 'absolute', left: -5000, width: 360 },
    shareCard: { padding: 40, borderRadius: 48, alignItems: 'center' },
    shareBrand: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 4, marginBottom: 32, opacity: 0.9 },
    shareInnerCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 32, padding: 32 },
    shareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    shareCategory: { fontSize: 12, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
    shareDate: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    shareTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 32 },
    shareStatGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 24 },
    shareStatItem: { alignItems: 'center', gap: 6 },
    shareStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
    shareStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    shareFooter: { color: COLORS.white, fontSize: 12, fontWeight: '700', marginTop: 32, opacity: 0.8 },
});
