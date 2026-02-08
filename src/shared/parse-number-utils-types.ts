export type ParseNumberUtilsApi = {
    parseIntOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseFloatOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseIntOrNull: (raw: string | null | undefined) => number | null;
};
