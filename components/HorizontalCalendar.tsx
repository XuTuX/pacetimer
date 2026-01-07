import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../lib/theme';

interface Props {
    selectedDate: string;
    onDateSelect: (date: string) => void;
}

export function HorizontalCalendar({ selectedDate, onDateSelect }: Props) {
    const dates = useMemo(() => {
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 14; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
            const dayNum = d.getDate();
            result.push({ dateStr, dayName, dayNum });
        }
        return result;
    }, []);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {dates.map((item, i) => {
                    const isSelected = item.dateStr === selectedDate;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => onDateSelect(item.dateStr)}
                            style={[
                                styles.dateCard,
                                isSelected && styles.dateCardSelected
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayName, isSelected && styles.textSelected]}>
                                {item.dayName}
                            </Text>
                            <Text style={[styles.dayNum, isSelected && styles.textSelected]}>
                                {item.dayNum}
                            </Text>
                            {isSelected && <View style={styles.dot} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    dateCard: {
        width: 52,
        height: 74,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    dateCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dayName: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    dayNum: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
    },
    textSelected: {
        color: COLORS.white,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.white,
        position: 'absolute',
        bottom: 8,
    }
});
