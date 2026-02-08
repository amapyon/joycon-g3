type ParseNumberUtilsApi = import('../shared/parse-number-utils-types').ParseNumberUtilsApi;

/**
 * 文字列を整数として読み取り、失敗時は既定値を返す。
 * @param raw 生文字列
 * @param fallback 変換失敗時の値
 * @returns 変換結果
 */
function parseIntOrFallback(raw: string | null | undefined, fallback: number): number {
    if (!raw) {
        return fallback;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * 文字列を浮動小数点として読み取り、失敗時は既定値を返す。
 * @param raw 生文字列
 * @param fallback 変換失敗時の値
 * @returns 変換結果
 */
function parseFloatOrFallback(raw: string | null | undefined, fallback: number): number {
    if (!raw) {
        return fallback;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * 文字列を整数として読み取り、失敗時は null を返す。
 * @param raw 生文字列
 * @returns 変換結果。失敗時は null
 */
function parseIntOrNull(raw: string | null | undefined): number | null {
    if (!raw) {
        return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

const parseNumberUtilsApi: ParseNumberUtilsApi = {
    parseIntOrFallback,
    parseFloatOrFallback,
    parseIntOrNull,
};

const parseNumberUtilsRoot = globalThis as typeof globalThis & {
    parseNumberUtils?: ParseNumberUtilsApi;
};
parseNumberUtilsRoot.parseNumberUtils = parseNumberUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = parseNumberUtilsApi;
}
