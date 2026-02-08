export type AddMinuteResult = {
    nextRemaining: number;
    nextInitial: number;
};

type AddMinuteNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

const addMinuteApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
        rendererApiResolverUtils?: { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    };
    if (root.rendererApiResolverUtils) {
        return root.rendererApiResolverUtils;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
    return require('../api-resolver-utils') as { resolveApi: <T>(globalKey: string, requirePath: string) => T };
})();

const addMinuteNumberUtilsApi: AddMinuteNumberUtilsApi = addMinuteApiResolverUtils.resolveApi<AddMinuteNumberUtilsApi>('numberUtils', './number-utils');

/**
 * +1分の反映結果を計算する。
 * @param isCounting カウント中かどうか
 * @param currentRemaining 現在の残り秒数
 * @param currentInitial 現在の初期値
 * @returns 更新後の値
 */
export function applyAddMinute(
    isCounting: boolean,
    currentRemaining: number,
    currentInitial: number,
): AddMinuteResult {
    if (isCounting) {
        return {
            nextRemaining: clampCountdownValue(currentRemaining + 60),
            nextInitial: currentInitial,
        };
    }

    return {
        nextRemaining: currentRemaining,
        nextInitial: clampCountdownValue(currentInitial + 60),
    };
}

/**
 * カウントダウン値を範囲内に収める。
 * @param value カウントダウン値
 * @returns 補正後の値
 */
function clampCountdownValue(value: number): number {
    return addMinuteNumberUtilsApi.clamp(value, 1, 3600);
}
