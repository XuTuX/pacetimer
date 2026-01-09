import { StyleSheet, Text, View } from 'react-native';
import type { Database } from '../../lib/db-types';
import { COLORS } from '../../lib/theme';

type Participant = Database['public']['Tables']['room_members']['Row'];

interface ParticipantListProps {
    participants: Participant[];
    currentUserId?: string;
}

export function ParticipantList({ participants, currentUserId }: ParticipantListProps) {
    // Simple visualization: Just a count bubbles or avatars.
    // For now, let's just show a count and maybe some avatars later.
    // The user requirement said "Participant list" but didn't specify detailed UI.
    // I'll make a compact list of just names if I had profile data, but I only have IDs here unless joined.
    // Let's assume we might fetch profile data later. For now, simple count + IDs (shortened).

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Participants ({participants.length})</Text>
            <View style={styles.list}>
                {participants.map((p) => (
                    <View key={p.user_id} style={[styles.pill, p.user_id === currentUserId && styles.mePill]}>
                        <Text style={[styles.text, p.user_id === currentUserId && styles.meText]}>
                            {p.user_id === currentUserId ? 'Me' : p.user_id.slice(0, 4)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    header: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    list: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mePill: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    text: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    meText: {
        color: COLORS.white,
    },
});
