import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

export function HostBadge() {
    return (
        <View style={styles.badge}>
            <Ionicons name="star" size={10} color={COLORS.primary} />
            <Text style={styles.text}>호스트</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight, // Ensure this exists or use a hex with opacity
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    text: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.primary,
    },
});
