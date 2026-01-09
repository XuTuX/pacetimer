import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SubjectBreakdown from '../../components/analytics/SubjectBreakdown';
import { buildAnalyticsSnapshot } from '../../lib/analytics';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function SubjectBreakdownScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { sessions, segments, questionRecords, subjects } = useAppStore();
    const [nowMs, setNowMs] = useState(Date.now());

    useFocusEffect(useCallback(() => {
        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []));

    const snapshot = useMemo(
        () => buildAnalyticsSnapshot({ sessions, segments, questionRecords, subjects, nowMs, dailyDays: 14 }),
        [sessions, segments, questionRecords, subjects, nowMs]
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>과목별 보기</Text>
                        <Text style={styles.headerSub}>최근 7일 · 문제풀이 기준</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 16,
                        paddingBottom: insets.bottom + 40,
                        gap: 18,
                    }}
                >
                    <SubjectBreakdown title="과목별 문제풀이 (7일)" subjects={snapshot.subjectsWeek} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    content: { flex: 1 },
});

