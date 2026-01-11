import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { Card } from '../ui/Card'; // Assuming ui components are in components/ui
import { ThemedText } from '../ui/ThemedText';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    isHost: boolean;
    onPress: () => void;
}

export function RoomCard({ room, isHost, onPress }: RoomCardProps) {
    const shortId = room.id.slice(0, 6);

    return (
        <Card
            variant="elevated"
            padding="lg"
            style={styles.card}
            onTouchEnd={onPress} // Card doesn't have onPress built-in yet, need to wrap or use Pressable. Let's wrap Card content or allow onPress in Card. 
        // Better to wrap Card in Pressable or use style.
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.container,
                    pressed && { opacity: 0.8 }
                ]}
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="apps-outline" size={22} color={COLORS.primary} />
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <ThemedText variant="h3" style={styles.name} numberOfLines={1}>{room.name}</ThemedText>
                        {isHost && (
                            <View style={styles.hostBadge}>
                                <Ionicons name="star" size={10} color={COLORS.white} />
                                <ThemedText variant="label" style={styles.hostText}>호스트</ThemedText>
                            </View>
                        )}
                    </View>

                    {room.description && (
                        <ThemedText variant="body2" color={COLORS.textMuted} numberOfLines={1} style={styles.description}>
                            {room.description}
                        </ThemedText>
                    )}

                    <View style={styles.meta}>
                        <View style={styles.idBadge}>
                            <ThemedText variant="label" color={COLORS.textMuted} style={styles.idLabel}>ID</ThemedText>
                            <ThemedText variant="caption" style={styles.idValue}>{shortId}</ThemedText>
                        </View>
                        <View style={styles.typeBadge}>
                            <ThemedText variant="label" color={COLORS.textMuted}>스터디 룸</ThemedText>
                        </View>
                    </View>
                </View>

                <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
                </View>
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 0, // Remove default padding since we use inner pressable
        borderRadius: RADIUS.lg,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md, // 16 or 18
        gap: SPACING.md,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        gap: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        flex: 1,
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    hostText: {
        color: COLORS.white,
    },
    description: {
        marginTop: -2,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    idBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.sm,
    },
    idLabel: {
        opacity: 0.7,
    },
    idValue: {
        fontWeight: '700',
        fontFamily: 'monospace', // Keep monospace if desired, or use default
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: RADIUS.sm,
    },
    chevron: {
        marginLeft: 4,
    }
});
