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
const CATEGORY_KEY = '@pacetime_categories';

export type Category = {
    id: string;
    name: string;
    isDefault?: boolean;
    defaultQuestions?: string;
    defaultMinutes?: string;
};

export const DEFAULT_CATEGORIES: Category[] = [
    { id: "lang", name: "국어", isDefault: true, defaultQuestions: "45", defaultMinutes: "80" },
    { id: "math", name: "수학", isDefault: true, defaultQuestions: "30", defaultMinutes: "100" },
    { id: "eng", name: "영어", isDefault: true, defaultQuestions: "45   ", defaultMinutes: "70" },
];

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

export const saveCategories = async (categories: Category[]) => {
    try {
        await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
    } catch (error) {
        console.error('Failed to save categories:', error);
    }
};

export const getCategories = async (): Promise<Category[]> => {
    try {
        const data = await AsyncStorage.getItem(CATEGORY_KEY);
        if (!data) {
            await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
            return DEFAULT_CATEGORIES;
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to get categories:', error);
        return DEFAULT_CATEGORIES;
    }
};
