import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
    room: Room;
    onPress: () => void;
    participantCount?: number;
    unsolvedCount?: number; // 안 푼 시험 개수 (0이면 안 보임)
}

export function RoomCard({ room, onPress, participantCount, unsolvedCount = 0 }: RoomCardProps) {
    return (
        <Card variant="elevated" padding="none" style={styles.card}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.container,
                    pressed && { backgroundColor: 'rgba(0,0,0,0.02)' }
                ]}
            >
                <View style={styles.content}>
                    {/* 제목 */}
                    <ThemedText variant="subtitle1" style={styles.name} numberOfLines={1}>
                        {room.name}
                    </ThemedText>

                    {/* 부제 및 참여 인원 통합 라인 */}
                    <View style={styles.metaRow}>
                        <ThemedText variant="body2" color={COLORS.textMuted} numberOfLines={1} style={styles.description}>
                            {room.description || "참여 코드로 입장 가능한 방"}
                        </ThemedText>

                        <View style={styles.separator} />

                        <View style={styles.countInfo}>
                            <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
                            <ThemedText style={styles.countText}>{participantCount || 0}</ThemedText>
                        </View>
                    </View>
                </View>

                {/* 우측 이동 아이콘 */}
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={styles.chevron} />

                {/* 우측 상단 알림 배지 */}
                {unsolvedCount > 0 && (
                    <View style={styles.badge}>
                        <ThemedText style={styles.badgeText}>
                            {unsolvedCount > 99 ? '99+' : unsolvedCount}
                        </ThemedText>
                    </View>
                )}
            </Pressable>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        marginBottom: 12,
        overflow: 'visible', // 배지가 카드 밖으로 살짝 나가게 할 경우를 위해 visible
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    container: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    content: {
        flex: 1,
    },
    name: {
        fontWeight: '700',
        fontSize: 17,
        color: COLORS.text,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    description: {
        fontSize: 13,
        maxWidth: '70%', // 설명이 너무 길어지지 않게 조절
    },
    separator: {
        width: 1,
        height: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginHorizontal: 8,
    },
    countInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    countText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 8,
        opacity: 0.3,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FF3B30',
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