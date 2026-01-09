import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../../../../lib/db-types";
import { useSupabase } from "../../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../../lib/supabaseError";
import { COLORS } from "../../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type ExamAttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

function formatDuration(seconds: number) {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ExamDetailScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [allAttempts, setAllAttempts] = useState<ExamAttemptRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'leaderboard' | 'comparison'>('leaderboard');

    const loadData = useCallback(async () => {
        if (!roomId || !currentExamId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Exam Info
            const { data: eData, error: eError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("id", currentExamId)
                .single();
            if (eError) throw eError;
            setExam(eData);

            // 2. All Attempts
            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId)
                .order("duration_ms", { ascending: true });

            if (aError) throw aError;
            const attempts = aData ?? [];
            setAllAttempts(attempts);

        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, currentExamId, userId, supabase]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleStart = () => {
        router.push(`/(tabs)/rooms/${roomId}/exam/${currentExamId}/run`);
    };

    if (loading && !exam) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </Pressable>
                    <Text style={styles.title} numberOfLines={1}>
                        {exam?.title}
                    </Text>
                </View>

                {/* Exam Info Card */}
                <View style={styles.card}>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.metaLabel}>{exam?.total_questions}</Text>
                            <Text style={styles.metaSub}>Questions</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.metaLabel}>{exam?.total_minutes}</Text>
                            <Text style={styles.metaSub}>Minutes</Text>
                        </View>
                    </View>

                    <Pressable style={styles.startBtn} onPress={handleStart}>
                        <Ionicons name="play" size={20} color={COLORS.white} />
                        <Text style={styles.startBtnText}>Start New Attempt</Text>
                    </Pressable>
                </View>

                {/* View Switcher Container */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Room Analysis</Text>
                    <View style={styles.tabContainer}>
                        <Pressable
                            style={[styles.tab, viewMode === 'leaderboard' && styles.tabActive]}
                            onPress={() => setViewMode('leaderboard')}
                        >
                            <Text style={[styles.tabText, viewMode === 'leaderboard' && styles.tabTextActive]}>Ranking</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.tab, viewMode === 'comparison' && styles.tabActive]}
                            onPress={() => setViewMode('comparison')}
                        >
                            <Text style={[styles.tabText, viewMode === 'comparison' && styles.tabTextActive]}>Detailed</Text>
                        </Pressable>
                    </View>
                </View>

                {viewMode === 'leaderboard' ? (
                    <View style={styles.list}>
                        {allAttempts.length === 0 ? (
                            <Text style={styles.emptyText}>No attempts yet.</Text>
                        ) : (
                            allAttempts.map((attempt, index) => {
                                const isCompleted = Boolean(attempt.ended_at);
                                return (
                                    <View key={attempt.id} style={styles.attemptCard}>
                                        <View style={styles.attemptTop}>
                                            <View style={styles.rankBadge}>
                                                <Text style={styles.rankText}>#{index + 1}</Text>
                                            </View>
                                            <Text style={styles.userIdText}>
                                                {attempt.user_id === userId ? 'You (Me)' : `User ${attempt.user_id.slice(0, 6)}`}
                                            </Text>
                                            <View style={[styles.badge, isCompleted ? styles.badgeSuccess : styles.badgeWarn]}>
                                                <Text style={[styles.badgeText, isCompleted ? styles.textSuccess : styles.textWarn]}>
                                                    {isCompleted ? "Completed" : "In Progress"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.attemptStats}>
                                            <Text style={styles.statText}>
                                                Duration: <Text style={styles.bold}>{formatDuration(Math.floor(attempt.duration_ms / 1000))}</Text>
                                            </Text>
                                            <Text style={styles.statText}>
                                                Finished: <Text style={styles.bold}>{isCompleted ? "Yes" : "No"}</Text>
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : (
                    <View style={styles.comparisonPlaceholder}>
                        <Ionicons name="information-circle-outline" size={24} color={COLORS.textMuted} />
                        <Text style={styles.comparisonText}>
                            Detailed question breakdown isn't available with the current database schema.
                        </Text>
                    </View>
                )}

                {error && <Text style={styles.errorText}>{error}</Text>}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        flex: 1,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        gap: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-evenly',
    },
    metaItem: {
        alignItems: 'center',
        gap: 4,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    metaLabel: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    metaSub: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    startBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        justifyContent: 'center',
    },
    startBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
    sectionHeader: {
        marginTop: 10,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 14,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.text,
    },
    list: {
        gap: 12,
    },
    attemptCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    attemptTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.primary,
    },
    userIdText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeSuccess: {
        backgroundColor: '#d1fae5',
    },
    badgeWarn: {
        backgroundColor: '#fef3c7',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    textSuccess: { color: '#059669' },
    textWarn: { color: '#d97706' },
    attemptStats: {
        flexDirection: 'row',
        gap: 20,
        paddingLeft: 38,
    },
    statText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    bold: {
        fontWeight: '800',
        color: COLORS.text,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 20,
    },
    comparisonPlaceholder: {
        marginTop: 4,
        padding: 16,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        gap: 8,
    },
    comparisonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
