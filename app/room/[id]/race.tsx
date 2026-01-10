import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExamCard } from "../../../components/rooms/ExamCard";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

type RoomMemberWithProfile = RoomMemberRow & { profile?: ProfileRow | null };

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

export default function RaceScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    const loadData = useCallback(async (options?: { examId?: string | null; skipLoading?: boolean }) => {
        if (!roomId) {
            setLoading(false);
            return;
        }
        if (!options?.skipLoading) {
            setLoading(true);
        }
        setError(null);
        try {
            // 1. Fetch Room Info
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .single();

            if (roomError) throw roomError;
            setRoom(roomData);

            // 2. Fetch Exams
            const { data: examData, error: exError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });

            if (exError) throw exError;

            const fetchedExams = examData ?? [];
            setExams(fetchedExams);

            const latestExam = fetchedExams[0] ?? null;
            const explicitExamId = options?.examId ?? null;
            let currentExamId = explicitExamId ?? selectedExamId;
            const selectedExists = currentExamId && fetchedExams.some(exam => exam.id === currentExamId);
            const shouldFallbackToLatest = !selectedExists;
            const shouldForceLatestForOwner =
                !explicitExamId &&
                !!latestExam &&
                latestExam.created_by === userId &&
                latestExam.id !== currentExamId;

            if (shouldFallbackToLatest || shouldForceLatestForOwner) {
                currentExamId = latestExam?.id ?? null;
            }

            if (currentExamId !== selectedExamId) {
                setSelectedExamId(currentExamId ?? null);
            }

            const currentExam = fetchedExams.find(exam => exam.id === currentExamId) ?? null;
            setExam(currentExam);

            // 3. Room Members & Profiles
            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;
            const members = (mData as RoomMemberWithProfile[]) || [];
            if (userId) {
                const currentMember = members.find(m => m.user_id === userId);
                setCurrentUserRole(currentMember?.role ?? null);
            } else {
                setCurrentUserRole(null);
            }

            if (!currentExam) {
                setParticipants([]);
                return;
            }

            const currentExamIdValue = currentExam.id;

            // 4. All Attempts
            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamIdValue);
            if (aError) throw aError;
            const attempts = aData || [];

            // 5. All Records
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
    }, [roomId, selectedExamId, supabase, userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const isOwner = room?.owner_id === userId;
    const canCreateExam = useMemo(() => {
        if (isOwner) return true;
        if (!currentUserRole) return false;
        const normalizedRole = currentUserRole.toLowerCase();
        return normalizedRole === "host" || normalizedRole === "owner";
    }, [currentUserRole, isOwner]);

    const handleCreateExam = () => {
        if (!roomId) return;
        router.push(`/room/${roomId}/add-exam`);
    };

    const handleSelectExam = (examId: string) => {
        setSelectedExamId(examId);
        loadData({ examId, skipLoading: true });
    };

    const sortedByTime = useMemo(() => {
        return [...participants]
            .filter(p => p.status === 'COMPLETED')
            .sort((a, b) => a.durationMs - b.durationMs);
    }, [participants]);

    const sortedByProgress = useMemo(() => {
        return [...participants]
            .sort((a, b) => {
                const score = (status: string) => status === 'COMPLETED' ? 3 : status === 'IN_PROGRESS' ? 2 : 1;
                if (score(a.status) !== score(b.status)) return score(b.status) - score(a.status);
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

    // ... (imports remain)

    // ... (hooks remain until render)

    if (loading && exams.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="모의고사"
                showBack={false}
                rightElement={
                    <View style={styles.headerActions}>
                        {canCreateExam && (
                            <Pressable onPress={handleCreateExam} style={styles.headerBtn}>
                                <Ionicons name="add" size={22} color={COLORS.text} />
                            </Pressable>
                        )}
                        <Pressable onPress={() => router.replace('/(tabs)/rooms')} style={styles.headerBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </Pressable>
                    </View>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {exam ? (
                    <View style={styles.examHero}>
                        <View style={styles.examBadge}>
                            <Text style={styles.examBadgeText}>LIVE CHALLENGE</Text>
                        </View>
                        <Text style={styles.examTitleLarge}>{exam.title}</Text>
                        <View style={styles.examMetaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="time" size={16} color={COLORS.primary} />
                                <Text style={styles.metaText}>{exam.total_minutes}분</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="document-text" size={16} color={COLORS.primary} />
                                <Text style={styles.metaText}>{exam.total_questions}문제</Text>
                            </View>
                        </View>

                        {myResult?.status !== 'COMPLETED' ? (
                            <Pressable
                                onPress={() => router.push(`/(tabs)/rooms/${roomId}/exam/${exam.id}/run`)}
                                style={({ pressed }) => [
                                    styles.mainStartBtn,
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                            >
                                <Text style={styles.mainStartBtnText}>
                                    {myResult?.status === 'IN_PROGRESS' ? '시험 이어하기' : '지금 시작하기'}
                                </Text>
                                <Ionicons name="rocket" size={20} color={COLORS.white} />
                            </Pressable>
                        ) : (
                            <View style={styles.completedStatus}>
                                <View style={styles.completedIconBox}>
                                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.completedTitle}>시험을 완료했습니다!</Text>
                                    <Text style={styles.completedSub}>결과는 분석 탭에서 확인할 수 있습니다.</Text>
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyText}>진행 중인 시험이 없습니다.</Text>
                        <Text style={styles.emptySub}>호스트가 모의고사를 생성할 때까지{"\n"}잠시만 기다려 주세요.</Text>
                        {canCreateExam && (
                            <PrimaryButton
                                label="모의고사 만들기"
                                onPress={handleCreateExam}
                                style={styles.emptyPrimaryBtn}
                            />
                        )}
                    </View>
                )}

                <View style={styles.listSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>모의고사 목록</Text>
                        {canCreateExam && (
                            <Pressable onPress={handleCreateExam} style={styles.inlineCreateBtn}>
                                <Ionicons name="add" size={14} color={COLORS.primary} />
                                <Text style={styles.inlineCreateText}>새로 만들기</Text>
                            </Pressable>
                        )}
                    </View>

                    {exams.length === 0 ? (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyListText}>아직 생성된 모의고사가 없습니다.</Text>
                        </View>
                    ) : (
                        <View style={styles.examList}>
                            {exams.map((item) => (
                                <ExamCard
                                    key={item.id}
                                    exam={item}
                                    onPress={() => handleSelectExam(item.id)}
                                    attemptStatus={
                                        item.id === exam?.id
                                            ? (myResult?.status === 'COMPLETED'
                                                ? 'completed'
                                                : myResult?.status === 'IN_PROGRESS'
                                                    ? 'in_progress'
                                                    : 'none')
                                            : 'none'
                                    }
                                    isActive={item.id === exam?.id}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {exam && (
                    <View style={styles.progressSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>실시간 진행 현황</Text>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        </View>

                        <View style={styles.participantsList}>
                            {participants.map(p => (
                                <View key={p.userId} style={styles.participantCard}>
                                    <View style={styles.pInfo}>
                                        <View style={[styles.pAvatar, p.status === 'IN_PROGRESS' && styles.pActiveAvatar]}>
                                            <Ionicons
                                                name={p.status === 'COMPLETED' ? "checkmark-circle" : "person"}
                                                size={20}
                                                color={p.status === 'COMPLETED' ? COLORS.primary : COLORS.textMuted}
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.pName}>{p.name}{p.isMe ? " (나)" : ""}</Text>
                                            <Text style={styles.pStatusText}>
                                                {p.status === 'COMPLETED' ? '완료' : p.status === 'IN_PROGRESS' ? '진행 중' : '대기 중'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.pProgress}>
                                        {p.status === 'IN_PROGRESS' ? (
                                            <View style={styles.progressFillContainer}>
                                                <View style={styles.progressBarBg}>
                                                    <View
                                                        style={[
                                                            styles.progressBarFill,
                                                            { width: `${(p.progressCount / exam.total_questions) * 100}%` }
                                                        ]}
                                                    />
                                                </View>
                                                <Text style={styles.progressPercentText}>
                                                    {p.progressCount}/{exam.total_questions}
                                                </Text>
                                            </View>
                                        ) : p.status === 'COMPLETED' ? (
                                            <View style={styles.timeBadge}>
                                                <Text style={styles.timeBadgeText}>{formatDuration(p.durationMs)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.waitingText}>준비 중</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyPrimaryBtn: {
        marginTop: 20,
        alignSelf: 'stretch',
    },
    examHero: {
        padding: 24,
        margin: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 4,
    },
    examBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    examBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    examTitleLarge: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    examMetaRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    mainStartBtn: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    mainStartBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
    listSection: {
        paddingHorizontal: 20,
        marginTop: 12,
    },
    examList: {
        gap: 12,
    },
    inlineCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: COLORS.primaryLight,
    },
    inlineCreateText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
    },
    emptyList: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyListText: {
        color: COLORS.textMuted,
        fontWeight: '600',
        fontSize: 13,
    },
    completedStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 20,
    },
    completedIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.primary,
    },
    completedSub: {
        fontSize: 12,
        color: COLORS.primary,
        opacity: 0.8,
        fontWeight: '500',
    },
    progressSection: {
        paddingHorizontal: 20,
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FF3B30',
    },
    participantsList: {
        gap: 12,
    },
    participantCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    pAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pActiveAvatar: {
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    pName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    pStatusText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    pProgress: {
        alignItems: 'flex-end',
        width: 120,
    },
    progressFillContainer: {
        width: '100%',
        gap: 6,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    progressPercentText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
        textAlign: 'right',
    },
    timeBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    timeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
    },
    waitingText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
});
