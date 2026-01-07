import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

// Mock Participants
const MOCK_PARTICIPANTS = [
    { id: '1', name: 'StudyKing', status: 'solving', q: 12 },
    { id: '2', name: 'Pass2025', status: 'solving', q: 11 },
    { id: '3', name: 'SlowSteady', status: 'idle', q: 10 },
    { id: '4', name: 'Me', status: 'ready', q: 0 },
];

export default function RoomDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const id = params.id as string;
    const title = params.title as string || 'Room Detail';

    const handleStartExam = () => {
        // Navigate to Mock Exam Setup or Run?
        // "Room" usually implies a specific exam is set.
        // Let's assume room has a preset.
        // We'll direct to Mock Exam Run directly with "Room Mode".
        // For now, just go to Setup to simplify.
        router.push('/modes/mock-exam/setup');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Participants ({MOCK_PARTICIPANTS.length})</Text>
                <FlatList
                    data={MOCK_PARTICIPANTS}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.userRow}>
                            <View style={styles.rowLeft}>
                                <View style={styles.avatar}><Text>{item.name[0]}</Text></View>
                                <Text style={styles.userName}>{item.name}</Text>
                            </View>
                            <View style={styles.rowRight}>
                                {item.status === 'solving' ? (
                                    <Text style={styles.statusSolving}>Q{item.q}</Text>
                                ) : (
                                    <Text style={styles.statusIdle}>{item.status.toUpperCase()}</Text>
                                )}
                            </View>
                        </View>
                    )}
                />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.startButton} onPress={handleStartExam}>
                    <Text style={styles.startButtonText}>Start Together</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

type Styles = {
    container: ViewStyle;
    header: ViewStyle;
    backButton: ViewStyle;
    title: TextStyle;
    content: ViewStyle;
    sectionTitle: TextStyle;
    userRow: ViewStyle;
    rowLeft: ViewStyle;
    avatar: ViewStyle;
    userName: TextStyle;
    rowRight: ViewStyle;
    statusSolving: TextStyle;
    statusIdle: TextStyle;
    footer: ViewStyle;
    startButton: ViewStyle;
    startButtonText: TextStyle;
};

const styles = StyleSheet.create<Styles>({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.gray,
        marginBottom: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    rowRight: {},
    statusSolving: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    statusIdle: {
        color: COLORS.gray,
        fontSize: 12,
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    startButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
