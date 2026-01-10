import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';
import { RankBadge } from './RankBadge';
import { StatusBadge, StatusType } from './StatusBadge';

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
        <View style={[styles.container, isMe && styles.meContainer]}>
            <View style={styles.leftSection}>
                {rank ? (
                    <View style={styles.rankContainer}>
                        <RankBadge rank={rank} size={28} />
                    </View>
                ) : (
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                        {isMe && <View style={styles.meIndicator} />}
                    </View>
                )}

                <View style={styles.textContainer}>
                    <Text style={styles.name} numberOfLines={1}>
                        {name} {isMe && <Text style={styles.meLabel}>(Me)</Text>}
                    </Text>
                    {lastUpdated && <Text style={styles.subtitle}>{lastUpdated}</Text>}
                </View>
            </View>

            <View style={styles.rightContent}>
                {customRightElement || (
                    <>
                        <StatusBadge status={status} />
                        {progress && <Text style={styles.progressText}>{progress}</Text>}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'space-between',
    },
    meContainer: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: 12,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    meIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    meLabel: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    rightContent: {
        alignItems: 'flex-end',
        gap: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
});
