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
import { COLORS, SHADOWS } from '../../lib/theme';

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

    const markedDates = useMemo(() => {
        const marks: any = {};
        for (const day of dayList) {
            const totalMinutes = day.durationMs / 60000;
            if (totalMinutes <= 0) continue;

            let color = COLORS.primaryLight;
            let textColor = COLORS.text;

            if (totalMinutes >= 360) { // 6h+: 3단계
                color = COLORS.primary;
                textColor = COLORS.white;
            } else if (totalMinutes >= 180) { // 3h+: 2단계
                color = COLORS.primary + '80';
                textColor = COLORS.white;
            } else if (totalMinutes > 0) { // 1단계
                color = COLORS.primary + '33';
                textColor = COLORS.text;
            } else {
                color = 'rgba(0,0,0,0.03)';
                textColor = COLORS.text;
            }

            marks[day.date] = {
                customStyles: {
                    container: { backgroundColor: color, borderRadius: 8 },
                    text: { color: textColor, fontWeight: '700' },
                },
            };
        }

        if (marks[selectedDate]) {
            marks[selectedDate].customStyles.container = {
                ...marks[selectedDate].customStyles.container,
                borderWidth: 2,
                borderColor: COLORS.text,
            };
        } else {
            marks[selectedDate] = {
                customStyles: {
                    container: { borderWidth: 2, borderColor: COLORS.text, borderRadius: 8 },
                    text: { color: COLORS.text, fontWeight: '700' },
                },
            };
        }
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
                    <View style={styles.calendarWrapper}>
                        <Calendar
                            current={selectedDate}
                            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                            monthFormat={'yyyy년 MM월'}
                            markingType={'custom'}
                            markedDates={markedDates}
                            theme={{
                                todayTextColor: COLORS.primary,
                                arrowColor: COLORS.text,
                                textDayFontWeight: '700',
                                textMonthFontWeight: '900',
                                textDayHeaderFontWeight: '800',
                                textDayFontSize: 13,
                                textMonthFontSize: 17,
                                calendarBackground: 'transparent',
                                dayTextColor: COLORS.text,
                                textSectionTitleColor: COLORS.textMuted,
                            }}
                            enableSwipeMonths={true}
                        />

                        <View style={styles.legendContainer}>
                            <Text style={styles.legendLabel}>학습 강도</Text>
                            <View style={styles.legendRow}>
                                <Text style={styles.legendText}>적음</Text>
                                <View style={styles.legendStages}>
                                    <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '33' }]} />
                                    <View style={[styles.legendBox, { backgroundColor: COLORS.primary + '80' }]} />
                                    <View style={[styles.legendBox, { backgroundColor: COLORS.primary }]} />
                                </View>
                                <Text style={styles.legendText}>많음</Text>
                            </View>
                        </View>
                    </View>

                    <DayDetail
                        date={selectedDate}
                        nowMs={nowMs}
                        sessions={index.sessionsByDate[selectedDate] ?? []}
                        sessionStatsById={index.sessionStatsById}
                        subjectsById={subjectsById}
                        onOpenSession={(sessionId) => setSelectedSessionId(sessionId)}
                    />
                </View>
            </ScrollView>

            {selectedSessionId && (() => {
                const session = index.sessionsById[selectedSessionId];
                const sessionStats = index.sessionStatsById[selectedSessionId];
                if (!session || !sessionStats) return null;
                return (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                        <ScreenHeader
                            title="세션 상세"
                            subtitle={`${formatDisplayDate(session.studyDate, nowMs)} · ${session.studyDate}`}
                            onBack={() => setSelectedSessionId(null)}
                        />
                        <ScrollView
                            style={{ flex: 1, backgroundColor: COLORS.bg }}
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
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { flex: 1 },
    historyWrapper: {
        paddingHorizontal: 24,
        paddingTop: 8,
        gap: 24,
    },
    calendarWrapper: {
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
        padding: 12,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    legendContainer: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 4,
    },
    legendLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 10,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    legendStages: {
        flexDirection: 'row',
        gap: 6,
    },
    legendBox: {
        width: 14,
        height: 14,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
});
