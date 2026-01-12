import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';
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
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="library" size={24} color={COLORS.primary} />
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <ThemedText variant="h3" style={styles.name} numberOfLines={1}>{room.name}</ThemedText>
                        {isHost && (
                            <View style={styles.hostIndicator}>
                                <Ionicons name="star" size={12} color="#EAA300" />
                                <ThemedText style={styles.hostText}>HOST</ThemedText>
                            </View>
                        )}
                    </View>

                    {room.description ? (
                        <ThemedText variant="body2" color={COLORS.textMuted} numberOfLines={1} style={styles.description}>
                            {room.description}
                        </ThemedText>
                    ) : null}

                    <View style={styles.footer}>
                        <ThemedText style={styles.idText}>ID: {room.id.slice(0, 6)}</ThemedText>
                    </View>
                </View>
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    container: {
        flexDirection: 'row',
        padding: 20,
        gap: 16,
        alignItems: 'center', // Changed to center vertically
    },
    iconContainer: {
        justifyContent: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    hostIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF8E6', // Very warm light yellow
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    hostText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#EAA300', // Gold/Orange
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    idText: {
        fontSize: 12,
        color: COLORS.textMuted,
        opacity: 0.7,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
        fontWeight: '500',
    },
});
