import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars'; // 라이브러리 import
import { ExamSession } from '../lib/storage';
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
    onDeleted: () => void;
    onViewDailyAnalysis: (date: string) => void;
};

// 시간 포맷 헬퍼
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};

export default function HistoryTab({
    sessionsCount,
    dateSections,
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
        <View style={styles.container}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // 헤더
    historyHeader: { paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 2 },
    headerSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

    // 캘린더 영역
    calendarWrapper: {
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        marginHorizontal: 16,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 4,
    },

    // 요약 영역
    summaryContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    listHeaderTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

    summaryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
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
        height: 24,
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
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        gap: 10,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
});
