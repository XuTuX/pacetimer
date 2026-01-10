import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';

type RoomExam = Database['public']['Tables']['room_exams']['Row'];

interface ExamCardProps {
    exam: RoomExam;
    onPress: () => void;
    attemptStatus?: 'none' | 'in_progress' | 'completed';
}

export function ExamCard({ exam, onPress, attemptStatus = 'none' }: ExamCardProps) {
    const isCompleted = attemptStatus === 'completed';
    const isInProgress = attemptStatus === 'in_progress';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                isCompleted && styles.containerCompleted
            ]}
        >
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
                        {exam.title}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.badge}>
                        <Ionicons name="document-text" size={12} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{exam.total_questions} Qs</Text>
                    </View>
                    <View style={styles.badge}>
                        <Ionicons name="time" size={12} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{exam.total_minutes}m</Text>
                    </View>
                </View>
            </View>

            <View style={styles.action}>
                {isCompleted ? (
                    <View style={styles.statusBadgeSuccess}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.statusTextSuccess}>Completed</Text>
                    </View>
                ) : isInProgress ? (
                    <View style={styles.statusBadgeWarning}>
                        <Ionicons name="play" size={16} color={COLORS.warning} />
                        <Text style={styles.statusTextWarning}>Live</Text>
                    </View>
                ) : (
                    <View style={styles.startButton}>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                    </View>
                )}
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
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    containerCompleted: {
        backgroundColor: COLORS.bg,
        borderColor: 'transparent',
    },
    content: {
        flex: 1,
        gap: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: -0.2,
    },
    titleCompleted: {
        color: COLORS.textMuted,
        textDecorationLine: 'none',
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    metaText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    action: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadgeSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8FAEF', // Very light success
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTextSuccess: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.success,
    },
    statusBadgeWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTextWarning: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.warning,
    },
    startButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    }
});
