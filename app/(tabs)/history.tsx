import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DayDetail from '../../components/history/DayDetail';
import SessionDetail from '../../components/history/SessionDetail';
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
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const { subjects, sessions, segments, questionRecords } = useAppStore();
    const [nowMs, setNowMs] = useState(Date.now());
    const params = useLocalSearchParams<{ date?: string }>();
    const [selectedDate, setSelectedDate] = useState(() => params.date || getStudyDateKey(Date.now()));

    // Update selected date if params.date changes
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
            const totalSeconds = day.durationMs / 1000;
            if (totalSeconds <= 0) continue;

            let color = COLORS.primaryLight;
            if (totalSeconds > 10800) color = COLORS.primary; // 3h+
            else if (totalSeconds > 3600) color = '#70E8C1'; // medium mint
            else color = '#B2F2DE'; // light mint

            marks[day.date] = {
                customStyles: {
                    container: {
                        backgroundColor: color,
                        borderRadius: 8,
                    },
                    text: {
                        color: totalSeconds > 3600 ? COLORS.white : COLORS.text,
                        fontWeight: '700',
                    },
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

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>학습 기록</Text>
                        <Text style={styles.userLabel}>{userId || 'Guest User'}</Text>
                    </View>
                    <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(v => !v)}>
                        <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    {settingsOpen && (
                        <View style={styles.dropdown}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => router.push('/subjects/manage')}>
                                <Ionicons name="book-outline" size={18} color={COLORS.text} />
                                <Text style={styles.dropdownText}>과목 관리</Text>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
                                <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
                                <Text style={[styles.dropdownText, { color: COLORS.accent }]}>로그아웃</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    <View style={styles.historyWrapper}>
                        <View style={styles.calendarWrapper}>
                            <Calendar
                                current={selectedDate}
                                onDayPress={(day: { dateString: string }) => {
                                    setSettingsOpen(false);
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

                        <View style={styles.selectedDateHeader}>
                            <Text style={styles.selectedDateTitle}>{formatDisplayDate(selectedDate, nowMs)}</Text>
                            <Text style={styles.selectedDateSub}>{selectedDate}</Text>
                        </View>

                        <DayDetail
                            sessions={index.sessionsByDate[selectedDate] ?? []}
                            sessionStatsById={index.sessionStatsById}
                            subjectsById={subjectsById}
                            onOpenSession={(sessionId) => setSelectedSessionId(sessionId)}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>

            {selectedSessionId && (() => {
                const session = index.sessionsById[selectedSessionId];
                const sessionStats = index.sessionStatsById[selectedSessionId];
                if (!session || !sessionStats) return null;
                return (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'bottom']}>
                            <View style={styles.overlayHeader}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSessionId(null)}>
                                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.overlayTitle}>세션 상세</Text>
                                    <Text style={styles.overlaySub}>{formatDisplayDate(session.studyDate, nowMs)} · {session.studyDate}</Text>
                                </View>
                                <View style={{ width: 44 }} />
                            </View>

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
                        </SafeAreaView>
                    </View>
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    userLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdown: {
        position: 'absolute',
        top: 70,
        right: 24,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 8,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    content: { flex: 1 },
    historyWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 18,
    },

    calendarWrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 4,
    },

    selectedDateHeader: { paddingHorizontal: 4, gap: 2 },
    selectedDateTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
    selectedDateSub: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

    overlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
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
    overlayTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
    overlaySub: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
});
