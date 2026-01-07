import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

// Mock Data
const MY_ROOMS = [
    { id: '10', title: 'My Private Study', members: 1, max: 1, tags: ['Solo'] },
    { id: '1', title: '5급 공채 헌법 스터디', members: 4, max: 10, tags: ['헌법', '매일아침'] },
];

export default function MyRoomsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Rooms</Text>
                <TouchableOpacity>
                    <Ionicons name="add" size={28} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={MY_ROOMS}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/rooms/${item.id}?title=${encodeURIComponent(item.title)}`)}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={[styles.badge, item.max === 1 && { backgroundColor: '#EEE' }]}>
                                <Text style={[styles.badgeText, item.max === 1 && { color: '#666' }]}>{item.max === 1 ? 'SOLO' : 'GROUP'}</Text>
                            </View>
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.joinText}>Enter Room</Text>
                            <Ionicons name="arrow-forward" size={16} color={COLORS.gray} />
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        color: COLORS.text,
        fontSize: 28,
        fontWeight: 'bold',
    },
    list: {
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    badge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#1976D2',
        fontWeight: '700',
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end', alignItems: 'center', gap: 4
    },
    joinText: { color: COLORS.gray, fontSize: 12 },
});
