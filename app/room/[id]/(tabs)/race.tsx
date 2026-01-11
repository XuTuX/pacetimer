import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Section } from "../../../../components/ui/Section";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { COLORS, SPACING } from "../../../../lib/theme";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

export default function RaceScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [myAttempts, setMyAttempts] = useState<AttemptRow[]>([]);

    const loadData = useCallback(async () => {
        if (!roomId || roomId === 'undefined') {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .single();
            if (roomError) throw roomError;
            setRoom(roomData);

            const { data: examData, error: exError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (exError) throw exError;
            const fetchedExams = examData ?? [];
            setExams(fetchedExams);

            if (userId) {
                // Fetch current user's attempts for all exams in this room
                const { data: aData } = await supabase
                    .from("attempts")
                    .select("*")
                    .eq("room_id", roomId)
                    .eq("user_id", userId);
                setMyAttempts(aData || []);

                const { data: mData } = await supabase
                    .from("room_members")
                    .select(`role`)
                    .eq("room_id", roomId)
                    .eq("user_id", userId)
                    .single();
                if (mData) setCurrentUserRole(mData.role);
            }

        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase, userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const getSubject = (title: string) => {
        const match = title.match(/^\[(.*?)\]/);
        return match ? match[1] : "기타";
    };

    const groupedExams = useMemo(() => {
        const groups: Record<string, RoomExamRow[]> = {};
        exams.forEach(exam => {
            const subject = getSubject(exam.title);
            if (!groups[subject]) groups[subject] = [];
            groups[subject].push(exam);
        });
        return groups;
    }, [exams]);

    const canCreateExam = true;

    if (loading && exams.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="모의고사"
                showBack={false}
                rightElement={
                    canCreateExam ? (
                        <Button
                            label=""
                            variant="ghost"
                            leftIcon="add"
                            onPress={() => {
                                if (roomId && roomId !== 'undefined') {
                                    router.push(`/room/${roomId}/add-exam`);
                                }
                            }}
                            style={{ width: 44, height: 44, borderRadius: 22 }}
                            fullWidth={false}
                        />
                    ) : undefined
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {exams.length === 0 ? (
                    <View style={styles.emptyExamsContainer}>
                        <Card variant="outline" padding="huge" style={styles.emptyExams}>
                            <Ionicons name="document-text-outline" size={48} color={COLORS.borderDark} />
                            <Typography.Body1 bold color={COLORS.textMuted} style={styles.emptyExamsText}>
                                등록된 시험이 없습니다.
                            </Typography.Body1>
                            {canCreateExam && (
                                <Button
                                    label="첫 시험 만들기"
                                    onPress={() => router.push(`/room/${roomId}/add-exam`)}
                                    style={styles.emptyCreateBtn}
                                    fullWidth={false}
                                />
                            )}
                        </Card>
                    </View>
                ) : (
                    (Object.entries(groupedExams) as [string, RoomExamRow[]][]).map(([subject, subjectExams]) => (
                        <Section
                            key={subject}
                            title={subject}
                            style={styles.subjectSection}
                            rightElement={
                                <View style={styles.subjectCounter}>
                                    <Typography.Label color={COLORS.textMuted}>{subjectExams.length}</Typography.Label>
                                </View>
                            }
                        >
                            <View style={styles.gridContainer}>
                                {subjectExams.map((item) => {
                                    const attempt = myAttempts.find(a => a.exam_id === item.id);
                                    const isCompleted = !!attempt?.ended_at;
                                    const isInProgress = !!attempt && !attempt.ended_at;

                                    return (
                                        <Card
                                            key={item.id}
                                            onPress={() => {
                                                if (isCompleted) {
                                                    router.push({
                                                        pathname: `/room/${roomId}/analysis` as any,
                                                        params: { initialExamId: item.id }
                                                    });
                                                } else {
                                                    router.push(`/room/${roomId}/exam/${item.id}/run`);
                                                }
                                            }}
                                            padding="md"
                                            radius="xl"
                                            variant={isCompleted ? "flat" : "elevated"}
                                            style={[
                                                styles.gridItem,
                                                isCompleted && styles.gridItemCompleted
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={isCompleted ? ['#F1F8E9', '#DCEDC8'] : (isInProgress ? ['#FFFDE7', '#FFF9C4'] : ['#F5F5F7', '#EEEEF0'])}
                                                style={styles.iconBoxGradient}
                                            >
                                                <Ionicons
                                                    name={isCompleted ? "checkmark-sharp" : (isInProgress ? "play-sharp" : "document-text-outline")}
                                                    size={22}
                                                    color={isCompleted ? COLORS.success : (isInProgress ? COLORS.warning : COLORS.textMuted)}
                                                />
                                            </LinearGradient>

                                            <View style={styles.itemContent}>
                                                <Typography.Body2 bold numberOfLines={2}>
                                                    {item.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                                                </Typography.Body2>
                                                <Typography.Label color={COLORS.textMuted}>{item.total_questions}문항</Typography.Label>
                                            </View>

                                            <View style={styles.itemFooter}>
                                                {isCompleted ? (
                                                    <View style={styles.analysisBadge}>
                                                        <Typography.Label color={COLORS.primary} bold>분석</Typography.Label>
                                                        <Ionicons name="chevron-forward" size={10} color={COLORS.primary} />
                                                    </View>
                                                ) : isInProgress ? (
                                                    <View style={styles.progressContainer}>
                                                        <View style={styles.progressBarBg}>
                                                            <View style={[styles.progressBarFill, { width: '45%' }]} />
                                                        </View>
                                                        <Typography.Label color={COLORS.warning} bold align="center">진행중</Typography.Label>
                                                    </View>
                                                ) : (
                                                    <View style={styles.startBadge}>
                                                        <Typography.Label color={COLORS.textMuted} bold>시작</Typography.Label>
                                                    </View>
                                                )}
                                            </View>
                                        </Card>
                                    );
                                })}
                            </View>
                        </Section>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: SPACING.massive,
    },
    subjectSection: {
        paddingTop: SPACING.md,
        marginVertical: 0,
    },
    subjectCounter: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
    },
    gridItem: {
        width: (width - SPACING.xl * 2 - SPACING.md * 2) / 3, // Precise 3-column split
        minHeight: 160,
    },
    gridItemCompleted: {
        backgroundColor: COLORS.bg,
    },
    iconBoxGradient: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    itemContent: {
        flex: 1,
        marginBottom: SPACING.md,
    },
    itemFooter: {
        marginTop: 'auto',
    },
    analysisBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingVertical: 6,
        borderRadius: 12,
    },
    progressContainer: {
        gap: 6,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.warning,
        borderRadius: 2,
    },
    startBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyExamsContainer: {
        padding: SPACING.xl,
        paddingTop: SPACING.massive,
    },
    emptyExams: {
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
    },
    emptyExamsText: {
        marginTop: SPACING.lg,
    },
    emptyCreateBtn: {
        marginTop: SPACING.xl,
    },
});
