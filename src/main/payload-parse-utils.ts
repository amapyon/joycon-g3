type CursorId = import('../shared/cursor-types').CursorId;

/**
 * 値がオブジェクトかどうかを判定する。
 * @param value 判定対象
 * @returns オブジェクトの場合は true
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * カーソル ID かどうかを判定する。
 * @param value 判定対象
 * @returns カーソル ID の場合は true
 */
export function isCursorId(value: unknown): value is CursorId {
    return value === 'cursorLeft' || value === 'cursorRight';
}

/**
 * 値が有限数かを判定する。
 * @param value 判定対象
 * @returns 有限数の場合は true
 */
export function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 数値ペイロードを解析する。
 * @param value 入力値
 * @returns 数値。無効な場合は null
 */
export function parseNumberPayload(value: unknown): number | null {
    return isFiniteNumber(value) ? value : null;
}

/**
 * 数値配列ペイロードを解析する。
 * @param value 入力値
 * @returns 数値配列。無効な場合は null
 */
export function parseNumberArrayPayload(value: unknown): number[] | null {
    if (!Array.isArray(value)) {
        return null;
    }
    if (!value.every((item: unknown): boolean => isFiniteNumber(item))) {
        return null;
    }
    return value;
}
