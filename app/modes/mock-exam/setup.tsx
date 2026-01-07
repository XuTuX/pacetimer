import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
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

    const handleStart = () => {
        const limit = parseInt(timeLimit);
        if (!limit || limit <= 0) {
            Alert.alert('Error', 'Please enter a valid time limit.');
            return;
        }
        if (selectedSubjectIds.length === 0) {
            Alert.alert('Error', 'Please select at least one subject.');
            return;
        }

        // Pass data via params (simplest for now)
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
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Mock Exam Setup</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Time Limit */}
                <View style={styles.section}>
                    <Text style={styles.label}>Time Limit (Minutes)</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={timeLimit}
                            onChangeText={setTimeLimit}
                            keyboardType="number-pad"
                        />
                        <Text style={styles.unit}>min</Text>
                    </View>
                </View>

                {/* Subject Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>Select Subjects</Text>
                    <View style={styles.list}>
                        {activeSubjects.length === 0 ? (
                            <Text style={styles.emptyText}>No subjects available. Add them in My Page.</Text>
                        ) : (
                            activeSubjects.map(sub => (
                                <TouchableOpacity
                                    key={sub.id}
                                    style={[styles.subjectItem, selectedSubjectIds.includes(sub.id) && styles.subjectItemSelected]}
                                    onPress={() => toggleSubject(sub.id)}
                                >
                                    <Ionicons
                                        name={selectedSubjectIds.includes(sub.id) ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={selectedSubjectIds.includes(sub.id) ? COLORS.primary : COLORS.gray}
                                    />
                                    <Text style={[styles.subjectName, selectedSubjectIds.includes(sub.id) && { color: COLORS.primary }]}>{sub.name}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                    <Text style={styles.startButtonText}>Start Exam</Text>
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
    section: ViewStyle;
    label: TextStyle;
    inputContainer: ViewStyle;
    input: TextStyle;
    unit: TextStyle;
    list: ViewStyle;
    subjectItem: ViewStyle;
    subjectItemSelected: ViewStyle;
    subjectName: TextStyle;
    emptyText: TextStyle;
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
    },
    content: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        paddingVertical: 12,
    },
    unit: {
        fontSize: 16,
        color: COLORS.gray,
        marginLeft: 8,
    },
    list: {
        gap: 12,
    },
    subjectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    subjectItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9F4', // Light green
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
    },
    emptyText: {
        color: COLORS.gray,
        fontStyle: 'italic',
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
