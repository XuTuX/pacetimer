import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../lib/theme';
import { ThemedText } from '../ui/ThemedText';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    onPress: () => void;
    participantCount?: number;
    unsolvedCount?: number;
}

export function RoomCard({ room, onPress, participantCount, unsolvedCount = 0 }: RoomCardProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed
            ]}
        >
            {/* Accent Bar */}
            <LinearGradient
                colors={COLORS.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.accentBar}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <ThemedText variant="subtitle1" style={styles.name} numberOfLines={1}>
                        {room.name}
                    </ThemedText>
                    {unsolvedCount > 0 && (
                        <View style={styles.badge}>
                            <ThemedText style={styles.badgeText}>
                                {unsolvedCount > 99 ? '99+' : unsolvedCount}
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={styles.metaRow}>
                    {room.description ? (
                        <ThemedText variant="caption" color={COLORS.textMuted} numberOfLines={1} style={styles.desc}>
                            {room.description}
                        </ThemedText>
                    ) : (
                        <View style={styles.desc} />
                    )}

                    <View style={styles.stats}>
                        {/* Overlapping avatars */}
                        <View style={styles.avatarStack}>
                            {[0, 1, 2].slice(0, Math.min(participantCount || 0, 3)).map((i) => (
                                <View key={i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                                    <Ionicons name="person" size={10} color={COLORS.textMuted} />
                                </View>
                            ))}
                        </View>
                        <ThemedText variant="caption" color={COLORS.textMuted} style={styles.countText}>
                            {participantCount || 0}명
                        </ThemedText>
                    </View>
                </View>
            </View>

            <View style={styles.chevronWrapper}>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.95,
    },
    accentBar: {
        width: 4,
        borderTopLeftRadius: RADIUS.lg,
        borderBottomLeftRadius: RADIUS.lg,
    },
    content: {
        flex: 1,
        paddingVertical: SPACING.md + 2,
        paddingHorizontal: SPACING.md,
        gap: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    name: {
        flex: 1,
        ...TYPOGRAPHY.subtitle2,
        color: COLORS.text,
    },
    badge: {
        backgroundColor: COLORS.error,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    desc: {
        flex: 1,
        ...TYPOGRAPHY.caption,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1.5,
        borderColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        marginLeft: 2,
    },
    chevronWrapper: {
        justifyContent: 'center',
        paddingRight: SPACING.md,
        paddingLeft: SPACING.xs,
    },
});