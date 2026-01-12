import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    isHost: boolean;
    onPress: () => void;
    participantCount?: number;
    hasNewExam?: boolean;
}

export function RoomCard({ room, isHost, onPress, participantCount, hasNewExam }: RoomCardProps) {
    return (
        <Card
            variant="elevated"
            padding="none" // Custom padding in container
            style={styles.card}
            onTouchEnd={onPress}
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.container,
                    pressed && { opacity: 0.8 }
                ]}
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="library" size={20} color={COLORS.primary} />
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <ThemedText variant="subtitle1" style={styles.name} numberOfLines={1}>
                            {room.name}
                        </ThemedText>
                        {hasNewExam && (
                            <View style={styles.newBadge}>
                                <ThemedText style={styles.newBadgeText}>NEW EXAM</ThemedText>
                            </View>
                        )}
                    </View>

                    <View style={styles.subContent}>
                        {room.description ? (
                            <ThemedText variant="body2" color={COLORS.textMuted} numberOfLines={1} style={styles.description}>
                                {room.description}
                            </ThemedText>
                        ) : (
                            <View style={styles.spacer} />
                        )}
                    </View>

                    <View style={styles.metaRow}>
                        {participantCount !== undefined && (
                            <View style={styles.metaItem}>
                                <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
                                <ThemedText style={styles.metaText}>{participantCount}</ThemedText>
                            </View>
                        )}
                        {isHost && (
                            <View style={styles.hostBadge}>
                                <Ionicons name="star" size={10} color="#EAA300" />
                                <ThemedText style={styles.hostText}>HOST</ThemedText>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 }, // Reduced shadow
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    container: {
        flexDirection: 'row',
        padding: 16, // Reduced padding
        gap: 12,
        alignItems: 'center',
    },
    iconCircle: {
        width: 40, // Smaller icon circle
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    name: {
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    subContent: {
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
    },
    spacer: {
        height: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    newBadge: {
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FF3B30',
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFF8E6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    hostText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#EAA300',
    },
});
