import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import SproutVisual from '../../components/SproutVisual';
import SubjectSelector from '../../components/SubjectSelector';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderSettings } from '../../components/ui/HeaderSettings';
import { ResponsiveContainer, useBreakpoint } from '../../components/ui/Layout';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { useAppStore } from '../../lib/store';
import { getStudyDateKey } from '../../lib/studyDate';
import { useSupabase } from '../../lib/supabase';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import type { Segment, Session } from '../../lib/types';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const { isAtLeastTablet } = useBreakpoint();

    const {
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        activeSubjectId,
        setActiveSubjectId,
        sessions,
        segments,
        activeSegmentId,
        stopwatch,
        nickname,
        setNickname
    } = useAppStore();

    // 모달(Bottom Sheet) 상태 관리
    const [isModalVisible, setModalVisible] = React.useState(false);
    const [now, setNow] = React.useState(Date.now());

    // Nickname State
    const { userId } = useAuth();
    const { user } = useUser();
    const supabase = useSupabase();

    // const [displayName, setDisplayName] = React.useState<string | null>(null);

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    React.useEffect(() => {
        if (!userId) return;
        supabase.from('profiles').select('display_name').eq('id', userId).single()
            .then(({ data, error }) => {
                if (error) return;
                const profileData = data as any;
                if (profileData?.display_name) {
                    setNickname(profileData.display_name);
                }
            });
    }, [userId]);

    const displayTitle = React.useMemo(() => {
        const name = nickname || '사용자';
        return `${name}`;
    }, [nickname]);

    const totalMs = React.useMemo(() => {
        const today = getStudyDateKey(now);
        const todaySessionIds = new Set(
            sessions.filter((s: Session) => s.studyDate === today).map((s: Session) => s.id)
        );
        let accumulated = segments.reduce((acc: number, seg: Segment) => {
            if (todaySessionIds.has(seg.sessionId) && seg.endedAt) {
                return acc + (seg.endedAt - seg.startedAt);
            }
            return acc;
        }, 0);
        if (activeSegmentId) {
            const activeSeg = segments.find((s: Segment) => s.id === activeSegmentId);
            if (activeSeg && todaySessionIds.has(activeSeg.sessionId)) {
                accumulated += (now - activeSeg.startedAt);
            }
        }
        return accumulated;
    }, [sessions, segments, activeSegmentId, now]);

    const totalMinutes = Math.floor(totalMs / 60000);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${hours}시간 ${minutes}분`;
        return `${minutes}분 ${seconds}초`;
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={displayTitle}
                rightElement={<HeaderSettings />}
                showBack={false}
                align="left"
            />

            <ResponsiveContainer maxWidth={isAtLeastTablet ? 1200 : 600}>
                <View style={[styles.content, isAtLeastTablet && styles.contentTablet]}>
                    <View style={isAtLeastTablet ? styles.tabletRow : null}>
                        {/* Left Side: Timer & Sprout */}
                        <View style={isAtLeastTablet ? styles.tabletLeftColumn : null}>
                            <Card variant="elevated" style={[styles.mainCard, isAtLeastTablet && styles.mainCardTablet]}>
                                <SproutVisual totalMinutes={totalMinutes} />
                                <View style={styles.timeContainer}>
                                    <ThemedText variant="h1" style={styles.timeText}>{formatTime(totalMs)}</ThemedText>
                                </View>
                            </Card>
                        </View>

                        {/* Right Side: Subjects & Actions */}
                        <View style={isAtLeastTablet ? styles.tabletRightColumn : null}>
                            <View style={[styles.centerContent, isAtLeastTablet && styles.centerContentTablet]}>
                                <SubjectSelector
                                    subjects={subjects}
                                    activeSubjectId={activeSubjectId}
                                    setActiveSubjectId={setActiveSubjectId}
                                    addSubject={addSubject}
                                    updateSubject={updateSubject}
                                    deleteSubject={deleteSubject}
                                    isModalVisible={isModalVisible}
                                    setModalVisible={setModalVisible}
                                />
                            </View>

                            <View style={[styles.bottomActions, isAtLeastTablet && styles.bottomActionsTablet]}>
                                <Button
                                    label={stopwatch.isRunning ? "집중 이어가기" : "집중 시작"}
                                    icon={stopwatch.isRunning ? "pause" : "play"}
                                    size="lg"
                                    style={styles.startBtn}
                                    disabled={!activeSubjectId && !stopwatch.isRunning}
                                    onPress={() => {
                                        if (stopwatch.isRunning) router.push('/timer');
                                        else if (activeSubjectId) router.push('/timer');
                                        else {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            setModalVisible(true);
                                        }
                                    }}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.mockExamBtn,
                                        activeSubjectId ? styles.mockExamActive : null
                                    ]}
                                    onPress={() => {
                                        if (activeSubjectId) {
                                            router.push('/modes/mock-exam/setup');
                                        } else {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            setModalVisible(true);
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="document-text-outline"
                                        size={24}
                                        color={activeSubjectId ? COLORS.primary : COLORS.textMuted}
                                    />
                                    <ThemedText
                                        style={[
                                            styles.mockExamText,
                                            activeSubjectId && { color: COLORS.primaryDark }
                                        ]}
                                    >
                                        모의고사
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </ResponsiveContainer>

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
        paddingBottom: 20,
    },
    contentTablet: {
        paddingTop: SPACING.xl,
        paddingHorizontal: 0, // ResponsiveContainer handles padding
    },
    tabletRow: {
        flexDirection: 'row',
        gap: SPACING.massive,
        alignItems: 'flex-start',
    },
    tabletLeftColumn: {
        flex: 1.2,
    },
    tabletRightColumn: {
        flex: 1,
        gap: SPACING.xl,
    },
    mainCard: {
        height: height * 0.38,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    mainCardTablet: {
        height: 500,
        marginTop: 0,
    },

    centerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    centerContentTablet: {
        flex: 0,
        marginVertical: 0,
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: SPACING.xs,
        gap: 2,
    },
    timeLabel: {
        fontWeight: '600',
        marginBottom: 2,
    },
    timeText: {
        fontSize: 34,
    },

    bottomActions: {
        flexDirection: 'row',
        marginTop: 'auto',
        marginBottom: SPACING.xl,
        gap: SPACING.md,
        alignItems: 'center',
    },
    bottomActionsTablet: {
        marginTop: SPACING.xl,
        marginBottom: 0,
    },
    startBtn: {
        flex: 3,
        height: 64,
        borderRadius: RADIUS.xl,
    },
    mockExamBtn: {
        flex: 1,
        height: 64,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    mockExamActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    mockExamText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 2,
    },
});
