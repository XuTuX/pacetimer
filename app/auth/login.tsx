import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../lib/theme";
import { useWarmUpBrowser } from "../../lib/useWarmUpBrowser";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    useWarmUpBrowser();
    const router = useRouter();

    const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
    const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

    const onSelectAuth = async (strategy: "google" | "apple") => {
        try {
            const startFlow = strategy === "google" ? startGoogleFlow : startAppleFlow;
            const { createdSessionId, setActive } = await startFlow();

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                router.replace("/(tabs)");
            }
        } catch (err) {
            console.error("OAuth error", err);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="timer-outline" size={64} color={COLORS.primary} />
                <Text style={styles.title}>Pacetime</Text>
                <Text style={styles.subtitle}>Study with Pace, Win the Race</Text>
            </View>

            <View style={styles.buttonContainer}>
                {/* Apple Login */}
                <TouchableOpacity
                    style={[styles.button, styles.appleButton]}
                    onPress={() => onSelectAuth("apple")}
                >
                    <Ionicons name="logo-apple" size={24} color="#FFF" style={styles.buttonIcon} />
                    <Text style={[styles.buttonText, { color: "#FFF" }]}>Continue with Apple</Text>
                </TouchableOpacity>

                {/* Google Login */}
                <TouchableOpacity
                    style={[styles.button, styles.googleButton]}
                    onPress={() => onSelectAuth("google")}
                >
                    <Ionicons name="logo-google" size={24} color="#000" style={styles.buttonIcon} />
                    <Text style={[styles.buttonText, { color: "#000" }]}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Guest/Skip (Optional for dev) */}
                {/*
        <TouchableOpacity
          style={[styles.button, styles.guestButton]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={[styles.buttonText, { color: COLORS.text }]}>Guest Mode (Dev)</Text>
        </TouchableOpacity>
        */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: "space-around",
        padding: 24,
    },
    header: {
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: COLORS.text,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.gray,
        marginTop: 8,
    },
    buttonContainer: {
        gap: 16,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    appleButton: {
        backgroundColor: "#000",
        borderColor: "#000",
    },
    googleButton: {
        backgroundColor: "#FFF",
        borderColor: COLORS.border,
    },
    guestButton: {
        backgroundColor: "transparent",
        borderColor: COLORS.gray,
    },
    buttonIcon: {
        marginRight: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
