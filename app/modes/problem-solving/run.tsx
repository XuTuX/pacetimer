import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

    const { addQuestionRecord, currentSession, startSession } = useAppStore();

    // Local State
    const [questionNo, setQuestionNo] = useState(1);
    const [status, setStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);

    // Local Lap Timer Display
    const [lapElapsed, setLapElapsed] = useState(0);

    // Start a "Study Session" if not exists? 
    // Requirement doesn't strictly enforce a global session for just single problem solving, but good for tracking.
    // For now, we focus on the QuestionRecord logic.

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (status === 'RUNNING' && lapStartAt) {
            interval = setInterval(() => {
                setLapElapsed(Date.now() - lapStartAt);
            }, 50);
        } else {
            // If IDLE, we just keep showing the last lap time or 0
        }
        return () => clearInterval(interval);
    }, [status, lapStartAt]);

    const handleTap = () => {
        const now = Date.now();

        if (status === 'IDLE') {
            // Start Question
            setStatus('RUNNING');
            setLapStartAt(now);
            setLapElapsed(0);
        } else {
            // End Question
            if (!lapStartAt) return;
            const duration = now - lapStartAt;

            // Save Record
            const record: QuestionRecord = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user', // TODO: Real user
                sessionId: 'session-id', // TODO: Real session ID
                subjectId: subjectId,
                questionNo: questionNo,
                durationMs: duration,
                startedAt: lapStartAt,
                endedAt: now,
                source: 'tap',
            };
            addQuestionRecord(record);

            // Reset for next
            setStatus('IDLE');
            setQuestionNo(q => q + 1);
            setLapStartAt(null);
            // Keep lapElapsed showing the result for a moment? Or reset?
            // Requirement: "Saved + Question No +1".
        }
    };

    const formatMs = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const dec = Math.floor((ms % 1000) / 10); // 2 digits
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{subjectName}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Info Bar */}
            <View style={styles.infoBar}>
                <View>
                    <Text style={styles.label}>TOTAL TIME</Text>
                    <StopwatchDisplay textStyle={styles.globalTimeText} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>QUESTION NO.</Text>
                    <Text style={styles.questionNoText}>{questionNo}</Text>
                </View>
            </View>

            {/* Main Area */}
            <View style={styles.mainArea}>
                <Text style={styles.lapTimeText}>{formatMs(lapElapsed)}</Text>
                <Text style={styles.statusText}>{status === 'IDLE' ? 'Ready to Start' : 'Solving...'}</Text>
            </View>

            {/* Big Tap Button */}
            <TouchableOpacity
                style={[styles.tapButton, status === 'RUNNING' ? styles.tapButtonRunning : styles.tapButtonIdle]}
                onPress={handleTap}
                activeOpacity={0.8}
            >
                <Text style={styles.tapButtonText}>
                    {status === 'IDLE' ? 'START' : 'DONE'}
                </Text>
            </TouchableOpacity>
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
        padding: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 16,
    },
    label: {
        fontSize: 12,
        color: COLORS.gray,
        fontWeight: '700',
        marginBottom: 4,
    },
    globalTimeText: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    questionNoText: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.primary,
    },
    mainArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lapTimeText: {
        fontSize: 72,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
        color: COLORS.text,
    },
    statusText: {
        fontSize: 16,
        color: COLORS.gray,
        marginTop: 16,
    },
    tapButton: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    tapButtonIdle: {
        backgroundColor: COLORS.primary,
    },
    tapButtonRunning: {
        backgroundColor: COLORS.text, // Dark/Black for Stop
    },
    tapButtonText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
});
