import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SproutVisual from '../../components/SproutVisual';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { stopwatch } = useAppStore();

    // today's study time (formatted)
    // In a real app, we'd filter sessions by today. Here we use stopwatch.accumulatedMs as a proxy for today's session.
    const totalMs = stopwatch.accumulatedMs + (stopwatch.isRunning && stopwatch.startedAt ? Date.now() - stopwatch.startedAt : 0);
    const totalMinutes = Math.floor(totalMs / 60000);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}시간 ${minutes}분`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>Today's Growth</Text>
                    <Text style={styles.headerTitle}>오늘의 공부 기록</Text>
                </View>
                <View>
                    <Ionicons name="flash" size={24} color={COLORS.primary} />
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.sproutContainer}>
                    <SproutVisual totalMinutes={totalMinutes} />
                    <Text style={styles.studyTime}>{formatTime(totalMs)}</Text>
                    <Text style={styles.studyLabel}>오늘 이만큼 성장했어요!</Text>
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => router.push('/timer')}
                >
                    <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={28} color={COLORS.white} />
                    <Text style={styles.startButtonText}>
                        {stopwatch.isRunning ? "집중 이어나가기" : "공부 시작하기"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>다른 모드로 공부하고 싶으신가요?</Text>
                <TouchableOpacity onPress={() => router.push('/modes/mock-exam/setup')}>
                    <Text style={styles.footerLink}>모의고사 보기</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 80,
    },
    sproutContainer: {
        alignItems: 'center',
        gap: 12,
    },
    studyTime: {
        fontSize: 42,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    studyLabel: {
        fontSize: 16,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        width: '100%',
        paddingVertical: 18,
        borderRadius: 32,
        gap: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.white,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 24,
        gap: 8,
    },
    footerText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    footerLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});

