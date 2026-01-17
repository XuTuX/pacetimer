import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { ThemedText } from "../../../components/ui/ThemedText";
import { useSupabase } from "../../../lib/supabase";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../lib/theme";

export default function RoomSettingsScreen() {
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const supabase = useSupabase();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isTransferModalVisible, setTransferModalVisible] = useState(false);
    const [isSubjectModalVisible, setSubjectModalVisible] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");

    const loadRoomData = useCallback(async () => {
        if (!roomId || !userId) return;
        setLoading(true);
        try {
            const [roomRes, membersRes, subjectsRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("id", roomId).single(),
                supabase.from("room_members").select(`*, profile:profiles(*)`).eq("room_id", roomId).order("created_at", { ascending: true }),
                supabase.from("room_subjects").select("*").eq("room_id", roomId).eq("is_archived", false).order("created_at", { ascending: true })
            ]);

            if (roomRes.error) throw roomRes.error;
            setRoom(roomRes.data);
            setIsOwner(roomRes.data.owner_id === userId);
            setMembers(membersRes.data || []);
            setSubjects(subjectsRes.data || []);
        } catch (err) {
            console.error("Error loading room data:", err);
        } finally {
            setLoading(false);
        }
    }, [roomId, userId, supabase]);

    useEffect(() => {
        loadRoomData();
    }, [loadRoomData]);

    const handleTransfer = async (targetUserId: string, targetName: string) => {
        if (!roomId) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from("rooms")
                .update({ owner_id: targetUserId })
                .eq("id", roomId);

            if (error) throw error;

            Alert.alert("완료", `이제 ${targetName}님이 방장이 되었습니다.`);
            setTransferModalVisible(false);
            await loadRoomData();
        } catch (err) {
            Alert.alert("오류", "방장 권한 위임에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim() || !roomId) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from("room_subjects")
                .insert({
                    room_id: roomId,
                    name: newSubjectName.trim()
                });

            if (error) throw error;

            setNewSubjectName("");
            setSubjectModalVisible(false);
            await loadRoomData();
        } catch (err) {
            Alert.alert("오류", "과목을 추가하지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubject = (subjectId: string, subjectName: string) => {
        if (!isOwner) return;

        Alert.alert(
            "과목 삭제",
            `'${subjectName}' 과목을 삭제하시겠습니까?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from("room_subjects")
                                .update({ is_archived: true })
                                .eq("id", subjectId);

                            if (error) throw error;
                            await loadRoomData();
                        } catch (err) {
                            Alert.alert("오류", "과목 삭제에 실패했습니다.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLeaveRoom = () => {
        if (!roomId || !userId) return;
        if (isOwner) {
            const otherMembers = members.filter(m => m.user_id !== userId);

            if (otherMembers.length === 0) {
                // 혼자인 경우
                Alert.alert(
                    "스터디 나가기",
                    "방장님은 혼자이므로 나가면 스터디가 삭제됩니다. 정말 나가시겠습니까?",
                    [
                        { text: "취소", style: "cancel" },
                        { text: "삭제하고 나가기", style: "destructive", onPress: handleDeleteRoom }
                    ]
                );
            } else {
                // 다른 멤버가 있는 경우
                Alert.alert(
                    "스터디 나가기",
                    "방장 권한을 어떻게 하시겠습니까?",
                    [
                        { text: "취소", style: "cancel" },
                        {
                            text: "방장 넘기고 나가기",
                            onPress: async () => {
                                // 가장 오래된 멤버(index 0은 나 자신일 것이므로 index 1)에게 위임
                                const nextOwner = otherMembers[0];
                                if (!nextOwner) return;
                                try {
                                    setLoading(true);
                                    // 1. 위임
                                    await supabase.from("rooms").update({ owner_id: nextOwner.user_id }).eq("id", roomId);
                                    // 2. 나가기
                                    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
                                    router.replace("/(tabs)/rooms");
                                } catch (err) {
                                    Alert.alert("오류", "처리에 실패했습니다.");
                                } finally {
                                    setLoading(false);
                                }
                            }
                        },
                        { text: "전체 삭제하고 나가기", style: "destructive", onPress: handleDeleteRoom }
                    ]
                );
            }
            return;
        }

        // 일반 멤버인 경우
        Alert.alert(
            "스터디 나가기",
            "정말 이 스터디를 나가시겠습니까?\n모든 기록은 유지되지만 다시 입장하려면 코드가 필요합니다.",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "나가기",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("room_members")
                                .delete()
                                .eq("room_id", roomId)
                                .eq("user_id", userId);

                            if (error) throw error;
                            router.replace("/(tabs)/rooms");
                        } catch (err) {
                            Alert.alert("오류", "스터디를 나가지 못했습니다.");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteRoom = () => {
        Alert.alert(
            "스터디 삭제",
            "정말 이 스터디를 삭제하시겠습니까?\n모든 멤버와 기록이 사라지며 복구할 수 없습니다.",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제하기",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("rooms")
                                .delete()
                                .eq("id", roomId);

                            if (error) throw error;
                            router.replace("/(tabs)/rooms");
                        } catch (err) {
                            Alert.alert("오류", "스터디를 삭제하지 못했습니다.");
                        }
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon, label, onPress, color = COLORS.text, showArrow = true, value, disabled }: any) => (
        <TouchableOpacity
            style={[styles.item, (disabled || loading) && { opacity: 0.5 }]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={disabled || loading}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <ThemedText style={[styles.itemLabel, { color }]}>{label}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {value && <ThemedText variant="body2" color={COLORS.textMuted} numberOfLines={1}>{value}</ThemedText>}
                {showArrow && <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="스터디 설정" onBack={() => router.back()} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Room Info (Read only for now) */}
                <View style={styles.sectionHeader}>
                    <ThemedText variant="caption" color={COLORS.textMuted}>스터디 정보</ThemedText>
                </View>
                <Card style={styles.menuCard} padding="none">
                    <SettingItem
                        icon="home-outline"
                        label="스터디 이름"
                        value={room?.name}
                        showArrow={false}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="key-outline"
                        label="입장 코드"
                        value={room?.id?.substring(0, 6).toUpperCase()}
                        showArrow={false}
                    />
                </Card>

                {/* Subjects Management */}
                <View style={styles.sectionSpacer} />
                <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <ThemedText variant="caption" color={COLORS.textMuted}>스터디 과목</ThemedText>
                    {isOwner && (
                        <TouchableOpacity onPress={() => setSubjectModalVisible(true)}>
                            <ThemedText variant="caption" color={COLORS.primary}>+ 추가</ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
                <Card style={styles.menuCard} padding="none">
                    {subjects.length === 0 ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                            <ThemedText variant="body2" color={COLORS.textMuted}>등록된 과목이 없습니다.</ThemedText>
                        </View>
                    ) : (
                        subjects.map((subject, index) => (
                            <React.Fragment key={subject.id}>
                                <View style={styles.item}>
                                    <View style={styles.itemLeft}>
                                        <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '10' }]}>
                                            <Ionicons name="book-outline" size={18} color={COLORS.primary} />
                                        </View>
                                        <ThemedText style={styles.itemLabel}>{subject.name}</ThemedText>
                                    </View>
                                    {isOwner && (
                                        <TouchableOpacity onPress={() => handleDeleteSubject(subject.id, subject.name)}>
                                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {index < subjects.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        ))
                    )}
                </Card>

                {/* Actions */}
                <View style={styles.sectionSpacer} />
                <View style={styles.sectionHeader}>
                    <ThemedText variant="caption" color={COLORS.textMuted}>스터디 관리</ThemedText>
                </View>
                <Card style={styles.menuCard} padding="none">
                    {isOwner && (
                        <>
                            <SettingItem
                                icon="person-add-outline"
                                label="방장 권한 위임"
                                onPress={() => setTransferModalVisible(true)}
                                disabled={members.length <= 1}
                            />
                            <View style={styles.divider} />
                        </>
                    )}
                    <SettingItem
                        icon="log-out-outline"
                        label="스터디 나가기"
                        onPress={handleLeaveRoom}
                    />
                    {isOwner && (
                        <>
                            <View style={styles.divider} />
                            <SettingItem
                                icon="trash-outline"
                                label="스터디 삭제"
                                color={COLORS.error}
                                onPress={handleDeleteRoom}
                            />
                        </>
                    )}
                </Card>

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Transfer Ownership Modal */}
            <Modal
                visible={isTransferModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTransferModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText variant="h3">방장 위임</ThemedText>
                            <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <ThemedText variant="body2" color={COLORS.textMuted} style={{ marginBottom: 16 }}>
                            방장을 넘겨줄 멤버를 선택해주세요.
                        </ThemedText>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {members.filter(m => m.user_id !== userId).map(m => (
                                <TouchableOpacity
                                    key={m.user_id}
                                    style={styles.memberItem}
                                    onPress={() => handleTransfer(m.user_id, m.profile?.display_name || '익명')}
                                >
                                    <View style={styles.avatarMini}>
                                        <ThemedText variant="caption" color={COLORS.primary}>
                                            {(m.profile?.display_name || '?')[0]}
                                        </ThemedText>
                                    </View>
                                    <ThemedText variant="body1">
                                        {m.profile?.display_name || '익명'}
                                    </ThemedText>
                                    <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Subject Add Modal */}
            <Modal
                visible={isSubjectModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSubjectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText variant="h3">과목 추가</ThemedText>
                            <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <ThemedText variant="body2" color={COLORS.textMuted} style={{ marginBottom: 16 }}>
                            스터디에서 사용할 과목 이름을 입력해주세요.
                        </ThemedText>

                        <TextInput
                            style={styles.input}
                            value={newSubjectName}
                            onChangeText={setNewSubjectName}
                            placeholder="과목명 (예: 국어, 수학)"
                            placeholderTextColor={COLORS.textMuted}
                            autoFocus
                        />

                        <View style={{ marginTop: 20 }}>
                            <Button
                                label="추가하기"
                                onPress={handleCreateSubject}
                                disabled={!newSubjectName.trim() || loading}
                                loading={loading}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    sectionHeader: {
        marginTop: 24,
        marginBottom: 8,
        paddingLeft: 4,
    },
    sectionSpacer: {
        height: 8,
    },
    menuCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xxl,
        overflow: 'hidden',
        ...SHADOWS.small,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: 24,
        ...SHADOWS.medium,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 12,
    },
    avatarMini: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.md,
        padding: 12,
        color: COLORS.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    }
});
