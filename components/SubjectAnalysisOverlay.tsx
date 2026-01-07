import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

interface SubjectAnalysisData {
    name: string;
    color: string;
    totalMs: number;
    count: number;
    records: QuestionRecord[];
}

interface Props {
    data: SubjectAnalysisData;
    onBack: () => void;
}

export function SubjectAnalysisOverlay({ data, onBack }: Props) {
    const formatTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (h > 0) return `${h}시간 ${m}분`;
        return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{data.name} 분석</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>총 학습 시간</Text>
                            <Text style={styles.summaryValue}>{formatTime(data.totalMs)}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>풀이 문항</Text>
                            <Text style={styles.summaryValue}>{data.count}개</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>문항별 세부 기록</Text>
                        <View style={styles.listCard}>
                            {data.records.sort((a, b) => a.startedAt - b.startedAt).map((r, i) => (
                                <View key={r.id} style={[styles.qItem, i === 0 && { borderTopWidth: 0 }]}>
                                    <View style={styles.qTimeBox}>
                                        <Text style={styles.qStartTime}>
                                            {new Date(r.startedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </Text>
                                    </View>
                                    <View style={styles.qInfo}>
                                        <View style={styles.qHeader}>
                                            <Text style={styles.qLabel}>{r.questionNo}번</Text>
                                            <Text style={styles.qDuration}>{formatTime(r.durationMs)}</Text>
                                        </View>
                                        <View style={styles.qBarBg}>
                                            <View style={[styles.qBar, {
                                                width: `${Math.min(100, Math.max(5, (r.durationMs / data.totalMs) * 100))}%`,
                                                backgroundColor: data.color
                                            }]} />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
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
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    content: {
        padding: 24,
        gap: 24,
    },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
        paddingLeft: 4,
    },
    listCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    qItem: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'center',
    },
    qTimeBox: {
        width: 44,
    },
    qStartTime: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    qInfo: {
        flex: 1,
        gap: 8,
    },
    qHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    qLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
    },
    qDuration: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text,
    },
    qBarBg: {
        height: 6,
        backgroundColor: COLORS.bg,
        borderRadius: 3,
        overflow: 'hidden',
    },
    qBar: {
        height: '100%',
        borderRadius: 3,
    },
});
