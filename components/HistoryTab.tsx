import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExamSession, deleteSession } from '../lib/storage'; // 경로 맞춰서 수정
import { COLORS } from '../lib/theme'; // 경로 맞춰서 수정

// --- 초록색 테마 설정 ---
const THEME_GREEN = {
    point: '#00D094',
    pointLight: '#E6F9F4',
    textMain: '#222222',
    textMuted: '#8E8E93',
};

type DateSection = {
    date: string;
    displayDate: string;
    sessions: ExamSession[];
};

type Props = {
    sessionsCount: number;
    dateSections: DateSection[];
    onSelectSession: (session: ExamSession) => void;
    onDeleted: () => void; // 삭제 후 목록 리로드 트리거
};

export default function HistoryTab({
    sessionsCount,
    dateSections,
    onSelectSession,
    onDeleted,
}: Props) {
    return (
        <View>
            <View style={styles.historyHeader}>
                <Text style={styles.historyCount}>전체 {sessionsCount}개의 기록</Text>
            </View>

            {dateSections.map((section) => (
                <View key={section.date} style={styles.dateGroup}>
                    <Text style={styles.dateHeader}>{section.displayDate}</Text>

                    {section.sessions.map((session) => (
                        <TouchableOpacity
                            key={session.id}
                            style={styles.sessionCard}
                            onPress={() => onSelectSession(session)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardInfo}>
                                <View style={styles.tagRow}>
                                    <View style={styles.categoryDot} />
                                    <Text style={styles.categoryNameText}>{session.categoryName}</Text>
                                    <Text style={styles.cardTime}>
                                        {new Date(session.date).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>

                                <Text style={styles.cardTitle} numberOfLines={1}>
                                    {session.title}
                                </Text>

                                <Text style={styles.cardSub}>
                                    {Math.floor(session.totalSeconds / 60)}분 · {session.totalQuestions}문항
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => {
                                    Alert.alert('삭제', '이 기록을 삭제하시겠습니까?', [
                                        { text: '취소', style: 'cancel' },
                                        {
                                            text: '삭제',
                                            style: 'destructive',
                                            onPress: async () => {
                                                await deleteSession(session.id);
                                                onDeleted();
                                            },
                                        },
                                    ]);
                                }}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Ionicons name="trash-outline" size={18} color={COLORS.border} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    // 기록 탭 헤더
    historyHeader: { marginBottom: 16, paddingLeft: 4 },
    historyCount: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

    dateGroup: { marginBottom: 28 },
    dateHeader: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 14,
        marginLeft: 4,
    },

    // 세션 카드 & 도트 스타일
    sessionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardInfo: { flex: 1 },
    tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },

    categoryDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: THEME_GREEN.point,
        marginRight: 6,
    },
    categoryNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#444',
        marginRight: 10,
    },
    cardTime: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '500' },

    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: THEME_GREEN.textMain,
        marginBottom: 6,
    },
    cardSub: { fontSize: 13, color: THEME_GREEN.textMuted, fontWeight: '500' },

    deleteBtn: { padding: 10, marginLeft: 10 },
});
