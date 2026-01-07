import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

// Mock Data
const MOCK_ROOMS = [
    { id: '1', title: '5급 공채 헌법 스터디', members: 4, max: 10, tags: ['헌법', '매일아침'] },
    { id: '2', title: 'PSAT 자료해석 집중', members: 12, max: 20, tags: ['자료해석', '고수만'] },
    { id: '3', title: '언어논리 기출 10년치', members: 2, max: 6, tags: ['언어', '기출'] },
];

export default function ExploreScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Explore Rooms</Text>
                <TouchableOpacity>
                    <Ionicons name="filter" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={MOCK_ROOMS}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/rooms/${item.id}?title=${encodeURIComponent(item.title)}`)}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.members}/{item.max}</Text>
                            </View>
                        </View>
                        <View style={styles.tags}>
                            {item.tags.map(tag => (
                                <View key={tag} style={styles.tag}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.joinText}>Touch to Join</Text>
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
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    badge: {
        backgroundColor: '#F0F9F4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    tags: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        color: COLORS.gray,
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 4,
    },
    joinText: {
        color: COLORS.gray,
        fontSize: 12,
    },
});
