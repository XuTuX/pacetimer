import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { useSupabase } from '../lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/theme';

export default function SettingsScreen() {
    const { signOut, userId } = useAuth();
    const { user } = useUser();
    const supabase = useSupabase();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '로그아웃',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await signOut();
                        router.replace('/auth/login');
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '회원 탈퇴',
            '계정을 삭제하면 모든 학습 기록과 데이터가 영구적으로 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '탈퇴하기',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            // 1. Supabase 데이터 삭제
                            if (userId) {
                                // PostgreSQL 정책(RLS)이 잘 설정되어 있다면 본인 데이터만 지워집니다.
                                // 'attempts'와 연관된 'attempt_records'는 DB 레벨에서 CASCADE 설정이 되어 있어야 합니다.
                                await supabase.from('attempts').delete().eq('user_id', userId);
                                await supabase.from('room_members').delete().eq('user_id', userId);
                                await supabase.from('profiles').delete().eq('id', userId);
                            }

                            // 2. Clerk 인증 계정 삭제
                            await user?.delete();

                            router.replace('/auth/login');
                        } catch (err) {
                            console.error(err);
                            Alert.alert(
                                '탈퇴 실패',
                                '보안을 위해 최근에 로그인한 기록이 있어야 탈퇴가 가능합니다. 다시 로그인 후 시도해 주세요.'
                            );
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon, label, onPress, color = COLORS.text, showArrow = true }: any) => (
        <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <ThemedText style={[styles.itemLabel, { color }]}>{label}</ThemedText>
            </View>
            {showArrow && <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="설정" onBack={() => router.back()} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={32} color={COLORS.primary} />
                    </View>
                    <View style={styles.profileInfo}>
                        <ThemedText variant="h3">{user?.fullName || '사용자'}</ThemedText>
                        <ThemedText variant="caption" color={COLORS.textMuted}>{user?.primaryEmailAddress?.emailAddress}</ThemedText>
                    </View>
                </View>

                {/* Account Section */}
                <Card style={styles.menuCard} padding="none">
                    <SettingItem
                        icon="book-outline"
                        label="과목 관리"
                        onPress={() => router.push('/subjects/manage')}
                    />
                </Card>

                {/* Support Section */}
                <View style={styles.sectionSpacer} />
                <Card style={styles.menuCard} padding="none">
                    <SettingItem icon="information-circle-outline" label="버전 정보" showArrow={false} />
                    <View style={styles.divider} />
                    <View style={styles.versionRow}>
                        <ThemedText variant="body2" color={COLORS.textMuted}>현재 버전</ThemedText>
                        <ThemedText variant="body2" color={COLORS.textMuted}>1.0.0</ThemedText>
                    </View>
                </Card>

                {/* Danger Zone */}
                <View style={styles.sectionSpacer} />
                <Card style={styles.menuCard} padding="none">
                    <SettingItem
                        icon="log-out-outline"
                        label="로그아웃"
                        color={COLORS.text}
                        onPress={handleSignOut}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="trash-outline"
                        label="회원 탈퇴"
                        color={COLORS.error}
                        onPress={handleDeleteAccount}
                    />
                </Card>

                <View style={{ height: 60 }} />
            </ScrollView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xxl,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 40,
        gap: 20,
        justifyContent: 'center',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    profileInfo: {
        flex: 1,
        gap: 4,
    },
    sectionSpacer: {
        height: 12,
    },
    menuCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xxl,
        overflow: 'hidden',
        ...SHADOWS.small,
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 16,
    },
    versionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
});
