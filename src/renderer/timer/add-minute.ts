export type AddMinuteResult = {
    nextRemaining: number;
    nextInitial: number;
};

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
    return Math.max(1, Math.min(3600, value));
}
