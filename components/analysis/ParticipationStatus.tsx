import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { formatShortDuration } from "../../lib/insights";
import { COLORS, RADIUS, SPACING } from "../../lib/theme";
import { Typography } from "../ui/Typography";

export interface ParticipantInfo {
    userId: string;
    name: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
    durationMs?: number;
    isMe?: boolean;
}

interface ParticipationStatusProps {
    participants: ParticipantInfo[];
    avgDurationMs?: number;
    bestDurationMs?: number;
    bestUserName?: string;
    currentUserId?: string;
}

export function ParticipationStatus({
    participants,
    avgDurationMs,
    bestDurationMs,
    bestUserName,
    currentUserId,
}: ParticipationStatusProps) {
    const completedCount = participants.filter(p => p.status === 'COMPLETED').length;
    const totalCount = participants.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const myStatus = participants.find(p => p.userId === currentUserId || p.isMe);
    const iAmNotStarted = myStatus?.status === 'NOT_STARTED';

    return (
        <View style={styles.container}>
            {/* Progress Header */}
            <View style={styles.header}>
                <View style={styles.progressInfo}>
                    <Typography.Subtitle2 bold color={COLORS.text}>참여 현황</Typography.Subtitle2>
                    <View style={styles.countBadge}>
                        <Typography.Label bold color={COLORS.primary}>
                            {completedCount}/{totalCount}명
                        </Typography.Label>
                    </View>
                </View>
                <Typography.Caption color={COLORS.textMuted}>
                    {completionRate}% 완료
                </Typography.Caption>
            </View>

            {/* Progress Dots */}
            <View style={styles.dotsContainer}>
                {participants.map((p, idx) => (
                    <View
                        key={p.userId || idx}
                        style={[
                            styles.dot,
                            p.status === 'COMPLETED' && styles.dotCompleted,
                            p.status === 'IN_PROGRESS' && styles.dotProgress,
                            (p.userId === currentUserId || p.isMe) && styles.dotMe,
                        ]}
                    >
                        {p.status === 'COMPLETED' && (
                            <Ionicons name="checkmark" size={8} color={COLORS.white} />
                        )}
                        {p.status === 'IN_PROGRESS' && (
                            <Ionicons name="play" size={6} color={COLORS.white} />
                        )}
                    </View>
                ))}
            </View>

            {/* Participant Names (first 6) */}
            <View style={styles.nameList}>
                {participants.slice(0, 6).map((p, idx) => {
                    const isMe = p.userId === currentUserId || p.isMe;
                    const displayName = isMe ? '나' : p.name;

                    return (
                        <View key={p.userId || idx} style={styles.nameItem}>
                            <Typography.Caption
                                color={isMe ? COLORS.primary : COLORS.textMuted}
                                bold={isMe}
                            >
                                {displayName}
                            </Typography.Caption>
                            {p.status === 'COMPLETED' && (
                                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            )}
                            {p.status === 'IN_PROGRESS' && (
                                <Ionicons name="time" size={12} color="#F59E0B" />
                            )}
                        </View>
                    );
                })}
                {participants.length > 6 && (
                    <Typography.Caption color={COLORS.textMuted}>
                        외 {participants.length - 6}명
                    </Typography.Caption>
                )}
            </View>

            {/* Stats Summary */}
            {(avgDurationMs || bestDurationMs) && (
                <View style={styles.statsRow}>
                    {avgDurationMs && avgDurationMs > 0 && (
                        <View style={styles.statItem}>
                            <Ionicons name="analytics-outline" size={14} color={COLORS.textMuted} />
                            <Typography.Caption color={COLORS.textMuted}>
                                평균 {formatShortDuration(avgDurationMs)}
                            </Typography.Caption>
                        </View>
                    )}
                    {bestDurationMs && bestDurationMs > 0 && (
                        <View style={styles.statItem}>
                            <Ionicons name="flash-outline" size={14} color="#10B981" />
                            <Typography.Caption color="#10B981">
                                최고 {formatShortDuration(bestDurationMs)}
                                {bestUserName && ` (${bestUserName})`}
                            </Typography.Caption>
                        </View>
                    )}
                </View>
            )}

            {/* Call to action for non-started users */}
            {iAmNotStarted && (
                <View style={styles.ctaContainer}>
                    <Ionicons name="hand-left-outline" size={14} color={COLORS.primary} />
                    <Typography.Caption color={COLORS.primary} bold>
                        아직 안 풀었어요! 지금 도전해보세요
                    </Typography.Caption>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    progressInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    countBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    dotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: SPACING.md,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotCompleted: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    dotProgress: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    dotMe: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    nameList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    nameItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ctaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.md,
    },
});
