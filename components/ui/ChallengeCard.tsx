import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';
import { PrimaryButton } from './PrimaryButton';

interface ChallengeCardProps {
    title: string;
    description?: string;
    questionCount: number;
    timeMinutes: number;
    participantCount: number;
    onStart: () => void;
    buttonLabel?: string;
}

export function ChallengeCard({
    title,
    description,
    questionCount,
    timeMinutes,
    participantCount,
    onStart,
    buttonLabel = "챌린지 시작"
}: ChallengeCardProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="trophy" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.liveBadge}>라이브 이벤트</Text>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.statText}>{questionCount}문항</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.statText}>{timeMinutes}분</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Ionicons name="people-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.statText}>{participantCount}명 참여</Text>
                </View>
            </View>

            {description && (
                <Text style={styles.description} numberOfLines={2}>{description}</Text>
            )}

            <PrimaryButton
                label={buttonLabel}
                onPress={onStart}
                style={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        // Premium shadow
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    liveBadge: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceVariant,
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    stat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: COLORS.border,
    },
    description: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 16,
        lineHeight: 18,
    },
    button: {
        width: '100%',
        height: 52,
    },
});
