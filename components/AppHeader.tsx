import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/theme';

export default function AppHeader() {
    return (
        <View style={styles.header}>
            <Text style={styles.brand}>PaceTime</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: COLORS.bg,
    },
    brand: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
});

