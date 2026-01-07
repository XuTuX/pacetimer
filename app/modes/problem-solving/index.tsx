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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>과목 선택</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.eyebrow}>연습하고 싶은 과목을 선택하세요.</Text>

                {activeSubjects.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyText}>등록된 과목이 없습니다.</Text>
                        <TouchableOpacity onPress={() => router.push('/subjects/manage')} style={styles.linkButton}>
                            <Text style={styles.linkText}>과목 관리 페이지로 이동</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={activeSubjects}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.card} onPress={() => handleSelect(item.id, item.name)}>
                                <View style={styles.cardMain}>
                                    <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                                    <Text style={styles.subjectName}>{item.name}</Text>
                                </View>
                                <View style={styles.chevron}>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    eyebrow: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 12,
        marginBottom: 24,
        marginLeft: 4,
    },
    listContent: {
        paddingBottom: 40,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    subjectName: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
    },
    chevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
        gap: 16,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 14,
    }
});
