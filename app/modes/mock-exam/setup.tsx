import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';

export default function MockExamSetupScreen() {
    const router = useRouter();
    const { subjects, activeSubjectId } = useAppStore();

    const selectedSubject = subjects.find(s => s.id === activeSubjectId);

    // Default to the active subject if none selected (though home screen ensures this now)
    const [timeLimit, setTimeLimit] = useState('90');
    const [questionCount, setQuestionCount] = useState('20');

    // Subject selection removed as it's handled on the home screen

    // 시간 조절 (최소 1분)
    const adjustTime = (delta: number) => {
        setTimeLimit(prev => {
            const next = Math.max(1, (parseInt(prev) || 0) + delta);
            return next.toString();
        });
    };

    // 문제 수 조절 (최소 10문항 제한)
    const adjustQuestions = (delta: number) => {
        setQuestionCount(prev => {
            const next = Math.max(10, (parseInt(prev) || 0) + delta);
            return next.toString();
        });
    };

    const handleStart = () => {
        const limit = parseInt(timeLimit);
        const qCount = parseInt(questionCount);

        if (!activeSubjectId) return Alert.alert('확인', '과목이 선택되지 않았습니다.');
        if (!limit || limit <= 0) return Alert.alert('확인', '진행 시간을 입력해주세요.');
        if (!qCount || qCount < 10) return Alert.alert('확인', '문제 수는 최소 10개 이상이어야 합니다.');

        router.push({
            pathname: '/modes/mock-exam/run',
            params: {
                subjectIds: activeSubjectId,
                limitMin: limit.toString(),
                totalQuestions: qCount.toString()
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>모의고사 설정</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* 선택된 과목 표시 */}
                <View style={styles.selectedSubjectCard}>
                    <Text style={styles.label}>선택된 과목</Text>
                    <View style={styles.subjectInfo}>
                        <Ionicons name="book" size={20} color={COLORS.primary} />
                        <Text style={styles.selectedSubjectName}>{selectedSubject?.name || '선택된 과목 없음'}</Text>
                    </View>
                </View>

                {/* 2. 시간 설정 */}
                <Text style={[styles.label, { marginTop: 32 }]}>제한 시간</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <TextInput style={styles.input} value={timeLimit} onChangeText={setTimeLimit} keyboardType="number-pad" />
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

                {/* 3. 문제 수 설정 (최소 10) */}
                <Text style={styles.label}>총 문제 수 (최소 10)</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            value={questionCount}
                            onChangeText={(val) => setQuestionCount(val)}
                            keyboardType="number-pad"
                        />
                        <Text style={styles.unit}>문항</Text>
                    </View>
                    <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuestions(-5)}>
                            <Ionicons name="remove" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuestions(5)}>
                            <Ionicons name="add" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
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
        minWidth: 40,
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
    selectedSubjectCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },
    subjectInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    selectedSubjectName: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
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
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: '800',
    },
});