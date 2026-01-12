import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { Card } from './Card';
import { RankBadge } from './RankBadge';
import { StatusBadge, StatusType } from './StatusBadge';
import { Typography } from './Typography';

interface ParticipantRowProps {
    name: string;
    avatar?: string;
    status: StatusType;
    progress?: string;
    lastUpdated?: string;
    isMe?: boolean;
    rank?: number;
    customRightElement?: React.ReactNode;
}

export function ParticipantRow({ name, status, progress, lastUpdated, isMe, rank, customRightElement }: ParticipantRowProps) {
    return (
        <Card
            variant={isMe ? "flat" : "outlined"}
            padding="md"
            radius="xl"
            style={[
                styles.container,
                isMe && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }
            ]}
        >
            <View style={styles.leftSection}>
                {rank ? (
                    <View style={styles.rankContainer}>
                        <RankBadge rank={rank} size={28} />
                    </View>
                ) : (
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Typography.Subtitle2 bold>{name.charAt(0).toUpperCase()}</Typography.Subtitle2>
                        </View>
                        {isMe && <View style={styles.meIndicator} />}
                    </View>
                )}

                <View style={styles.textContainer}>
                    <Typography.Body2 bold numberOfLines={1}>
                        {name} {isMe && <Typography.Caption bold color={COLORS.primary}>(나)</Typography.Caption>}
                    </Typography.Body2>
                    {lastUpdated && (
                        <Typography.Caption color={COLORS.textMuted} style={{ marginTop: 2 }}>
                            {lastUpdated}
                        </Typography.Caption>
                    )}
                </View>
            </View>

            <View style={styles.rightContent}>
                {customRightElement || (
                    <>
                        <StatusBadge status={status} />
                        {progress && (
                            <Typography.Caption bold style={styles.progressText}>
                                {progress}
                            </Typography.Caption>
                        )}
                    </>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        justifyContent: 'space-between',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.md,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: SPACING.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    meIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    textContainer: {
        flex: 1,
    },
    rightContent: {
        alignItems: 'flex-end',
        gap: 4,
    },
    progressText: {
        fontVariant: ['tabular-nums'],
    },
});
