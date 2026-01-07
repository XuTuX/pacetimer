import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';

export default function SubjectSelectionScreen() {
    const router = useRouter();
    const { subjects } = useAppStore();
    const activeSubjects = subjects
        .filter((s) => !s.isArchived)
        .sort((a, b) => a.order - b.order);

    const handleSelect = (subjectId: string, subjectName: string) => {
        router.push({
            pathname: '/modes/problem-solving/run',
            params: { subjectId, subjectName }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Select Subject</Text>
            </View>

            <Text style={styles.hint}>Choose a subject to practice.</Text>

            {activeSubjects.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No subjects found.</Text>
                    <TouchableOpacity onPress={() => router.push('/subjects/manage')} style={styles.linkButton}>
                        <Text style={styles.linkText}>Go to Manage Subjects</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={activeSubjects}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item.id, item.name)}>
                            <Text style={styles.subjectName}>{item.name}</Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    )}
                />
            )}
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
    },
    hint: {
        padding: 16,
        color: COLORS.gray,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    subjectName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.gray,
        fontSize: 16,
        marginBottom: 16,
    },
    linkButton: {
        padding: 12,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: '600',
    }
});
