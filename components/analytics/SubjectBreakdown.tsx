import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SubjectTotal } from '../../lib/analytics';
import { COLORS } from '../../lib/theme';
import { formatDurationMs } from '../../lib/studyDate';

type Props = {
    title?: string;
    subjects: SubjectTotal[];
    maxVisible?: number;
    onPressViewAll?: () => void;
    viewAllLabel?: string;
};

export default function SubjectBreakdown({ title = '과목별 (7일)', subjects, maxVisible, onPressViewAll, viewAllLabel = '전체 보기' }: Props) {
    const max = useMemo(() => Math.max(1, ...subjects.map((s) => s.durationMs)), [subjects]);
    const visible = useMemo(() => {
        if (!maxVisible) return subjects;
        return subjects.slice(0, maxVisible);
    }, [subjects, maxVisible]);
    const showViewAll = !!onPressViewAll && !!maxVisible && subjects.length > visible.length;

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.pill}>
                    <Ionicons name="book-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.pillText}>
                        {maxVisible && subjects.length > visible.length ? `${visible.length}/${subjects.length}개` : `${subjects.length}개`}
                    </Text>
                </View>
            </View>

            {subjects.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="sparkles-outline" size={28} color={COLORS.border} />
                    <Text style={styles.emptyText}>이번 주 데이터가 충분하지 않습니다.</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {visible.map((s) => {
                        const ratio = s.durationMs / max;
                        return (
                            <View key={s.subjectId} style={styles.row}>
                                <View style={styles.rowTop}>
                                    <Text style={styles.name} numberOfLines={1}>{s.subjectName}</Text>
                                    <Text style={styles.meta}>{formatDurationMs(s.durationMs)} · {s.questionCount}문항</Text>
                                </View>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${Math.max(4, Math.round(ratio * 100))}%` }]} />
                                </View>
                            </View>
                        );
                    })}
                    {showViewAll && (
                        <TouchableOpacity style={styles.viewAllRow} onPress={onPressViewAll} activeOpacity={0.85}>
                            <Text style={styles.viewAllText}>{viewAllLabel}</Text>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 14,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.primaryLight },
    pillText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },

    empty: { paddingVertical: 18, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

    list: { gap: 14 },
    row: { gap: 8 },
    rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    name: { flex: 1, fontSize: 14, fontWeight: '900', color: COLORS.text },
    meta: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    barBg: { height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4, opacity: 0.9 },
    viewAllRow: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceVariant,
    },
    viewAllText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted },
});
