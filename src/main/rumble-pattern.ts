export type RumbleStep = { on: boolean; durationMs: number };

/**
 * 強めのトリプル振動パターンを生成する。
 * @returns 振動パターン
 */
export function createStrongTripleRumblePattern(): RumbleStep[] {
    return [
        { on: true, durationMs: 180 },
        { on: false, durationMs: 80 },
        { on: true, durationMs: 180 },
        { on: false, durationMs: 80 },
        { on: true, durationMs: 180 },
        { on: false, durationMs: 80 },
    ];
}
