const STUDY_DAY_SHIFT_MS = 6 * 60 * 60 * 1000;

export function getStudyDateKey(timestampMs: number): string {
    const shifted = new Date(timestampMs - STUDY_DAY_SHIFT_MS);
    return shifted.toISOString().slice(0, 10);
}

export function formatDisplayDate(dateKey: string, nowMs: number = Date.now()): string {
    const [y, m, d] = dateKey.split('-').map(s => parseInt(s, 10));
    const date = new Date(y, m - 1, d);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${m}월 ${d}일 (${dayOfWeek})`;
}

export function formatClockTime(timestampMs: number): string {
    return new Date(timestampMs).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function formatDurationMs(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
}

export function formatDurationSec(sec: number): string {
    return formatDurationMs(sec * 1000);
}

export function formatHMS(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

