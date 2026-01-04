import AsyncStorage from '@react-native-async-storage/async-storage';

export type LapRecord = {
    questionNo: number;
    duration: number; // in seconds
};

export type ExamSession = {
    id: string;
    title: string;
    categoryName: string;
    categoryId: string;
    date: string; // ISO string
    totalQuestions: number;
    totalSeconds: number;
    targetSeconds: number;
    laps: LapRecord[];
};

const STORAGE_KEY = '@pacetime_sessions';

export const saveSession = async (session: ExamSession) => {
    try {
        const existingData = await AsyncStorage.getItem(STORAGE_KEY);
        const sessions: ExamSession[] = existingData ? JSON.parse(existingData) : [];
        sessions.unshift(session); // Add to beginning
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error('Failed to save session:', error);
    }
};

export const getSessions = async (): Promise<ExamSession[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to get sessions:', error);
        return [];
    }
};

export const clearSessions = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear sessions:', error);
    }
};

export const deleteSession = async (id: string) => {
    try {
        const existingData = await AsyncStorage.getItem(STORAGE_KEY);
        if (existingData) {
            const sessions: ExamSession[] = JSON.parse(existingData);
            const filtered = sessions.filter(s => s.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
    } catch (error) {
        console.error('Failed to delete session:', error);
    }
};
