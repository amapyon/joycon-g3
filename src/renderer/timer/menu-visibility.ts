export type CountdownMenuVisibilityDecision = {
    menuVisible: boolean;
    timerVisible: boolean;
    updateMenuDisplay: boolean;
    renderPresets: boolean;
    stopCountdown: boolean;
    resetTimerText: boolean;
};

/**
 * カウントダウンメニュー表示切替時の挙動を決定する。
 * @param visible 表示するかどうか
 * @returns 反映する挙動
 */
export function decideCountdownMenuVisibility(visible: boolean): CountdownMenuVisibilityDecision {
    if (visible) {
        return {
            menuVisible: true,
            timerVisible: false,
            updateMenuDisplay: true,
            renderPresets: true,
            stopCountdown: false,
            resetTimerText: false,
        };
    }

    return {
        menuVisible: false,
        timerVisible: true,
        updateMenuDisplay: false,
        renderPresets: false,
        stopCountdown: false,
        resetTimerText: false,
    };
}
