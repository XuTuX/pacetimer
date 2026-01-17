import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS, RADIUS, SHADOWS } from '../../lib/theme';
import { useBreakpoint } from '../ui/Layout';
import { ThemedText } from '../ui/ThemedText';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    onPress: () => void;
    participantCount?: number;
    unsolvedCount?: number;
}

export function RoomCard({ room, onPress, participantCount, unsolvedCount = 0 }: RoomCardProps) {
    const { isAtLeastTablet } = useBreakpoint();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                isAtLeastTablet && styles.cardTablet,
                pressed && styles.cardPressed
            ]}
        >
            {/* Accent Bar */}
            <LinearGradient
                colors={COLORS.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.accentBar, isAtLeastTablet && styles.accentBarTablet]}
            />

            <View style={[styles.content, isAtLeastTablet && styles.contentTablet]}>
                <View style={styles.header}>
                    <ThemedText
                        variant={isAtLeastTablet ? "h3" : "subtitle1"}
                        style={[styles.name, isAtLeastTablet && styles.nameTablet]}
                        numberOfLines={1}
                    >
                        {room.name}
                    </ThemedText>
                    {unsolvedCount > 0 && (
                        <View style={[styles.badge, isAtLeastTablet && styles.badgeTablet]}>
                            <ThemedText style={[styles.badgeText, isAtLeastTablet && styles.badgeTextTablet]}>
                                {unsolvedCount > 99 ? '99+' : unsolvedCount}
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={[styles.metaRow, isAtLeastTablet && styles.metaRowTablet]}>
                    {room.description ? (
                        <ThemedText
                            variant={isAtLeastTablet ? "body1" : "caption"}
                            color={COLORS.textMuted}
                            numberOfLines={1}
                            style={styles.desc}
                        >
                            {room.description}
                        </ThemedText>
                    ) : (
                        <View style={styles.desc} />
                    )}

                    <View style={styles.stats}>
                        {/* Overlapping avatars */}
                        <View style={styles.avatarStack}>
                            {[0, 1, 2].slice(0, Math.min(participantCount || 0, 3)).map((i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.miniAvatar,
                                        isAtLeastTablet && styles.miniAvatarTablet,
                                        { marginLeft: i > 0 ? (isAtLeastTablet ? -12 : -8) : 0, zIndex: 3 - i }
                                    ]}
                                >
                                    <Ionicons
                                        name="person"
                                        size={isAtLeastTablet ? 14 : 10}
                                        color={COLORS.textMuted}
                                    />
                                </View>
                            ))}
                        </View>
                        <ThemedText
                            variant={isAtLeastTablet ? "body2" : "caption"}
                            color={COLORS.textMuted}
                            style={styles.countText}
                        >
                            {participantCount || 0}명
                        </ThemedText>
                    </View>
                </View>
            </View>

            <View style={[styles.chevronWrapper, isAtLeastTablet && styles.chevronWrapperTablet]}>
                <Ionicons
                    name="chevron-forward"
                    size={isAtLeastTablet ? 24 : 16}
                    color={COLORS.textMuted}
                />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    cardTablet: {
        borderRadius: RADIUS.xxl,
        ...SHADOWS.medium,
    },
    cardPressed: {
        transform: [{ scale: 0.985 }],
        opacity: 0.9,
    },
    accentBar: {
        width: 6,
    },
    accentBarTablet: {
        width: 8,
    },
    content: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 16,
        gap: 6,
    },
    contentTablet: {
        paddingVertical: 36,
        paddingHorizontal: 32,
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    nameTablet: {
        fontSize: 28,
    },
    badge: {
        backgroundColor: COLORS.primary,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        ...SHADOWS.small,
    },
    badgeTablet: {
        minWidth: 36,
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 10,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '800',
    },
    badgeTextTablet: {
        fontSize: 18,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 2,
    },
    metaRowTablet: {
        marginTop: 6,
        gap: 30,
    },
    desc: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 8,
        backgroundColor: COLORS.bg,
        borderWidth: 1.5,
        borderColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarTablet: {
        width: 40,
        height: 40,
        borderRadius: 16,
        borderWidth: 2.5,
    },
    countText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    chevronWrapper: {
        justifyContent: 'center',
        paddingRight: 16,
    },
    chevronWrapperTablet: {
        paddingRight: 32,
    },
});