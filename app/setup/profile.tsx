import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { ThemedText } from "../../components/ui/ThemedText";
import { generateRandomNickname } from "../../lib/nicknameGenerator";
import { useAppStore } from "../../lib/store";
import { useSupabase } from "../../lib/supabase";
import { COLORS, RADIUS, SPACING } from "../../lib/theme";

export default function ProfileSetupScreen() {
    const { userId } = useAuth();
    const { user } = useUser();
    const supabase = useSupabase();
    const router = useRouter();

    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        // 이미 닉네임이 있는지 확인 (혹시 모를 중복 진입 방지)
        const checkExisting = async () => {
            if (!userId) return;

            // 1. Generate random nickname initially
            setNickname(generateRandomNickname());

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("id", userId)
                    .single();

                if (data) {
                    const profileData = data as any;
                    if (profileData.display_name) {
                        // 이미 설정된 경우 메인으로
                        router.replace("/(tabs)");
                    }
                }
            } catch (err) {
                // Ignore errors here, just proceed to setup
            } finally {
                setInitialLoading(false);
            }
        };

        checkExisting();
    }, [userId]);

    const handleRandomize = () => {
        setNickname(generateRandomNickname());
    };

    const handleConfirm = async () => {
        if (!nickname.trim()) return;
        setLoading(true);

        try {
            // Update profile with new display_name
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: userId,
                    display_name: nickname.trim(),
                    avatar_url: user?.imageUrl,
                    updated_at: new Date().toISOString(),
                } as any, { onConflict: 'id' }); // Ensure we strictly update/upsert by ID

            if (error) {
                console.error("Profile update failed:", error);
                alert("프로필 설정에 실패했습니다. 다시 시도해주세요.");
                return;
            }

            // Success -> Go to tabs
            useAppStore.getState().setNickname(nickname.trim());
            router.replace("/(tabs)");
        } catch (err) {
            console.error("Setup error:", err);
            alert("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.content}
                    >
                        <View style={styles.header}>
                            <ThemedText variant="h1" style={styles.title}>
                                닉네임 설정
                            </ThemedText>
                            <ThemedText variant="body1" color={COLORS.textMuted} style={styles.subtitle}>
                                함께할 닉네임을 정해주세요!{"\n"}
                                언제든지 설정에서 변경할 수 있어요.
                            </ThemedText>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    placeholder="닉네임을 입력하세요"
                                    placeholderTextColor={COLORS.textMuted}
                                    maxLength={20}
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={styles.randomBtn}
                                    onPress={handleRandomize}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="dice-outline" size={24} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <ThemedText variant="caption" color={COLORS.textMuted} style={styles.hint}>
                                주사위를 눌러 랜덤 닉네임을 받아보세요!
                            </ThemedText>
                        </View>

                        <View style={styles.footer}>
                            <Button
                                label={loading ? "설정 중..." : "시작하기"}
                                onPress={handleConfirm}
                                disabled={loading || !nickname.trim()}
                                size="lg"
                                fullWidth
                            />
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xxl,
        justifyContent: "space-between",
        paddingBottom: SPACING.xl,
    },
    header: {
        marginTop: SPACING.xxl * 2,
        gap: SPACING.sm,
    },
    title: {
        fontSize: 32,
    },
    subtitle: {
        lineHeight: 24,
    },
    inputContainer: {
        flex: 1,
        justifyContent: "center",
        gap: SPACING.sm,
        marginTop: -SPACING.xxl * 2, // Pull up slightly
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        height: 64,
        gap: SPACING.md,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.text,
        height: "100%",
    },
    randomBtn: {
        padding: 8,
    },
    hint: {
        textAlign: "center",
        marginTop: 8,
    },
    footer: {
        marginBottom: SPACING.xl,
    },
});
