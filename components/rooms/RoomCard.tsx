import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    isHost: boolean;
    onPress: () => void;
}

export function RoomCard({ room, isHost, onPress }: RoomCardProps) {
    const shortId = room.id.slice(0, 6);

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
            ]}
        >
            <View style={styles.iconCircle}>
                <Ionicons name="apps-outline" size={22} color={COLORS.primary} />
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
                    {isHost && (
                        <View style={styles.hostBadge}>
                            <Ionicons name="star" size={10} color={COLORS.white} />
                            <Text style={styles.hostText}>호스트</Text>
                        </View>
                    )}
                </View>

                {room.description && (
                    <Text style={styles.description} numberOfLines={1}>
                        {room.description}
                    </Text>
                )}

                <View style={styles.meta}>
                    <View style={styles.idBadge}>
                        <Text style={styles.idLabel}>ID</Text>
                        <Text style={styles.idValue}>{shortId}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>스터디 룸</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 12,
        elevation: 2,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
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
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    hostText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.white,
    },
    description: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
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
        borderRadius: 8,
    },
    idLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
        opacity: 0.7,
    },
    idValue: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    chevron: {
        marginLeft: 4,
    }
});

