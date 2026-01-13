import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
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
            <View style={styles.content}>
                <ThemedText variant="subtitle1" style={styles.name} numberOfLines={1}>
                    {room.name}
                </ThemedText>

                <View style={styles.metaRow}>
                    {room.description ? (
                        <ThemedText variant="caption" color={COLORS.textMuted} numberOfLines={1} style={styles.desc}>
                            {room.description}
                        </ThemedText>
                    ) : null}

                    <View style={styles.stats}>
                        <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
                        <ThemedText variant="caption" color={COLORS.textMuted}>
                            {participantCount || 0}
                        </ThemedText>
                    </View>
                </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />

            {unsolvedCount > 0 && (
                <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>
                        {unsolvedCount > 99 ? '99+' : unsolvedCount}
                    </ThemedText>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardPressed: {
        backgroundColor: COLORS.surfaceVariant,
    },
    content: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: COLORS.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    desc: {
        flex: 1,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.error,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
});