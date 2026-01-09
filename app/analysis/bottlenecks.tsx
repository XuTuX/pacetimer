import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottleneckList from '../../components/analytics/BottleneckList';
import { buildAnalyticsSnapshot } from '../../lib/analytics';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';

export default function BottleneckAnalysisScreen() {
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
                        <Text style={styles.headerTitle}>병목 분석</Text>
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
                    <BottleneckList
                        averageMs={snapshot.bottlenecksWeek.averageMs}
                        items={snapshot.bottlenecksWeek.items}
                        nowMs={nowMs}
                    />

                    <View style={styles.noteCard}>
                        <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                        <Text style={styles.noteText}>
                            평균보다 오래 걸린 문항만 표시합니다. (모의고사 제외)
                        </Text>
                    </View>
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
    noteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    noteText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textMuted, lineHeight: 18 },
});

