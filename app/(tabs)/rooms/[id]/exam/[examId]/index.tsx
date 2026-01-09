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
    const [myAttempts, setMyAttempts] = useState<ExamAttemptRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

            // 2. My Attempts
            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId)
                .eq("user_id", userId ?? "")
                .order("created_at", { ascending: false });

            if (aError) throw aError;
            setMyAttempts(aData ?? []);

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

                {/* My History */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Attempts</Text>
                </View>

                {myAttempts.length === 0 ? (
                    <Text style={styles.emptyText}>You haven't attempted this exam yet.</Text>
                ) : (
                    <View style={styles.list}>
                        {myAttempts.map((attempt) => (
                            <View key={attempt.id} style={styles.attemptCard}>
                                <View style={styles.attemptTop}>
                                    <Text style={styles.date}>
                                        {new Date(attempt.started_at).toLocaleDateString()} {new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <View style={[styles.badge, attempt.is_completed ? styles.badgeSuccess : styles.badgeWarn]}>
                                        <Text style={[styles.badgeText, attempt.is_completed ? styles.textSuccess : styles.textWarn]}>
                                            {attempt.is_completed ? "Finished" : "In Progress"}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.attemptStats}>
                                    <Text style={styles.statText}>
                                        Solved: <Text style={styles.bold}>{attempt.total_solved}</Text>
                                    </Text>
                                    <Text style={styles.statText}>
                                        Time: <Text style={styles.bold}>{formatDuration(attempt.total_elapsed_seconds)}</Text>
                                    </Text>
                                </View>
                            </View>
                        ))}
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
        borderRadius: 20,
        padding: 24,
        gap: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
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
        fontWeight: '800',
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
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    startBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
    sectionHeader: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    list: {
        gap: 12,
    },
    attemptCard: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 16,
        gap: 12,
    },
    attemptTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeSuccess: {
        backgroundColor: '#d1fae5',
    },
    badgeWarn: {
        backgroundColor: '#fef3c7',
    },
    textSuccess: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '700',
    },
    textWarn: {
        color: '#d97706',
        fontSize: 11,
        fontWeight: '700',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    attemptStats: {
        flexDirection: 'row',
        gap: 16,
    },
    statText: {
        fontSize: 14,
        color: COLORS.text,
    },
    bold: {
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: '600',
    },
});
