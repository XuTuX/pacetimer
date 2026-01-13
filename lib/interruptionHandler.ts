/**
 * Interruption Handler for Mock Exam Timer
 * 모의고사 타이머 이탈 처리 유틸리티
 * 
 * 시나리오:
 * 1. 짧은 이탈 (<10초): 경고 없이 계속, 로그만 저장
 * 2. 중간 이탈 (10-60초): 복귀 시 경고 토스트 표시
 * 3. 긴 이탈 (>60초): 시험 자동 종료 처리
 * 4. 앱 완전 종료: 재진입 불가, 현재까지 기록 저장
 */

import { AppState, type AppStateStatus } from 'react-native';

export interface Interruption {
    startedAt: number;  // timestamp
    endedAt?: number;   // timestamp
    type: 'background' | 'lock' | 'call' | 'unknown';
    durationMs?: number;
}

export interface InterruptionState {
    count: number;
    totalDurationMs: number;
    interruptions: Interruption[];
    currentInterruption: Interruption | null;
}

export type InterruptionCallback = (
    action: 'warning' | 'force_end',
    durationMs: number
) => void;

// Configuration
export const INTERRUPTION_CONFIG = {
    // Thresholds in milliseconds
    SHORT_THRESHOLD: 10000,      // <10 seconds: silent continue
    MEDIUM_THRESHOLD: 60000,     // 10-60 seconds: warning
    // >60 seconds: force end

    // Limits
    MAX_INTERRUPTIONS: 3,        // Maximum allowed interruptions before force end
    MAX_TOTAL_DURATION: 180000,  // Maximum total interruption time (3 minutes)
};

/**
 * Create an interruption handler
 */
export function createInterruptionHandler(
    onInterruption: InterruptionCallback
): {
    state: InterruptionState;
    startListening: () => () => void;
    reset: () => void;
    getMetadata: () => {
        interruption_count: number;
        total_interruption_ms: number;
        interruptions: Array<{
            started_at: string;
            ended_at: string;
            type: string;
            duration_ms: number;
        }>;
    };
} {
    const state: InterruptionState = {
        count: 0,
        totalDurationMs: 0,
        interruptions: [],
        currentInterruption: null,
    };

    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    let lastActiveTime = Date.now();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        const now = Date.now();

        if (nextAppState === 'background' || nextAppState === 'inactive') {
            // User is leaving the app
            if (!state.currentInterruption) {
                state.currentInterruption = {
                    startedAt: now,
                    type: nextAppState === 'inactive' ? 'lock' : 'background',
                };
                lastActiveTime = now;
            }
        } else if (nextAppState === 'active') {
            // User is returning to the app
            if (state.currentInterruption) {
                const duration = now - state.currentInterruption.startedAt;

                state.currentInterruption.endedAt = now;
                state.currentInterruption.durationMs = duration;

                // Add to history
                state.interruptions.push({ ...state.currentInterruption });
                state.count++;
                state.totalDurationMs += duration;

                // Determine action based on duration
                if (duration > INTERRUPTION_CONFIG.MEDIUM_THRESHOLD) {
                    // Long interruption - force end
                    onInterruption('force_end', duration);
                } else if (duration >= INTERRUPTION_CONFIG.SHORT_THRESHOLD) {
                    // Medium interruption - show warning
                    onInterruption('warning', duration);
                }
                // Short interruption - silently continue

                // Reset current
                state.currentInterruption = null;

                // Check cumulative limits
                if (
                    state.count >= INTERRUPTION_CONFIG.MAX_INTERRUPTIONS ||
                    state.totalDurationMs >= INTERRUPTION_CONFIG.MAX_TOTAL_DURATION
                ) {
                    onInterruption('force_end', state.totalDurationMs);
                }
            }
        }
    };

    return {
        state,

        startListening: () => {
            appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
            return () => {
                appStateSubscription?.remove();
            };
        },

        reset: () => {
            state.count = 0;
            state.totalDurationMs = 0;
            state.interruptions = [];
            state.currentInterruption = null;
            lastActiveTime = Date.now();
        },

        getMetadata: () => ({
            interruption_count: state.count,
            total_interruption_ms: state.totalDurationMs,
            interruptions: state.interruptions.map(i => ({
                started_at: new Date(i.startedAt).toISOString(),
                ended_at: new Date(i.endedAt || i.startedAt).toISOString(),
                type: i.type,
                duration_ms: i.durationMs || 0,
            })),
        }),
    };
}

/**
 * Format interruption duration for display
 */
export function formatInterruptionDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}초`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초` : `${minutes}분`;
}

/**
 * Get severity level for an interruption
 */
export function getInterruptionSeverity(durationMs: number): 'low' | 'medium' | 'high' {
    if (durationMs < INTERRUPTION_CONFIG.SHORT_THRESHOLD) {
        return 'low';
    }
    if (durationMs < INTERRUPTION_CONFIG.MEDIUM_THRESHOLD) {
        return 'medium';
    }
    return 'high';
}

/**
 * Get warning message for an interruption
 */
export function getInterruptionMessage(action: 'warning' | 'force_end', durationMs: number): {
    title: string;
    message: string;
    type: 'warning' | 'error';
} {
    const formattedDuration = formatInterruptionDuration(durationMs);

    if (action === 'force_end') {
        return {
            title: '시험 종료',
            message: `${formattedDuration} 동안 이탈하여 시험이 자동 종료되었습니다.`,
            type: 'error',
        };
    }

    return {
        title: '이탈 감지',
        message: `${formattedDuration} 동안 이탈했습니다. 시험이 계속 진행됩니다.`,
        type: 'warning',
    };
}

/**
 * React hook for interruption handling (to be used in exam screens)
 */
export function useInterruptionHandler(
    isActive: boolean,
    onWarning: (message: string) => void,
    onForceEnd: () => void
) {
    // This would be implemented as a React hook using the above utilities
    // For now, we export the utilities and let the component handle the integration
}
