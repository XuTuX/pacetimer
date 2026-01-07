import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopwatchDisplay from '../../components/StopwatchDisplay';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { stopwatch, startStopwatch, pauseStopwatch } = useAppStore();

    const toggleTimer = () => {
        if (stopwatch.isRunning) {
            pauseStopwatch();
        } else {
            startStopwatch();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pacetime</Text>
            </View>

            {/* Main Stopwatch Section */}
            <View style={styles.timerSection}>
                <Text style={styles.timerLabel}>Total Study Time</Text>
                <StopwatchDisplay textStyle={styles.timerText} />

                <TouchableOpacity
                    style={[styles.timerButton, stopwatch.isRunning ? styles.stopButton : styles.startButton]}
                    onPress={toggleTimer}
                >
                    <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={32} color="#FFF" />
                    <Text style={styles.buttonText}>{stopwatch.isRunning ? "Pause" : "Start"}</Text>
                </TouchableOpacity>
            </View>

            {/* Modes Grid */}
            <View style={styles.modesContainer}>
                <TouchableOpacity style={styles.modeCard} onPress={() => router.push('/modes/problem-solving')}>
                    <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="pencil" size={32} color="#2196F3" />
                    </View>
                    <Text style={styles.modeTitle}>Problem Solving</Text>
                    <Text style={styles.modeDesc}>Lap timer for questions</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modeCard} onPress={() => router.push('/modes/mock-exam/setup')}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="timer" size={32} color="#F44336" />
                    </View>
                    <Text style={styles.modeTitle}>Mock Exam</Text>
                    <Text style={styles.modeDesc}>Full exam simulation</Text>
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
        padding: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.primary,
    },
    timerSection: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    timerLabel: {
        fontSize: 16,
        color: COLORS.gray,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timerText: {
        fontSize: 64,
        fontWeight: '900',
        color: COLORS.text,
        includeFontPadding: false,
    },
    timerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 32,
        gap: 8,
    },
    startButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    stopButton: {
        backgroundColor: COLORS.gray,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
    modesContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
    },
    modeCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    modeDesc: {
        fontSize: 13,
        color: COLORS.gray,
        textAlign: 'center',
    },
});
