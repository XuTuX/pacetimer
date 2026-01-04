import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
    bg: "#F8FAFC",
    text: "#0F172A",
};

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
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: COLORS.bg,
    },
    brand: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
});
