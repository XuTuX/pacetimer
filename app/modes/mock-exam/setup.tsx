import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';

export default function MockExamSetupScreen() {
    const router = useRouter();
    const { subjects } = useAppStore();

    const activeSubjects = subjects.filter(s => !s.isArchived).sort((a, b) => a.order - b.order);

    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [timeLimit, setTimeLimit] = useState('90'); // minutes

    const toggleSubject = (id: string) => {
        if (selectedSubjectIds.includes(id)) {
            setSelectedSubjectIds(prev => prev.filter(sid => sid !== id));
        } else {
            setSelectedSubjectIds(prev => [...prev, id]);
        }
    };

    const adjustTime = (delta: number) => {
        const current = parseInt(timeLimit) || 0;
        const next = Math.max(0, current + delta);
        setTimeLimit(next.toString());
    };

    const handleStart = () => {
        const limit = parseInt(timeLimit);
        if (!limit || limit <= 0) {
            Alert.alert('확인', '진행 시간을 입력해주세요.');
            return;
        }
        if (selectedSubjectIds.length === 0) {
            Alert.alert('확인', '최소 하나의 과목을 선택해주세요.');
            return;
        }

        router.push({
            pathname: '/modes/mock-exam/run',
            params: {
                subjectIds: selectedSubjectIds.join(','),
                limitMin: limit.toString()
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>모의고사 설정</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>시간 제한</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            value={timeLimit}
                            onChangeText={setTimeLimit}
                            keyboardType="number-pad"
                        />
                        <Text style={styles.unit}>분</Text>
                    </View>
                    <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustTime(-10)}>
                            <Ionicons name="remove" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustTime(10)}>
                            <Ionicons name="add" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.label}>과목 선택</Text>
                <View style={styles.subjectList}>
                    {activeSubjects.length === 0 ? (
                        <Text style={styles.emptyText}>과목이 없습니다. 마이페이지에서 과목을 추가해주세요.</Text>
                    ) : (
                        activeSubjects.map(sub => (
                            <TouchableOpacity
                                key={sub.id}
                                style={[styles.subjectItem, selectedSubjectIds.includes(sub.id) && styles.subjectItemSelected]}
                                onPress={() => toggleSubject(sub.id)}
                            >
                                <View style={styles.subjectRow}>
                                    <View style={[styles.dot, { backgroundColor: selectedSubjectIds.includes(sub.id) ? COLORS.primary : COLORS.border }]} />
                                    <Text style={[styles.subjectName, selectedSubjectIds.includes(sub.id) && { color: COLORS.primary }]}>{sub.name}</Text>
                                </View>
                                {selectedSubjectIds.includes(sub.id) && (
                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                    <Text style={styles.startButtonText}>연습 시작하기</Text>
                </TouchableOpacity>
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
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 32,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    input: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
    },
    unit: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    stepper: {
        flexDirection: 'row',
        gap: 12,
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subjectList: {
        gap: 12,
    },
    subjectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    subjectItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    subjectRow: {
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
        fontWeight: '700',
        color: COLORS.text,
    },
    emptyText: {
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 20,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    startButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 24,
        alignItems: 'center',
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
});
