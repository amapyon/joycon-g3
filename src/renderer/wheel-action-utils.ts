type WheelActionUtilsSharedAction = import('../shared/wheel-action-types').WheelAction;
type WheelActionUtilsSharedApi = import('../shared/wheel-action-types').WheelActionUtilsApi;

/**
 * ホイール入力から操作種別と増減量を判定する。
 * @param deltaY ホイール変化量
 * @param shiftKey Shift 押下状態
 * @returns 操作種別と増減量
 */
function resolveWheelActionFromInput(deltaY: number, shiftKey: boolean): WheelActionUtilsSharedAction {
    if (shiftKey) {
        return {
            kind: 'opacity',
            delta: deltaY < 0 ? 0.05 : -0.05,
        };
    }
    return {
        kind: 'fontSize',
        delta: deltaY < 0 ? 5 : -5,
    };
}

const wheelActionUtilsApi: WheelActionUtilsSharedApi = {
    resolveWheelAction: resolveWheelActionFromInput,
};

const wheelActionUtilsRoot = globalThis as unknown as {
    wheelActionUtils?: WheelActionUtilsSharedApi;
};
wheelActionUtilsRoot.wheelActionUtils = wheelActionUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = wheelActionUtilsApi;
}
