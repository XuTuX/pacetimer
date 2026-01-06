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

const THEME_GREEN = {
    point: '#00D094',
    pointLight: '#E6F9F4',
    textMain: '#1A1A1A',
    textSub: '#555555',
    textMuted: '#999999',
};

type DateSection = {
    date: string; // "YYYY-MM-DD"
    displayDate: string;
    sessions: ExamSession[];
};

type Props = {
    sessionsCount: number;
    dateSections: DateSection[];
    onSelectSession: (session: ExamSession) => void;
    onDeleted: () => void;
};

// 시간 포맷 헬퍼
const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
};

export default function HistoryTab({
    sessionsCount,
    dateSections,
    onSelectSession,
    onDeleted,
}: Props) {
    // 오늘 날짜 구하기 (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // 선택된 날짜 상태 (기본값: 오늘, 혹은 기록이 있는 가장 최근 날짜)
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // 1. 달력에 점(Mark)을 찍기 위한 데이터 가공
    const markedDates = useMemo(() => {
        const marks: any = {};

        dateSections.forEach((section) => {
            marks[section.date] = {
                marked: true,
                dotColor: THEME_GREEN.point,
            };
        });

        // 현재 선택된 날짜 스타일 덮어쓰기
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: THEME_GREEN.point,
            disableTouchEvent: true,
        };

        return marks;
    }, [dateSections, selectedDate]);

    // 2. 선택된 날짜에 해당하는 세션들만 필터링
    const selectedSessions = useMemo(() => {
        const section = dateSections.find((s) => s.date === selectedDate);
        return section ? section.sessions : [];
    }, [dateSections, selectedDate]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* 상단 통계 헤더 */}
            <View style={styles.historyHeader}>
                <View>
                    <Text style={styles.headerTitle}>학습 캘린더</Text>
                    <Text style={styles.headerSub}>총 {sessionsCount}번의 학습 기록이 있습니다.</Text>
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
                    markedDates={markedDates}
                    theme={{
                        selectedDayBackgroundColor: THEME_GREEN.point,
                        todayTextColor: THEME_GREEN.point,
                        arrowColor: THEME_GREEN.textMain,
                        dotColor: THEME_GREEN.point,
                        textDayFontWeight: '600',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: 'bold',
                        textDayFontSize: 14,
                        textMonthFontSize: 16,
                    }}
                    enableSwipeMonths={true}
                />
            </View>

            {/* 선택된 날짜 표시 */}
            <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>
                    {selectedDate === todayStr ? '오늘의 기록' : `${selectedDate} 기록`}
                </Text>
                <Text style={styles.listHeaderCount}>
                    {selectedSessions.length > 0 ? `${selectedSessions.length}개` : ''}
                </Text>
            </View>

            {/* 리스트 렌더링 */}
            <View style={styles.listContainer}>
                {selectedSessions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-clear-outline" size={40} color="#DDD" />
                        <Text style={styles.emptyText}>이 날은 학습 기록이 없어요.</Text>
                    </View>
                ) : (
                    selectedSessions.map((session) => (
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
                                        <Ionicons name="close" size={16} color={THEME_GREEN.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.cardTitle} numberOfLines={1}>{session.title}</Text>

                            <View style={styles.cardFooter}>
                                <View style={styles.metaInfoRow}>
                                    <Ionicons name="time-outline" size={13} color={THEME_GREEN.textSub} />
                                    <Text style={styles.metaText}>{formatDuration(session.totalSeconds)}</Text>
                                    <View style={styles.divider} />
                                    <Ionicons name="list-outline" size={13} color={THEME_GREEN.textSub} />
                                    <Text style={styles.metaText}>{session.totalQuestions}문항</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={THEME_GREEN.textMuted} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },

    // 헤더
    historyHeader: { paddingHorizontal: 20, marginBottom: 16, marginTop: 10 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: THEME_GREEN.textMain, marginBottom: 4 },
    headerSub: { fontSize: 13, color: THEME_GREEN.textMuted },

    // 캘린더 영역
    calendarWrapper: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 16,
        elevation: 3,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // 리스트 헤더
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    listHeaderTitle: { fontSize: 18, fontWeight: '700', color: THEME_GREEN.textMain },
    listHeaderCount: { fontSize: 14, fontWeight: '600', color: THEME_GREEN.point },

    // 리스트 컨테이너
    listContainer: { paddingHorizontal: 16 },

    // 세션 카드 디자인
    sessionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    badgeContainer: {
        backgroundColor: THEME_GREEN.pointLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: { color: THEME_GREEN.point, fontSize: 11, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 12, color: THEME_GREEN.textMuted, marginRight: 8 },
    deleteBtn: { padding: 2 },

    cardTitle: { fontSize: 16, fontWeight: '700', color: THEME_GREEN.textMain, marginBottom: 14 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F7F7F7' },
    metaInfoRow: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 13, color: THEME_GREEN.textSub, marginLeft: 4, marginRight: 2 },
    divider: { width: 1, height: 10, backgroundColor: '#E0E0E0', marginHorizontal: 8 },

    // 빈 상태
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { marginTop: 10, color: THEME_GREEN.textMuted, fontSize: 14 },
});
