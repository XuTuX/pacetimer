import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DayDetail from '../../components/history/DayDetail';
import SessionDetail from '../../components/history/SessionDetail';
import { HeaderSettings } from '../../components/ui/HeaderSettings';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { buildRecordsIndex } from '../../lib/recordsIndex';
import { useAppStore } from '../../lib/store';
import { formatDisplayDate, getStudyDateKey } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';

LocaleConfig.locales['kr'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';

export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { subjects, sessions, segments, questionRecords } = useAppStore();
    const [nowMs, setNowMs] = useState(Date.now());
    const params = useLocalSearchParams<{ date?: string }>();
    const [selectedDate, setSelectedDate] = useState(() => params.date || getStudyDateKey(Date.now()));

    React.useEffect(() => {
        if (params.date) {
            setSelectedDate(params.date);
        }
    }, [params.date]);

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []));

    const subjectsById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
    const index = useMemo(() => buildRecordsIndex({ sessions, segments, questionRecords, nowMs }), [sessions, segments, questionRecords, nowMs]);

    const dayList = useMemo(() => {
        return Object.values(index.dayStatsByDate).sort((a, b) => b.date.localeCompare(a.date));
    }, [index.dayStatsByDate]);

    // 마킹 로직
    const markedDates = useMemo(() => {
        const marks: any = {};

        // 1. 학습 데이터 마킹
        for (const day of dayList) {
            const totalMinutes = day.durationMs / 60000;
            if (totalMinutes <= 0) continue;

            let color = COLORS.primary + '33';
            let textColor = COLORS.text;

            if (totalMinutes >= 360) {
                color = COLORS.primary;
                textColor = COLORS.white;
            } else if (totalMinutes >= 180) {
                color = COLORS.primary + '99';
                textColor = COLORS.white;
            }

            marks[day.date] = {
                customStyles: {
                    container: {
                        backgroundColor: color,
                        borderRadius: 12,
                        width: 38,
                        height: 38,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    text: {
                        color: textColor,
                        fontWeight: '700', // 데이터 있는 날은 약간 굵게
                        fontSize: 14
                    },
                },
            };
        }

        // 2. 선택된 날짜 처리
        const isMarked = !!marks[selectedDate];
        const existingStyle = isMarked ? marks[selectedDate].customStyles : null;

        const finalBackgroundColor = existingStyle ? existingStyle.container.backgroundColor : 'transparent';
        const finalTextColor = existingStyle ? existingStyle.text.color : COLORS.primary;

        marks[selectedDate] = {
            customStyles: {
                container: {
                    backgroundColor: finalBackgroundColor,
                    borderWidth: 2,
                    borderColor: COLORS.primary,
                    borderRadius: 12,
                    width: 38,
                    height: 38,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15, // 그림자도 살짝 연하게 조정
                    shadowRadius: 3,
                    elevation: 3,
                },
                text: {
                    color: finalTextColor,
                    fontWeight: '700', // [수정됨] 900 -> 700 (자연스러운 굵기)
                    fontSize: 14,
                },
            },
        };

        return marks;
    }, [dayList, selectedDate]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="학습 기록"
                rightElement={<HeaderSettings />}
                showBack={false}
                align="left"
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                <View style={styles.historyWrapper}>
                    <View style={styles.calendarContainer}>
                        <Calendar
                            current={selectedDate}
                            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                            monthFormat={'yyyy년 MM월'}
                            markingType={'custom'}
                            markedDates={markedDates}
                            theme={{
                                todayTextColor: COLORS.primary,
                                arrowColor: COLORS.text,

                                // 요일 헤더
                                textSectionTitleColor: '#666666',
                                textDayHeaderFontWeight: '700',
                                textDayHeaderFontSize: 13,

                                // 월 제목
                                textMonthFontWeight: '800',
                                textMonthFontSize: 20,

                                // 날짜 텍스트
                                textDayFontWeight: '600', // 기본 날짜 굵기
                                textDayFontSize: 15,
                                dayTextColor: COLORS.text,

                                calendarBackground: 'transparent',

                                // @ts-ignore
                                'stylesheet.calendar.header': {
                                    header: {
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 10,
                                        alignItems: 'center',
                                        marginBottom: 20,
                                        marginTop: 10,
                                    },
                                    monthText: {
                                        fontSize: 22,
                                        fontWeight: '800',
                                        color: COLORS.text,
                                    },
                                    week: {
                                        marginTop: 10,
                                        flexDirection: 'row',
                                        justifyContent: 'space-around',
                                        paddingBottom: 10,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#F0F0F0',
                                        marginBottom: 10,
                                    }
                                },
                                // @ts-ignore
                                'stylesheet.day.basic': {
                                    base: {
                                        width: 38,
                                        height: 38,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }
                                }
                            }}
                            enableSwipeMonths={true}
                        />

                        {/* 히트맵 범례 */}
                        <View style={styles.heatmapLegend}>
                            <Text style={styles.legendLabel}>Less</Text>
                            <View style={styles.legendSteps}>
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '33' }]} />
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '99' }]} />
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary }]} />
                            </View>
                            <Text style={styles.legendLabel}>More</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.listContainer}>
                        <DayDetail
                            date={selectedDate}
                            nowMs={nowMs}
                            sessions={index.sessionsByDate[selectedDate] ?? []}
                            sessionStatsById={index.sessionStatsById}
                            subjectsById={subjectsById}
                            onOpenSession={(sessionId) => setSelectedSessionId(sessionId)}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Session Detail Modal */}
            {selectedSessionId && (() => {
                const session = index.sessionsById[selectedSessionId];
                const sessionStats = index.sessionStatsById[selectedSessionId];
                if (!session || !sessionStats) return null;
                return (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                        <ScreenHeader
                            title="세션 상세"
                            subtitle={`${formatDisplayDate(session.studyDate, nowMs)}`}
                            onBack={() => setSelectedSessionId(null)}
                        />
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <SessionDetail
                                nowMs={nowMs}
                                session={session}
                                sessionStats={sessionStats}
                                segments={index.segmentsBySessionId[session.id] ?? []}
                                questionsBySegmentId={index.questionsBySegmentId}
                                subjectsById={subjectsById}
                            />
                        </ScrollView>
                    </View>
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    content: {
        flex: 1
    },
    historyWrapper: {},
    calendarContainer: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    heatmapLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 8,
    },
    legendSteps: {
        flexDirection: 'row',
        gap: 4,
    },
    legendBox: {
        width: 14,
        height: 14,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#888',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 24,
        marginVertical: 20,
    },
    listContainer: {
        paddingHorizontal: 24,
        minHeight: 300,
    }
});