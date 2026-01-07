import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyAnalysis, SubjectAnalysisData } from '../../components/DailyAnalysis';
import SessionDetail from '../../components/SessionDetail';
import { SubjectAnalysisOverlay } from '../../components/SubjectAnalysisOverlay';
import { ExamSession } from '../../lib/storage';
import { COLORS } from '../../lib/theme';

export default function AnalysisScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAnalysisData | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const insets = useSafeAreaInsets();

    const getStudyDate = (timestamp: number | string | Date) => {
        const d = new Date(timestamp);
        const shifted = new Date(d.getTime() - 21600000);
        return shifted.toISOString().split('T')[0];
    };

    const [selectedAnalysisDate, setSelectedAnalysisDate] = useState<string>(getStudyDate(Date.now()));

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>학습 분석</Text>
                        <Text style={styles.userLabel}>{userId || 'Guest User'}</Text>
                    </View>
                    <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(v => !v)}>
                        <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    {settingsOpen && (
                        <View style={styles.dropdown}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => router.push('/subjects/manage')}>
                                <Ionicons name="book-outline" size={18} color={COLORS.text} />
                                <Text style={styles.dropdownText}>과목 관리</Text>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
                                <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
                                <Text style={[styles.dropdownText, { color: COLORS.accent }]}>로그아웃</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                    <View style={styles.statsView}>
                        <DailyAnalysis
                            selectedDate={selectedAnalysisDate}
                            onDateChange={(d) => {
                                if (d) setSelectedAnalysisDate(d);
                            }}
                            onSubjectSelect={(data) => setSelectedSubjectDetail(data)}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>

            {selectedSubjectDetail && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 110 }]}>
                    <SubjectAnalysisOverlay
                        data={selectedSubjectDetail}
                        onBack={() => setSelectedSubjectDetail(null)}
                    />
                </View>
            )}

            {selectedSession && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                        <ScrollView
                            style={{ backgroundColor: COLORS.bg }}
                            contentContainerStyle={{ padding: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <SessionDetail session={selectedSession} showDate={true} onBack={() => setSelectedSession(null)} />
                        </ScrollView>
                    </SafeAreaView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    userLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdown: {
        position: 'absolute',
        top: 70,
        right: 24,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 8,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    content: { flex: 1 },
    statsView: { paddingHorizontal: 24, paddingTop: 16 },
});
