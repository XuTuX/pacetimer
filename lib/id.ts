export function createId(prefix?: string): string {
    const base = Math.random().toString(36).slice(2, 11);
    return prefix ? `${prefix}_${base}` : base;
}

