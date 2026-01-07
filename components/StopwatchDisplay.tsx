import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';

interface Props {
    style?: ViewStyle;
    textStyle?: TextStyle;
    showSeconds?: boolean;
}

export default function StopwatchDisplay({ style, textStyle, showSeconds = true }: Props) {
    const { stopwatch } = useAppStore();
    const [elapsed, setElapsed] = useState(stopwatch.accumulatedMs);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (stopwatch.isRunning && stopwatch.startedAt) {
            interval = setInterval(() => {
                const currentSession = Date.now() - stopwatch.startedAt!;
                setElapsed(stopwatch.accumulatedMs + currentSession);
            }, 100); // 100ms update for smooth feel, though we display seconds usually
        } else {
            setElapsed(stopwatch.accumulatedMs);
        }

        return () => clearInterval(interval);
    }, [stopwatch.isRunning, stopwatch.startedAt, stopwatch.accumulatedMs]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');

        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    return (
        <View style={style}>
            <Text style={[styles.text, textStyle]}>{formatTime(elapsed)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    text: {
        fontVariant: ['tabular-nums'],
        color: COLORS.text,
    },
});
