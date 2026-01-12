import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { useAppStore } from '../lib/store';
import { useSupabase } from '../lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/theme';

export default function SettingsScreen() {
    const { signOut, userId } = useAuth();
    const { user } = useUser();
    const supabase = useSupabase();
    const { clearAllData } = useAppStore();
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
                        clearAllData();
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

                            // 3. 로컬 데이터 삭제
                            clearAllData();

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

    // Nickname Edit State
    const [isNicknameModalVisible, setNicknameModalVisible] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);

    // Initial fetch for nickname
    React.useEffect(() => {
        if (!userId) return;
        supabase.from('profiles').select('display_name').eq('id', userId).single()
            .then(({ data, error }) => {
                if (error) return;
                // Force cast data as any because types are outdated
                const profileData = data as any;
                if (profileData) setProfile(profileData);
                setNewNickname(profileData?.display_name || '');
            });
    }, [userId]);

    const handleUpdateNickname = async () => {
        if (!newNickname.trim() || !userId) return;
        setLoading(true);
        try {
            // Force cast to any to bypass outdated types
            const { error } = await supabase
                .from('profiles')
                .update({ display_name: newNickname.trim(), updated_at: new Date().toISOString() } as any)
                .eq('id', userId);

            if (error) throw error;

            setProfile(prev => ({ ...prev, display_name: newNickname.trim() }));
            setNicknameModalVisible(false);
            Alert.alert("성공", "닉네임이 변경되었습니다.");
        } catch (err) {
            console.error(err);
            Alert.alert("오류", "닉네임 변경에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const SettingItem = ({ icon, label, onPress, color = COLORS.text, showArrow = true, value }: any) => (
        <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <ThemedText style={[styles.itemLabel, { color }]}>{label}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {value && <ThemedText variant="body2" color={COLORS.textMuted}>{value}</ThemedText>}
                {showArrow && <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
            </View>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ThemedText variant="h3">{profile?.display_name || user?.fullName || '사용자'}</ThemedText>
                            <TouchableOpacity onPress={() => setNicknameModalVisible(true)} hitSlop={10}>
                                <Ionicons name="pencil" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <ThemedText variant="caption" color={COLORS.textMuted}>{user?.primaryEmailAddress?.emailAddress}</ThemedText>
                    </View>
                </View>

                {/* Account Section */}
                <Card style={styles.menuCard} padding="none">
                    <SettingItem
                        icon="person-outline"
                        label="닉네임 변경"
                        value={profile?.display_name}
                        onPress={() => setNicknameModalVisible(true)}
                    />
                    <View style={styles.divider} />
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

            {/* Nickname Edit Modal */}
            <Modal
                visible={isNicknameModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setNicknameModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setNicknameModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <ThemedText variant="h3" style={{ marginBottom: 16 }}>닉네임 변경</ThemedText>
                        <TextInput
                            style={styles.modalInput}
                            value={newNickname}
                            onChangeText={setNewNickname}
                            placeholder="새로운 닉네임"
                            placeholderTextColor={COLORS.textMuted}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setNicknameModalVisible(false)}>
                                <ThemedText color={COLORS.textMuted}>취소</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleUpdateNickname}>
                                <ThemedText color={COLORS.white} style={{ fontWeight: '600' }}>저장</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: 24,
        ...SHADOWS.medium,
    },
    modalInput: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: COLORS.bg,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtnCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalBtnConfirm: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: RADIUS.lg,
    },
});
