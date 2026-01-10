import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { CompareRow } from "../../../../../../components/ui/CompareRow";
import { ParticipantRow } from "../../../../../../components/ui/ParticipantRow";
import { PrimaryButton } from "../../../../../../components/ui/PrimaryButton";
import { ProgressBar } from "../../../../../../components/ui/ProgressBar";
import { ScreenHeader } from "../../../../../../components/ui/ScreenHeader";
import { SegmentedTabs } from "../../../../../../components/ui/SegmentedTabs";
import { StatCard } from "../../../../../../components/ui/StatCard";
import type { Database } from "../../../../../../lib/db-types";
import { useSupabase } from "../../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../../lib/supabaseError";
import { COLORS } from "../../../../../../lib/theme";

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

export default function ExamDetailScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const [participants, setParticipants] = useState<ParticipantResult[]>([]);

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

            // 4. All Records
            const attemptIds = attempts.map(a => a.id);
            let rData: RecordRow[] = [];
            if (attemptIds.length > 0) {
                const { data: recData, error: rError } = await supabase
                    .from("attempt_records")
                    .select("*")
                    .in("attempt_id", attemptIds);
                if (!rError) rData = recData || [];
            }

            // Combine
            const results: ParticipantResult[] = members.map(m => {
                const attempt = attempts.find(a => a.user_id === m.user_id);
                const records = rData.filter(r => r.attempt_id === attempt?.id);

                let status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' = 'NOT_STARTED';
                if (attempt) {
                    status = attempt.ended_at ? 'COMPLETED' : 'IN_PROGRESS';
                }

                return {
                    userId: m.user_id,
                    name: m.profile?.display_name || `사용자 ${(m.user_id || "").slice(0, 4)}`,
                    status,
                    durationMs: attempt?.duration_ms || 0,
                    progressCount: records.length,
                    lastUpdated: attempt?.started_at ? new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                    isMe: m.user_id === userId,
                    records
                };
            });

            setParticipants(results);

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

    const sortedByTime = useMemo(() => {
        return [...participants]
            .filter(p => p.status === 'COMPLETED')
            .sort((a, b) => a.durationMs - b.durationMs);
    }, [participants]);

    const sortedByProgress = useMemo(() => {
        return [...participants]
            .sort((a, b) => {
                // Sort by status priority first: COMPLETED > IN_PROGRESS > NOT_STARTED
                const score = (status: string) => status === 'COMPLETED' ? 3 : status === 'IN_PROGRESS' ? 2 : 1;
                if (score(a.status) !== score(b.status)) return score(b.status) - score(a.status);
                // Then sort by progress count
                return b.progressCount - a.progressCount;
            });
    }, [participants]);

    const myResult = useMemo(() => participants.find(p => p.isMe), [participants]);

    const myRank = useMemo(() => {
        if (!myResult || myResult.status !== 'COMPLETED') return null;
        const index = sortedByTime.findIndex(p => p.userId === myResult.userId);
        return index !== -1 ? index + 1 : null;
    }, [sortedByTime, myResult]);

    const roomAvgPerQuestion = useMemo(() => {
        const questionAvg: Record<number, number[]> = {};
        participants.forEach(p => {
            if (p.status !== 'COMPLETED') return;
            if (p.records) {
                p.records.forEach(r => {
                    if (!questionAvg[r.question_no]) questionAvg[r.question_no] = [];
                    questionAvg[r.question_no].push(r.duration_ms);
                });
            }
        });

        const avgs: Record<number, number> = {};
        Object.keys(questionAvg).forEach(qNo => {
            const times = questionAvg[Number(qNo)];
            if (times.length > 0) {
                avgs[Number(qNo)] = times.reduce((a, b) => a + b, 0) / times.length;
            }
        });
        return avgs;
    }, [participants]);

    if (loading && !exam) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const totalQuestions = exam?.total_questions || 1;

    return (
        <View style={styles.container}>
            <ScreenHeader title={exam?.title || "시험 결과"} />

            <SegmentedTabs
                tabs={['라이브 레이스', '리더보드', '페이스 분석']}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Tab 0: Live Race */}
                {activeTab === 0 && (
                    <View style={styles.tabContent}>
                        <View style={styles.statRow}>
                            <StatCard
                                label="진행 중"
                                value={participants.filter(p => p.status === 'IN_PROGRESS').length}
                                color={COLORS.warning}
                            />
                            <StatCard
                                label="완료"
                                value={participants.filter(p => p.status === 'COMPLETED').length}
                                color={COLORS.primary}
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>레이스 현황</Text>
                            {sortedByProgress.map(p => {
                                const progressPct = Math.min(p.progressCount / totalQuestions, 1);
                                return (
                                    <ParticipantRow
                                        key={p.userId}
                                        name={p.name}
                                        status={p.status}
                                        isMe={p.isMe}
                                        customRightElement={
                                            <View style={{ width: 100, alignItems: 'flex-end', gap: 4 }}>
                                                <ProgressBar progress={progressPct} color={p.status === 'COMPLETED' ? COLORS.primary : COLORS.warning} />
                                                <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' }}>
                                                    {Math.round(progressPct * 100)}%
                                                </Text>
                                            </View>
                                        }
                                    />
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Tab 1: Leaderboard */}
                {activeTab === 1 && (
                    <View style={styles.tabContent}>
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
                                <Text style={styles.infoText}>완주하면 순위가 표시됩니다!</Text>
                            </View>
                        )}

                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>완료자</Text>
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
                    </View>
                )}

                {/* Tab 2: Pace Analysis */}
                {activeTab === 2 && (
                    <View style={styles.tabContent}>
                        {myResult?.status === 'COMPLETED' && myResult.records.length > 0 ? (
                            <>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoText}>초록 막대는 평균보다 빠름, 빨강은 느림을 의미합니다.</Text>
                                </View>
                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>문항별 분석</Text>
                                    {myResult.records.map(r => {
                                        const avg = roomAvgPerQuestion[r.question_no] || r.duration_ms;
                                        const diff = r.duration_ms - avg;
                                        const diffPercent = (diff / avg) * 100;
                                        return (
                                            <CompareRow
                                                key={r.id}
                                                label={`Q${r.question_no}`}
                                                myValue={formatDuration(r.duration_ms)}
                                                avgValue={formatDuration(avg)}
                                                isFaster={r.duration_ms < avg}
                                                diffPercent={diffPercent}
                                            />
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoText}>시험 완료 후 페이스 분석을 볼 수 있어요.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {myResult && myResult.status !== 'COMPLETED' && (
                <View style={styles.bottomBar}>
                    <PrimaryButton
                        label="레이스 참여"
                        onPress={() => router.push({ pathname: "/(tabs)/rooms/[id]/exam/[examId]/run", params: { id: roomId, examId: currentExamId } })}
                        style={{ width: '100%' }}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    tabContent: {
        marginTop: 16,
    },
    statRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
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
    bottomBar: {
        padding: 20,
        paddingBottom: 32,
        backgroundColor: COLORS.bg,
    },
});
