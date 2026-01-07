import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

export default function MyPageScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Page</Text>
                <Text style={styles.userId}>ID: {userId}</Text>
            </View>

            <View style={styles.menu}>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/subjects/manage')}>
                    <Ionicons name="book-outline" size={24} color={COLORS.text} />
                    <Text style={styles.menuText}>Subject Management</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    <Text style={[styles.menuText, { color: COLORS.error }]}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        color: COLORS.text,
        fontSize: 28,
        fontWeight: 'bold',
    },
    userId: {
        color: COLORS.gray,
        marginTop: 8,
    },
    menu: {
        padding: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 12,
    },
    menuText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    }
});
