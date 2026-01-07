import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopwatchDisplay from '../../../components/StopwatchDisplay';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';
import { QuestionRecord } from '../../../lib/types';

export default function ProblemSolvingRunScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const subjectId = params.subjectId as string;
    const subjectName = params.subjectName as string;

    const { addQuestionRecord, startSession, endSession } = useAppStore();

    // Local State
    const [questionNo, setQuestionNo] = useState(1);
    const [status, setStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);

    useEffect(() => {
        startSession('study');
        return () => endSession();
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (status === 'RUNNING' && lapStartAt) {
            interval = setInterval(() => {
                setLapElapsed(Date.now() - lapStartAt);
            }, 16); // Faster update for smooth milliseconds
        }
        return () => clearInterval(interval);
    }, [status, lapStartAt]);

    const handleTap = () => {
        const now = Date.now();
        if (status === 'IDLE') {
            setStatus('RUNNING');
            setLapStartAt(now);
            setLapElapsed(0);
        } else {
            if (!lapStartAt) return;
            const duration = now - lapStartAt;

            // Save Record
            const record: QuestionRecord = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'practice-session',
                subjectId: subjectId,
                questionNo: questionNo,
                durationMs: duration,
                startedAt: lapStartAt,
                endedAt: now,
                source: 'tap',
            };
            addQuestionRecord(record);

            setStatus('IDLE');
            setQuestionNo(q => q + 1);
            setLapStartAt(null);
        }
    };

    const formatMs = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const dec = Math.floor((ms % 1000) / 10);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerLabel}>현재 과목</Text>
                    <Text style={styles.headerTitle}>{subjectName}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>누적 시간</Text>
                    <StopwatchDisplay textStyle={styles.statValue} />
                </View>
                <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.statLabel}>문항 번호</Text>
                    <Text style={[styles.statValue, { color: COLORS.primary }]}>Q{questionNo}</Text>
                </View>
            </View>

            <View style={styles.main}>
                <View style={styles.timerCircle}>
                    <Text style={styles.timerText}>{formatMs(lapElapsed)}</Text>
                    <Text style={styles.statusText}>{status === 'IDLE' ? '준비' : '풀이 중...'}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.tapBtn, status === 'RUNNING' ? styles.tapBtnRunning : styles.tapBtnIdle]}
                    onPress={handleTap}
                    activeOpacity={0.9}
                >
                    <Text style={styles.tapBtnText}>{status === 'IDLE' ? 'START' : 'DONE'}</Text>
                    <Text style={styles.tapBtnSub}>{status === 'IDLE' ? '터치하여 풀이 시작' : '터치하여 문항 저장'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerInfo: {
        alignItems: 'center',
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        marginTop: 24,
    },
    statItem: {
        gap: 6,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
    },
    main: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerCircle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 72,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -2,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 12,
    },
    footer: {
        padding: 32,
        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    },
    tapBtn: {
        height: 120,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    tapBtnIdle: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    tapBtnRunning: {
        backgroundColor: COLORS.text,
    },
    tapBtnText: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    tapBtnSub: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
        opacity: 0.7,
    },
});
