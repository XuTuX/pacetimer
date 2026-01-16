import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import { useWarmUpBrowser } from "../../lib/useWarmUpBrowser";

const { width, height } = Dimensions.get("window");

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    useWarmUpBrowser();
    const router = useRouter();

    const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
    const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-12, { duration: 3000 }),
                withTiming(0, { duration: 3000 })
            ),
            -1,
            true
        );
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const [isLoggingIn, setIsLoggingIn] = React.useState(false);

    const onSelectAuth = async (strategy: "google" | "apple") => {
        if (isLoggingIn) return;

        setIsLoggingIn(true);
        try {
            const startFlow = strategy === "google" ? startGoogleFlow : startAppleFlow;
            const { createdSessionId, setActive } = await startFlow();

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                router.replace("/(tabs)");
            }
        } catch (err) {
            if (__DEV__) {
                console.error("OAuth 오류", err);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const onOpenTOS = () => {
        WebBrowser.openBrowserAsync("https://narrow-parrot-7ce.notion.site/11-57-3-2e90ac852a17804fbbdbde3119997a51?pvs=73");
    };

    const onOpenPrivacy = () => {
        WebBrowser.openBrowserAsync("https://narrow-parrot-7ce.notion.site/11-57-3-2e90ac852a17804fbbdbde3119997a51?pvs=73");
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <LinearGradient
                colors={["#F0FAF5", "#FFFFFF", "#F5F7FA"]}
                style={StyleSheet.absoluteFill}
            />

            {/* 배경에 은은한 원형 장식 */}
            <View style={[styles.bgCircle, { top: -100, right: -100, backgroundColor: COLORS.primaryLight, opacity: 0.4 }]} />
            <View style={[styles.bgCircle, { bottom: -150, left: -150, backgroundColor: "#E0F2F1", opacity: 0.3 }]} />

            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Animated.View
                        entering={FadeIn.duration(1200)}
                        style={[styles.illustrationWrapper, floatingStyle]}
                    >
                        <View style={styles.imageShadow} />
                        <Image
                            source={require("../../assets/images/growth_flower.png")}
                            style={styles.illustration}
                            contentFit="cover"
                        />
                    </Animated.View>

                    <View style={styles.textContainer}>
                        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Pacetime</Text>
                                <View style={styles.dot} />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.descriptionWrapper}>
                            <Text style={styles.description}>
                                나만의 공부 페이스를 찾고{"\n"}
                                <Text style={{ color: COLORS.primary, fontWeight: "700" }}>함께 성장하는 즐거움</Text>을 느껴보세요.
                            </Text>
                        </Animated.View>
                    </View>

                    <Animated.View
                        entering={FadeInDown.delay(600).duration(800)}
                        style={styles.buttonContainer}
                    >
                        <TouchableOpacity
                            style={[styles.button, styles.appleButton, isLoggingIn && { opacity: 0.7 }]}
                            onPress={() => onSelectAuth("apple")}
                            activeOpacity={0.85}
                            disabled={isLoggingIn}
                        >
                            <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                            <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>Apple로 계속하기</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.googleButton, isLoggingIn && { opacity: 0.7 }]}
                            onPress={() => onSelectAuth("google")}
                            activeOpacity={0.85}
                            disabled={isLoggingIn}
                        >
                            <Ionicons name="logo-google" size={18} color="#1C1C1E" style={styles.buttonIcon} />
                            <Text style={[styles.buttonText, { color: "#1C1C1E" }]}>Google로 계속하기</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View
                        entering={FadeIn.delay(1000).duration(800)}
                        style={styles.footer}
                    >
                        <Text style={styles.footerText}>
                            계속 진행하면{" "}
                            <Text style={styles.linkText} onPress={onOpenTOS}>
                                서비스 이용약관
                            </Text>{" "}
                            및{"\n"}
                            <Text style={styles.linkText} onPress={onOpenPrivacy}>
                                개인정보 처리방침
                            </Text>
                            에 동의하게 됩니다.
                        </Text>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between", // 요소를 고르게 분산
        paddingHorizontal: 32,
        paddingTop: height * 0.05,
        paddingBottom: 40,
    },
    illustrationWrapper: {
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: 40,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        // 그림자 효과
        shadowColor: "#00D094",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 10,
    },
    imageShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    illustration: {
        width: "100%",
        height: "100%",
    },
    textContainer: {
        alignItems: "center",
        width: '100%',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
    },
    title: {
        fontSize: 44,
        fontWeight: "900",
        color: "#1C1C1E",
        letterSpacing: -1.5,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginLeft: 4,
    },
    tagline: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
        textAlign: 'center',
        marginTop: -4,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    descriptionWrapper: {
        marginTop: 24,
    },
    description: {
        fontSize: 16,
        color: "#48484A",
        textAlign: "center",
        lineHeight: 24,
        fontWeight: '400',
    },
    buttonContainer: {
        width: "100%",
        gap: 14,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 58,
        borderRadius: 16,
        paddingHorizontal: 20,
        // Premium shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    appleButton: {
        backgroundColor: "#000000",
    },
    googleButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    buttonIcon: {
        position: 'absolute',
        left: 24,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "600",
        letterSpacing: -0.3,
    },
    footer: {
        marginTop: 20,
    },
    footerText: {
        fontSize: 13,
        color: "#8E8E93",
        textAlign: "center",
        lineHeight: 20,
    },
    linkText: {
        textDecorationLine: 'underline',
        fontWeight: '500',
    }
});
