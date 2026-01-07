import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars'; // 라이브러리 import
import { ExamSession, deleteSession } from '../lib/storage';
import { COLORS } from '../lib/theme';

// --- 달력 한글 설정 ---
LocaleConfig.locales['kr'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

type DateSection = {
    date: string; // "YYYY-MM-DD"
    displayDate: string;
    sessions: ExamSession[];
    totalSeconds: number;
    totalQuestions: number;
};

type Props = {
    sessionsCount: number;
    dateSections: DateSection[];
    onSelectSession: (session: ExamSession) => void;
    onDeleted: () => void;
    onViewDailyAnalysis: (date: string) => void;
};

// 시간 포맷 헬퍼
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}시간 ${m}분`;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};

export default function HistoryTab({
    sessionsCount,
    dateSections,
    onSelectSession,
    onDeleted,
    onViewDailyAnalysis,
}: Props) {
    // 오늘 날짜 구하기 (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // 선택된 날짜 상태 (기본값: 오늘)
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // 1. 달력에 점(Mark)을 찍기 위한 데이터 가공 (공부 시간에 따른 색상 변화 포함)
    const markedDates = useMemo(() => {
        const marks: any = {};

        dateSections.forEach((section) => {
            const totalSeconds = section.totalSeconds;

            // 공부 시간에 따른 색상 단계 (Heatmap 느낌)
            let color = COLORS.primaryLight;
            if (totalSeconds > 10800) { // 3시간 초과
                color = COLORS.primary;
            } else if (totalSeconds > 3600) { // 1시간 초과
                color = '#70E8C1'; // Medium Mint
            } else if (totalSeconds > 0) {
                color = '#B2F2DE'; // Light Mint
            }

            marks[section.date] = {
                customStyles: {
                    container: {
                        backgroundColor: color,
                        borderRadius: 8,
                    },
                    text: {
                        color: totalSeconds > 3600 ? COLORS.white : COLORS.text,
                        fontWeight: '700',
                    }
                }
            };
        });

        // 현재 선택된 날짜 테두리 표시
        if (marks[selectedDate]) {
            marks[selectedDate].customStyles.container = {
                ...marks[selectedDate].customStyles.container,
                borderWidth: 2,
                borderColor: COLORS.text,
            };
        } else {
            marks[selectedDate] = {
                customStyles: {
                    container: {
                        borderWidth: 2,
                        borderColor: COLORS.text,
                        borderRadius: 8,
                    },
                    text: {
                        color: COLORS.text,
                        fontWeight: '700',
                    }
                }
            };
        }

        return marks;
    }, [dateSections, selectedDate]);

    // 2. 선택된 날짜의 요약 정보 계산
    const selectedDateSummary = useMemo(() => {
        const section = dateSections.find((s) => s.date === selectedDate);
        if (!section) return null;

        return {
            totalSeconds: section.totalSeconds,
            totalQuestions: section.totalQuestions,
            sessions: section.sessions
        };
    }, [dateSections, selectedDate]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* 상단 통계 헤더 */}
            <View style={styles.historyHeader}>
                <View>
                    <Text style={styles.headerTitle}>학습 기록</Text>
                    <Text style={styles.headerSub}>꾸준히 공부해온 성과를 확인해보세요.</Text>
                </View>
            </View>

            {/* 캘린더 뷰 */}
            <View style={styles.calendarWrapper}>
                <Calendar
                    current={selectedDate}
                    onDayPress={(day: { dateString: string }) => {
                        setSelectedDate(day.dateString);
                    }}
                    monthFormat={'yyyy년 MM월'}
                    markingType={'custom'}
                    markedDates={markedDates}
                    theme={{
                        todayTextColor: COLORS.primary,
                        arrowColor: COLORS.text,
                        textDayFontWeight: '600',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: 'bold',
                        textDayFontSize: 14,
                        textMonthFontSize: 16,
                        calendarBackground: 'transparent',
                    }}
                    enableSwipeMonths={true}
                />
            </View>

            {/* 선택된 날짜 요약 */}
            <View style={styles.summaryContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listHeaderTitle}>
                        {selectedDate === todayStr ? '오늘의 요약' : `${selectedDate} 요약`}
                    </Text>
                </View>

                {selectedDateSummary ? (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>총 공부시간</Text>
                                <Text style={styles.summaryValue}>{formatDuration(selectedDateSummary.totalSeconds)}</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>총 풀이문항</Text>
                                <Text style={styles.summaryValue}>{selectedDateSummary.totalQuestions}개</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.detailLinkBtn}
                            onPress={() => onViewDailyAnalysis(selectedDate)}
                        >
                            <Text style={styles.detailLinkText}>데이터 분석 자세히 보기</Text>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Ionicons name="cafe-outline" size={32} color={COLORS.border} />
                        <Text style={styles.emptyText}>학습 기록이 없는 날이에요.</Text>
                    </View>
                )}
            </View>

            {/* 개별 세션 리스트 (기존 기능 유지하되 하단으로 배치하거나 선택사항으로) */}
            {selectedDateSummary && selectedDateSummary.sessions.length > 0 && (
                <View style={styles.sessionListContainer}>
                    <Text style={styles.sessionListTitle}>개별 기록</Text>
                    {selectedDateSummary.sessions.map((session) => (
                        <TouchableOpacity
                            key={session.id}
                            style={styles.sessionCard}
                            onPress={() => onSelectSession(session)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeText}>{session.categoryName}</Text>
                                </View>
                                <View style={styles.headerRight}>
                                    <Text style={styles.timeText}>
                                        {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => {
                                            Alert.alert('삭제', '기록을 삭제하시겠습니까?', [
                                                { text: '취소', style: 'cancel' },
                                                {
                                                    text: '삭제',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        await deleteSession(session.id);
                                                        onDeleted();
                                                    }
                                                }
                                            ]);
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="close" size={16} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.cardTitle} numberOfLines={1}>{session.title}</Text>

                            <View style={styles.cardFooter}>
                                <View style={styles.metaInfoRow}>
                                    <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                                    <Text style={styles.metaText}>{formatDuration(session.totalSeconds)}</Text>
                                    <View style={styles.divider} />
                                    <Ionicons name="list-outline" size={13} color={COLORS.textMuted} />
                                    <Text style={styles.metaText}>{session.totalQuestions}문항</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // 헤더
    historyHeader: { paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
    headerSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

    // 캘린더 영역
    calendarWrapper: {
        marginBottom: 24,
        borderRadius: 32,
        overflow: 'hidden',
        marginHorizontal: 16,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 8,
    },

    // 요약 영역
    summaryContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    listHeaderTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

    summaryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    detailLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 6,
    },
    detailLinkText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },

    // 빈 상태
    emptyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        gap: 12,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },

    // 개별 리스트
    sessionListContainer: {
        paddingHorizontal: 20,
    },
    sessionListTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 12,
    },
    sessionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    badgeContainer: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 12, color: COLORS.textMuted, marginRight: 8 },
    deleteBtn: { padding: 2 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    metaInfoRow: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginLeft: 4, marginRight: 2 },
    divider: { width: 1, height: 10, backgroundColor: COLORS.border, marginHorizontal: 8 },
});
