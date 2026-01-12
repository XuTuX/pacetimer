import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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
import { getStudyDateKey } from '../../lib/studyDate';
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
    const [visibleMonth, setVisibleMonth] = useState(() => params.date || getStudyDateKey(Date.now()));

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [calendarKey, setCalendarKey] = useState(0);

    useFocusEffect(useCallback(() => {
        const today = getStudyDateKey(Date.now());
        setSelectedDate(today);
        setVisibleMonth(today);
        setSelectedSessionId(null);
        setCalendarKey(prev => prev + 1);

        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []));

    React.useEffect(() => {
        if (params.date) {
            setSelectedDate(params.date);
            setVisibleMonth(params.date);
        }
    }, [params.date]);

    const subjectsById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
    const index = useMemo(() => buildRecordsIndex({ sessions, segments, questionRecords, nowMs }), [sessions, segments, questionRecords, nowMs]);

    const dayList = useMemo(() => {
        return Object.values(index.dayStatsByDate).sort((a, b) => b.date.localeCompare(a.date));
    }, [index.dayStatsByDate]);

    const minDate = useMemo(() => {
        if (!dayList.length) return undefined;
        const earliest = dayList[dayList.length - 1].date;
        return `${earliest.slice(0, 7)}-01`;
    }, [dayList]);

    const canGoPrev = useMemo(() => {
        if (!minDate) return false;
        return visibleMonth.slice(0, 7) > minDate.slice(0, 7);
    }, [visibleMonth, minDate]);

    React.useEffect(() => {
        if (!minDate) return;
        if (selectedDate < minDate) {
            setSelectedDate(minDate);
        }
    }, [minDate, selectedDate]);

    // 마킹 로직
    const markedDates = useMemo(() => {
        const marks: any = {};

        // 1. 학습 데이터 마킹 (히트맵 배경색)
        for (const day of dayList) {
            const totalMinutes = day.durationMs / 60000;
            if (totalMinutes <= 0) continue;

            let color = COLORS.primary + '33';
            let textColor = COLORS.text;
            let isHeavy = false; // [NEW] 배경색이 진한지 여부를 판별하는 플래그

            if (totalMinutes >= 360) {
                color = COLORS.primary;
                textColor = COLORS.white;
                isHeavy = true; // [NEW] 가장 진한 색
            } else if (totalMinutes >= 180) {
                color = COLORS.primary + '99';
                textColor = COLORS.white;
                isHeavy = true; // [NEW] 중간 진한 색 (텍스트가 흰색인 경우 Heavy로 간주)
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
                        fontWeight: '700',
                        fontSize: 14
                    },
                },
                isHeavy, // [NEW] dayComponent에 전달
            };
        }

        // 1.5. 오늘 날짜 스타일링
        const shiftedToday = getStudyDateKey(nowMs);
        if (!marks[shiftedToday]) {
            marks[shiftedToday] = {
                customStyles: {
                    container: {},
                    text: { color: COLORS.text }
                },
                isHeavy: false // 데이터가 없으면 Heavy가 아님
            };
        }

        const todayEntry = marks[shiftedToday];

        // [수정] 배경이 진하지 않을 때만 텍스트를 Primary 색상으로 강조
        // 배경이 진하면(isHeavy=true) 이미 text가 White로 설정되어 있으므로 가독성을 위해 유지
        if (!todayEntry.isHeavy && todayEntry.customStyles.text && todayEntry.customStyles.text.color === COLORS.text) {
            todayEntry.customStyles.text.color = COLORS.primary;
            todayEntry.customStyles.text.fontWeight = '900';
        }

        // 2. 선택된 날짜 처리
        const isMarked = !!marks[selectedDate];
        const existingStyle = isMarked ? marks[selectedDate].customStyles : null;
        const finalBackgroundColor = existingStyle?.container?.backgroundColor || 'transparent';
        const isSelectedDayHeavy = marks[selectedDate]?.isHeavy || false; // 선택된 날짜가 Heavy한지 확인

        marks[selectedDate] = {
            customStyles: {
                container: {
                    backgroundColor: finalBackgroundColor,
                    borderRadius: 12,
                    width: 38,
                    height: 38,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                text: existingStyle ? existingStyle.text : {},
            },
            isSelected: true,
            isHeavy: isSelectedDayHeavy, // [NEW] 선택된 날짜 객체에도 isHeavy 정보 전달
        };

        return marks;
    }, [dayList, selectedDate, nowMs]);

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
                            key={calendarKey}
                            current={visibleMonth}
                            onMonthChange={(month: { dateString: string }) => setVisibleMonth(month.dateString)}
                            monthFormat={'yyyy년 MM월'}
                            markingType={'custom'}
                            markedDates={markedDates}
                            minDate={minDate}
                            disableArrowLeft={!canGoPrev}

                            // [수정] 커스텀 Day 컴포넌트: isHeavy 플래그에 따라 점 색상 변경
                            dayComponent={({ date, marking, state }: any) => {
                                const isSelected = marking?.isSelected;
                                const isHeavy = marking?.isHeavy; // [NEW] 배경이 어두운지 확인

                                const containerStyle = marking?.customStyles?.container || {};
                                const textStyle = marking?.customStyles?.text || {};

                                const isDisabled = state === 'disabled';
                                const defaultTextColor = isDisabled ? '#d9e1e8' : COLORS.text;
                                const textColor = textStyle.color || defaultTextColor;

                                ;

                                if (!date) return <View style={{ width: 38 }} />;

                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (!isDisabled && date?.dateString) {
                                                setSelectedDate(date.dateString);
                                                setVisibleMonth(date.dateString);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        style={[
                                            containerStyle,
                                            {
                                                width: 38,
                                                height: 38,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }
                                        ]}
                                    >
                                        {/* 선택 표시 점 (Dot) */}
                                        {isSelected && (
                                            <View style={{
                                                position: 'absolute',
                                                top: 4,
                                                width: 5,
                                                height: 5,
                                                borderRadius: 2.5,
                                                backgroundColor: COLORS.red, // [NEW] 동적 색상 적용
                                            }} />
                                        )}

                                        <Text style={[
                                            { fontSize: 15, fontWeight: '600', color: textColor },
                                            textStyle
                                        ]}>
                                            {date.day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}

                            theme={{
                                todayTextColor: COLORS.text,
                                arrowColor: COLORS.text,
                                textSectionTitleColor: '#666666',
                                textDayHeaderFontWeight: '700',
                                textDayHeaderFontSize: 13,
                                textMonthFontWeight: '800',
                                textMonthFontSize: 20,
                                textDayFontWeight: '600',
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
                            }}
                            enableSwipeMonths={true}
                        />

                        {/* 히트맵 범례 */}
                        <View style={styles.heatmapLegend}>
                            <Text style={styles.legendLabel}>3시간 이내</Text>
                            <View style={styles.legendSteps}>
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '33' }]} />
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '99' }]} />
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary }]} />
                            </View>
                            <Text style={styles.legendLabel}>6시간 이상</Text>
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
                        <SessionDetail
                            nowMs={nowMs}
                            session={session}
                            sessionStats={sessionStats}
                            segments={index.segmentsBySessionId[session.id] ?? []}
                            questionsBySegmentId={index.questionsBySegmentId}
                            subjectsById={subjectsById}
                            onClose={() => setSelectedSessionId(null)}
                        />
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