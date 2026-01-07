import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SproutVisual from '../../components/SproutVisual';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { stopwatch, subjects, addSubject } = useAppStore();
    const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);
    const [isAddingSubject, setIsAddingSubject] = React.useState(false);
    const [newSubjectName, setNewSubjectName] = React.useState('');

    // today's study time (formatted)
    // In a real app, we'd filter sessions by today. Here we use stopwatch.accumulatedMs as a proxy for today's session.
    const totalMs = stopwatch.accumulatedMs + (stopwatch.isRunning && stopwatch.startedAt ? Date.now() - stopwatch.startedAt : 0);
    const totalMinutes = Math.floor(totalMs / 60000);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
        return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "좋은 아침이에요! 🌱";
        if (hour >= 12 && hour < 18) return "활기찬 오후예요! ✨";
        if (hour >= 18 && hour < 22) return "차분한 저녁이에요! 🌙";
        return "늦은 밤까지 대단해요! ⭐";
    };

    const handleAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
            setIsAddingSubject(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>{getGreeting()}</Text>
                    <Text style={styles.headerTitle}>오늘의 기록</Text>
                </View>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => router.push('/timer')}
                >
                    <Ionicons name="settings-outline" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.mainCard}>
                    <View style={styles.sproutContainer}>
                        <View style={styles.timeInfo}>
                            <Text style={styles.studyLabel}>오늘의 성장 시간</Text>
                            <Text style={styles.studyTime}>{formatTime(totalMs)}</Text>
                        </View>
                        <SproutVisual totalMinutes={totalMinutes} />
                    </View>
                </View>

                <View style={styles.actionSection}>
                    <View style={styles.subjectContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>어떤 과목을 공부할까요?</Text>
                            {!isAddingSubject && (
                                <TouchableOpacity
                                    style={styles.addSmallButton}
                                    onPress={() => setIsAddingSubject(true)}
                                >
                                    <Ionicons name="add" size={16} color={COLORS.primary} />
                                    <Text style={styles.addSmallText}>추가</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.subjectListWrapper}>
                            <Animated.ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.subjectList}
                            >
                                {isAddingSubject && (
                                    <View style={styles.inputChip}>
                                        <TextInput
                                            style={styles.subjectInput}
                                            placeholder="과목명"
                                            value={newSubjectName}
                                            onChangeText={setNewSubjectName}
                                            autoFocus
                                            returnKeyType="done"
                                            onSubmitEditing={handleAddSubject}
                                            onBlur={() => {
                                                if (!newSubjectName.trim()) setIsAddingSubject(false);
                                            }}
                                        />
                                        <TouchableOpacity onPress={handleAddSubject} style={styles.inputCheck}>
                                            <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
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
                                        <View style={[
                                            styles.subjectIconCircle,
                                            selectedSubjectId === s.id && styles.selectedSubjectIconCircle
                                        ]}>
                                            <Ionicons
                                                name="book"
                                                size={14}
                                                color={selectedSubjectId === s.id ? COLORS.white : COLORS.primary}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.subjectChipText,
                                            selectedSubjectId === s.id && styles.selectedSubjectChipText
                                        ]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {!isAddingSubject && subjects.filter(s => !s.isArchived).length === 0 && (
                                    <TouchableOpacity
                                        style={styles.addSubjectCard}
                                        onPress={() => setIsAddingSubject(true)}
                                    >
                                        <Ionicons name="add" size={20} color={COLORS.primary} />
                                        <Text style={styles.addSubjectText}>과목 추가하기</Text>
                                    </TouchableOpacity>
                                )}
                            </Animated.ScrollView>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.startButton,
                            !selectedSubjectId && !stopwatch.isRunning && styles.startButtonDisabled
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (stopwatch.isRunning) {
                                router.push('/timer');
                            } else if (selectedSubjectId) {
                                router.push({
                                    pathname: '/timer',
                                    params: { subjectId: selectedSubjectId }
                                });
                            } else {
                                router.push('/timer');
                            }
                        }}
                    >
                        <View style={styles.startButtonInner}>
                            <Ionicons
                                name={stopwatch.isRunning ? "pause" : "play"}
                                size={24}
                                color={COLORS.white}
                            />
                            <Text style={styles.startButtonText}>
                                {stopwatch.isRunning ? "집중 이어나가기" : (selectedSubjectId ? "집중 시작하기" : "과목을 선택해주세요")}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.footerModeButton}
                    onPress={() => router.push('/modes/mock-exam/setup')}
                >
                    <Ionicons name="stopwatch-outline" size={18} color={COLORS.textMuted} />
                    <Text style={styles.footerText}>모의고사 모드</Text>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 20,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        gap: 24,
    },
    mainCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    sproutContainer: {
        alignItems: 'center',
        width: '100%',
    },
    timeInfo: {
        alignItems: 'center',
        marginBottom: 20,
    },
    studyTime: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    studyLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
    actionSection: {
        gap: 20,
    },
    subjectContainer: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    addSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    addSmallText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    subjectListWrapper: {
        marginHorizontal: -24,
    },
    subjectList: {
        paddingHorizontal: 24,
        gap: 10,
        paddingBottom: 4,
    },
    subjectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    selectedSubjectChip: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    subjectIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedSubjectIconCircle: {
        backgroundColor: COLORS.primary,
    },
    subjectChipText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    selectedSubjectChipText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    startButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    startButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 12,
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.white,
    },
    startButtonDisabled: {
        opacity: 0.5,
        backgroundColor: COLORS.textMuted,
        shadowOpacity: 0,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
        gap: 16,
    },
    footerModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerDivider: {
        width: 1,
        height: 12,
        backgroundColor: COLORS.border,
    },
    footerText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    addSubjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: COLORS.primaryLight + '40',
    },
    addSubjectText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },
    inputChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        minWidth: 120,
    },
    subjectInput: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        padding: 0,
        flex: 1,
    },
    inputCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
