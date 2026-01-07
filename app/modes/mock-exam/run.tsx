import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopwatchDisplay from '../../../components/StopwatchDisplay';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';
import { QuestionRecord } from '../../../lib/types';

export default function MockExamRunScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const subjectIds = (params.subjectIds as string).split(',');
    const limitMin = parseInt(params.limitMin as string);

    const { subjects, addQuestionRecord, startSession, endSession, startStopwatch, stopwatch } = useAppStore();

    const activeSubjects = subjects.filter(s => subjectIds.includes(s.id));
    const [currentSubjectId, setCurrentSubjectId] = useState(subjectIds[0]);

    // Exam Timer
    const [examStartedAt] = useState(Date.now());
    const [remainingSec, setRemainingSec] = useState(limitMin * 60);

    // Question State
    const [questionNo, setQuestionNo] = useState(1); // Per subject? Requirement says "Question # automatically +1", usually exam has 1..40.
    // Actually, usually mocks track question per subject.
    // Let's keep one generic counter per subject?
    // Simpler: Just one counter, user can change subject tab, but question number might need to be reset or tracked per subject?
    // Requirement 2-2: "Store after save, auto +1".
    // Requirement 5-2: "Switch Subject UI".
    // I'll track questionNo map: { [subjectId]: number }
    const [qMap, setQMap] = useState<Record<string, number>>(
        Object.fromEntries(subjectIds.map(id => [id, 1]))
    );

    const [status, setStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);

    useEffect(() => {
        // Start Global Stopwatch if not running
        if (!stopwatch.isRunning) {
            startStopwatch();
        }
        // Start Exam Session
        startSession('exam');

        const interval = setInterval(() => {
            const elapsedSec = Math.floor((Date.now() - examStartedAt) / 1000);
            const remain = (limitMin * 60) - elapsedSec;
            setRemainingSec(remain > 0 ? remain : 0);
        }, 1000);

        return () => {
            clearInterval(interval);
            endSession(); // End session on unmount? Or strictly on "End" button?
            // Usually better on End button, but safe cleanup here.
        };
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (status === 'RUNNING' && lapStartAt) {
            interval = setInterval(() => {
                setLapElapsed(Date.now() - lapStartAt);
            }, 16);
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
            const currentQ = qMap[currentSubjectId];

            const record: QuestionRecord = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'exam-session', // TODO correct ID
                subjectId: currentSubjectId,
                questionNo: currentQ,
                durationMs: duration,
                startedAt: lapStartAt,
                endedAt: now,
                source: 'tap',
            };
            addQuestionRecord(record);

            setStatus('IDLE');
            setQMap(prev => ({ ...prev, [currentSubjectId]: currentQ + 1 }));
            setLapStartAt(null);
        }
    };

    const handleEndExam = () => {
        Alert.alert("시험 종료", "현재까지의 기록을 저장하고 종료하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "종료", onPress: () => router.back() }
        ]);
    };

    const formatSec = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')} `;
    };

    const formatMs = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const dec = Math.floor((ms % 1000) / 10);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')} `;
    };

    const currentQ = qMap[currentSubjectId] || 1;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTimer}>
                    <Text style={styles.timerLabel}>남은 시간</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.accent }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>
                <View style={styles.headerGlobal}>
                    <Text style={styles.timerLabel}>전체 진행</Text>
                    <StopwatchDisplay textStyle={styles.globalTime} showSeconds={false} />
                </View>
                <TouchableOpacity onPress={handleEndExam} style={styles.endBtn}>
                    <Text style={styles.endBtnText}>종료</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
                    {activeSubjects.map(sub => (
                        <TouchableOpacity
                            key={sub.id}
                            style={[styles.tab, currentSubjectId === sub.id && styles.activeTab]}
                            onPress={() => setCurrentSubjectId(sub.id)}
                        >
                            <Text style={[styles.tabText, currentSubjectId === sub.id && styles.activeTabText]}>{sub.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.main}>
                <View style={styles.infoRow}>
                    <View style={styles.qBadge}>
                        <Text style={styles.qBadgeText}>Q{currentQ}</Text>
                    </View>
                    <Text style={styles.subjectHint}>{activeSubjects.find(s => s.id === currentSubjectId)?.name}</Text>
                </View>
                <Text style={styles.lapText}>{formatMs(lapElapsed)}</Text>
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
        paddingHorizontal: 24,
        paddingVertical: 20,
        gap: 20,
    },
    headerTimer: {
        flex: 1,
    },
    headerGlobal: {
        flex: 1,
    },
    timerLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    examTimer: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    globalTime: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    endBtn: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    endBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.accent,
    },
    tabBar: {
        backgroundColor: COLORS.bg,
    },
    tabContainer: {
        paddingHorizontal: 20,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.white,
    },
    main: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    qBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    qBadgeText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.primary,
    },
    subjectHint: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    lapText: {
        fontSize: 72,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -2,
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
    },
    tapBtnSub: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
        opacity: 0.7,
    },
});
