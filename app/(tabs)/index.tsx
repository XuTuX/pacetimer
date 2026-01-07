import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SproutVisual from '../../components/SproutVisual';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { stopwatch, subjects } = useAppStore();
    const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);

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
                    <Text style={styles.eyebrow}>Today&apos;s Growth</Text>
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

                <View style={styles.subjectSelectionSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>어떤 과목을 공부할까요?</Text>
                        {subjects.filter(s => !s.isArchived).length > 0 && (
                            <TouchableOpacity onPress={() => router.push('/timer')}>
                                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.subjectList}>
                        {subjects.filter(s => !s.isArchived).map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[
                                    styles.subjectChip,
                                    selectedSubjectId === s.id && styles.selectedSubjectChip
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedSubjectId(s.id === selectedSubjectId ? null : s.id);
                                }}
                            >
                                <Ionicons
                                    name="book-outline"
                                    size={16}
                                    color={selectedSubjectId === s.id ? COLORS.primary : COLORS.textMuted}
                                />
                                <Text style={[
                                    styles.subjectChipText,
                                    selectedSubjectId === s.id && styles.selectedSubjectChipText
                                ]}>
                                    {s.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {subjects.filter(s => !s.isArchived).length === 0 && (
                            <TouchableOpacity
                                style={styles.addSubjectCard}
                                onPress={() => router.push('/timer')}
                            >
                                <Ionicons name="add" size={20} color={COLORS.primary} />
                                <Text style={styles.addSubjectText}>과목 추가하기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.startButton,
                        !selectedSubjectId && !stopwatch.isRunning && styles.startButtonDisabled
                    ]}
                    onPress={() => {
                        if (stopwatch.isRunning) {
                            router.push('/timer');
                        } else if (selectedSubjectId) {
                            router.push({
                                pathname: '/timer',
                                params: { subjectId: selectedSubjectId }
                            });
                        } else {
                            // If no subject selected and NOT running, 
                            // we could either go to timer/select subject or show a message.
                            // The user wants to select on home screen.
                            router.push('/timer');
                        }
                    }}
                >
                    <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={28} color={COLORS.white} />
                    <Text style={styles.startButtonText}>
                        {stopwatch.isRunning ? "집중 이어나가기" : (selectedSubjectId ? "이 과목 집중 시작" : "공부 시작하기")}
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
    subjectSelectionSection: {
        width: '100%',
        marginBottom: -10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    subjectList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    subjectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedSubjectChip: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.1,
    },
    subjectChipText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    selectedSubjectChipText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    startButtonDisabled: {
        opacity: 0.6,
        backgroundColor: COLORS.textMuted,
        shadowOpacity: 0,
    },
    addSubjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: COLORS.primaryLight + '20',
    },
    addSubjectText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },
});
