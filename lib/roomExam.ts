/**
 * Helpers for interpreting room exam titles, which combine the host-selected subject
 * and the custom exam name (e.g. `과목 • 호스트가 정한 이름`).
 */
export function getRoomExamSubjectFromTitle(title?: string): string | null {
    if (!title) return null;

    const trimmed = title.trim();
    if (!trimmed) return null;

    // Remove the room tag if present so that subjects prefixed by `[룸]` are parsed cleanly.
    const withoutRoomTag = trimmed.replace(/^\[룸\]\s*/i, '');

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
