import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

export default function ShopScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Shop</Text>
            <Text style={styles.subtext}>Coming Soon.</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtext: {
        color: COLORS.gray,
        marginTop: 8,
    }
});
