/**
 * Helpers for interpreting room exam titles, which combine the host-selected subject
 * and the custom exam name (e.g. `과목 • 호스트가 정한 이름`).
 */
export function getRoomExamSubjectFromTitle(title?: string): string | null {
    if (!title) return null;

    const trimmed = title.trim();
    if (!trimmed) return null;

    // Remove the room tag if present so that subjects prefixed by `[스터디]` are parsed cleanly.
    const withoutRoomTag = trimmed.replace(/^\[스터디\]\s*/i, '');

    const bulletMatch = withoutRoomTag.match(/^(.*?)\s*•/);
    if (bulletMatch && bulletMatch[1]) {
        return bulletMatch[1].trim();
    }

    const bracketMatch = withoutRoomTag.match(/^\[(.*?)\]/);
    if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1].trim();
    }

    return null;
}

export function getRoomExamDisplayTitle(title?: string): string {
    if (!title) return '';

    const trimmed = title.trim();
    if (!trimmed) return '';

    const withoutRoomTag = trimmed.replace(/^\[스터디\]\s*/i, '').trim();

    const bulletMatch = withoutRoomTag.match(/^(.*?)\s*•\s*(.+)$/);
    if (bulletMatch && bulletMatch[2]) {
        return bulletMatch[2].trim();
    }

    const bracketMatch = withoutRoomTag.match(/^\[(.*?)\]\s*(.+)$/);
    if (bracketMatch && bracketMatch[2]) {
        return bracketMatch[2].trim();
    }

    return withoutRoomTag;
}
