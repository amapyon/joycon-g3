type RendererNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

/**
 * 数値を指定範囲に収める。
 * @param value 対象値
 * @param min 最小値
 * @param max 最大値
 * @returns 補正後の値
 */
function clampNumberValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * 数値を NaN 判定と範囲補正を通して正規化する。
 * @param value 対象値
 * @param fallback NaN 時の既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化後の値
 */
function normalizeNumberValue(value: number, fallback: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
        return fallback;
    }
    return clampNumberValue(value, min, max);
}

const rendererNumberUtilsApi: RendererNumberUtilsApi = {
    clamp: clampNumberValue,
    normalizeNumber: normalizeNumberValue,
};

const rendererNumberUtilsRoot = globalThis as unknown as {
    numberUtils?: RendererNumberUtilsApi;
};
rendererNumberUtilsRoot.numberUtils = rendererNumberUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = rendererNumberUtilsApi;
}
