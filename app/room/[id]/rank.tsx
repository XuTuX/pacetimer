import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ParticipantRow } from "../../../components/ui/ParticipantRow";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

interface ParticipantResult {
    userId: string;
    name: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
    durationMs: number;
    progressCount: number;
    lastUpdated?: string;
    isMe: boolean;
    records: RecordRow[];
}

function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export default function RankScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Latest Exam
            const { data: exams, error: exError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (exError) throw exError;

            const currentExam = exams && exams.length > 0 ? exams[0] : null;
            setExam(currentExam);

            if (!currentExam) {
                setLoading(false);
                return;
            }

            const currentExamId = currentExam.id;

            // 2. Room Members & Profiles
            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;
            const members = (mData as any[]) || [];

            // 3. All Attempts
            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId);
            if (aError) throw aError;
            const attempts = aData || [];

            // Combine
            const results: ParticipantResult[] = members.map(m => {
                const attempt = attempts.find(a => a.user_id === m.user_id);

                let status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' = 'NOT_STARTED';
                if (attempt) {
                    status = attempt.ended_at ? 'COMPLETED' : 'IN_PROGRESS';
                }

                return {
                    userId: m.user_id,
                    name: m.profile?.display_name || `사용자 ${(m.user_id || "").slice(0, 4)}`,
                    status,
                    durationMs: attempt?.duration_ms || 0,
                    progressCount: 0, // Not needed for rank view
                    lastUpdated: attempt?.started_at ? new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                    isMe: m.user_id === userId,
                    records: []
                };
            });

            setParticipants(results);

        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, userId, supabase]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const sortedByTime = useMemo(() => {
        return [...participants]
            .filter(p => p.status === 'COMPLETED')
            .sort((a, b) => a.durationMs - b.durationMs);
    }, [participants]);

    const myResult = useMemo(() => participants.find(p => p.isMe), [participants]);

    const myRank = useMemo(() => {
        if (!myResult || myResult.status !== 'COMPLETED') return null;
        const index = sortedByTime.findIndex(p => p.userId === myResult.userId);
        return index !== -1 ? index + 1 : null;
    }, [sortedByTime, myResult]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="리더보드" />
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>진행 중인 시험이 없습니다.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="리더보드" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerInfo}>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    <Text style={styles.examDate}>{new Date(exam.created_at).toLocaleDateString()}</Text>
                </View>

                {myResult?.status === 'COMPLETED' ? (
                    <View style={styles.myRankCard}>
                        <Text style={styles.myRankTitle}>내 순위</Text>
                        <Text style={styles.myRankValue}>#{myRank}</Text>
                        <Text style={styles.myRankSub}>
                            시간: {formatDuration(myResult.durationMs)}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}>
                            {myResult?.status === 'IN_PROGRESS'
                                ? "계속 진행하세요! 완료하면 순위가 표시됩니다."
                                : "레이스에 참여해 순위에 도전하세요!"}
                        </Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>상위 기록</Text>
                    {sortedByTime.map((p, index) => (
                        <ParticipantRow
                            key={p.userId}
                            name={p.name}
                            status="COMPLETED"
                            rank={index + 1}
                            progress={formatDuration(p.durationMs)}
                            isMe={p.isMe}
                        />
                    ))}
                    {sortedByTime.length === 0 && (
                        <Text style={styles.emptyText}>아직 완료자가 없어요. 첫 완료자가 되어보세요!</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerInfo: {
        padding: 20,
        alignItems: 'center',
    },
    examTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    examDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 12,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    myRankCard: {
        marginHorizontal: 20,
        padding: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        marginBottom: 24,
    },
    myRankTitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    myRankValue: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.primary,
        marginBottom: 4,
    },
    myRankSub: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    infoCard: {
        margin: 20,
        padding: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 20,
    },
});
