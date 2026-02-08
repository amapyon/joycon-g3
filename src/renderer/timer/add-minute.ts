export type AddMinuteResult = {
    nextRemaining: number;
    nextInitial: number;
};

type AddMinuteNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

/**
 * 数値ユーティリティAPIを取得する。
 * @returns 数値ユーティリティAPI
 */
function resolveAddMinuteNumberUtilsApi(): AddMinuteNumberUtilsApi {
    const numberUtilsRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
        numberUtils?: AddMinuteNumberUtilsApi;
    };
    if (numberUtilsRoot.numberUtils) {
        return numberUtilsRoot.numberUtils;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
    return require('../number-utils') as AddMinuteNumberUtilsApi;
}

const addMinuteNumberUtilsApi: AddMinuteNumberUtilsApi = resolveAddMinuteNumberUtilsApi();

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
