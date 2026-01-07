import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
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
            }, 50);
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
        Alert.alert("Finish Exam", "Are you sure you want to finish?", [
            { text: "Cancel", style: "cancel" },
            { text: "Finish", onPress: () => router.back() }
        ]);
    };

    const formatSec = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const formatMs = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const dec = Math.floor((ms % 1000) / 10);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
    };

    const currentQ = qMap[currentSubjectId] || 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.timerLabel}>REMAINING</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.error }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.timerLabel}>GLOBAL</Text>
                    <StopwatchDisplay textStyle={styles.globalTime} showSeconds={false} />
                </View>
            </View>

            {/* Subject Tabs */}
            <View style={styles.tabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

            {/* Main Area */}
            <View style={styles.mainArea}>
                <Text style={styles.qText}>Q{currentQ}</Text>
                <Text style={styles.lapText}>{formatMs(lapElapsed)}</Text>
            </View>

            {/* Tap Button */}
            <TouchableOpacity
                style={[styles.tapButton, status === 'RUNNING' ? styles.tapButtonRunning : styles.tapButtonIdle]}
                onPress={handleTap}
                activeOpacity={0.8}
            >
                <Text style={styles.tapButtonText}>{status === 'IDLE' ? 'START' : 'DONE'}</Text>
            </TouchableOpacity>

            {/* End Button */}
            <TouchableOpacity style={styles.endButton} onPress={handleEndExam}>
                <Text style={styles.endButtonText}>Finish Exam</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

type Styles = {
    container: ViewStyle;
    topBar: ViewStyle;
    timerLabel: TextStyle;
    examTimer: TextStyle;
    globalTime: TextStyle;
    tabs: ViewStyle;
    tab: ViewStyle;
    activeTab: ViewStyle;
    tabText: TextStyle;
    activeTabText: TextStyle;
    mainArea: ViewStyle;
    qText: TextStyle;
    lapText: TextStyle;
    tapButton: ViewStyle;
    tapButtonIdle: ViewStyle;
    tapButtonRunning: ViewStyle;
    tapButtonText: TextStyle;
    endButton: ViewStyle;
    endButtonText: TextStyle;
};

const styles = StyleSheet.create<Styles>({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    timerLabel: {
        fontSize: 12,
        color: COLORS.gray,
        fontWeight: '700',
        marginBottom: 4,
    },
    examTimer: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    globalTime: {
        fontSize: 18,
        color: COLORS.text,
        fontWeight: '600',
    },
    tabs: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 4,
        backgroundColor: COLORS.bg,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.gray,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    mainArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qText: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.primary,
        marginBottom: 8,
    },
    lapText: {
        fontSize: 64,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    tapButton: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    tapButtonIdle: {
        backgroundColor: COLORS.primary,
    },
    tapButtonRunning: {
        backgroundColor: COLORS.text,
    },
    tapButtonText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
    endButton: {
        position: 'absolute',
        bottom: 200, // Above tap button? No, tap button is huge.
        // Re-layout: Tap Button at bottom. End button top right?
        // Or small "Finish" text below tabs?
        // Let's put End Button at Top Right of header in real app, but here I put it floating or just keep it as a small bar below tap button?
        // Actually standard UI: Tap Button occupies bottom area.
        // I'll put End Button top right in the Header area actually.
        // Modifying TopBar to include End Button?
        // Let's just create a small "Quit" button top left or right.
        display: 'none', // Hide for now, relying on Back button which triggers alert
    },
    endButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
