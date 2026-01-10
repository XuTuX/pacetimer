type UnknownRecord = Record<string, unknown>;

export type NormalizedSupabaseError = {
    message: string;
    details?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null;
}

export function normalizeSupabaseError(error: unknown): NormalizedSupabaseError {
    if (!error) return { message: "알 수 없는 오류" };
    if (typeof error === "string") return { message: error };
    if (error instanceof Error) return { message: error.message };

    if (!isRecord(error)) return { message: String(error) };

    const message = typeof error.message === "string" ? error.message : "알 수 없는 오류";
    const code = typeof error.code === "string" ? error.code : undefined;
    const status = typeof error.status === "number" ? error.status : undefined;
    const details = typeof error.details === "string" ? error.details : undefined;
    const hint = typeof error.hint === "string" ? error.hint : undefined;

    const prefix = [
        code ? `[${code}]` : null,
        status ? `(상태 ${status})` : null,
    ].filter(Boolean).join(" ");

    const fullMessage = prefix ? `${prefix} ${message}` : message;
    const fullDetails = [details, hint].filter(Boolean).join("\n");

    return fullDetails ? { message: fullMessage, details: fullDetails } : { message: fullMessage };
}

export function formatSupabaseError(error: unknown): string {
    const normalized = normalizeSupabaseError(error);
    return normalized.details ? `${normalized.message}\n${normalized.details}` : normalized.message;
}
