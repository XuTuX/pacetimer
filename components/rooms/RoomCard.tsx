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
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
                    {isHost && (
                        <View style={styles.hostBadge}>
                            <Text style={styles.hostText}>호스트</Text>
                        </View>
                    )}
                </View>

                {room.description ? (
                    <Text style={styles.description} numberOfLines={1}>
                        {room.description}
                    </Text>
                ) : (
                    <Text style={[styles.description, { fontStyle: 'italic', opacity: 0.5 }]}>
                        설명이 없습니다
                    </Text>
                )}

                <View style={styles.footer}>
                    <View style={styles.codeBadge}>
                        <Ionicons name="key-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.codeText}>코드 {shortId}</Text>
                    </View>
                    <View style={styles.memberSmall}>
                        <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.memberText}>스터디 룸</Text>
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
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 208, 148, 0.05)', // Extremely subtle primary tint
        gap: 16,
        // Premium subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        justifyContent: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        gap: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 6,
    },
    codeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        fontFamily: 'monospace',
    },
    memberSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    hostBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hostText: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.white,
    },
    chevron: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
