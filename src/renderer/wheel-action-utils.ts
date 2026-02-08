type WheelActionUtilsAction =
    | { kind: 'opacity'; delta: number }
    | { kind: 'fontSize'; delta: number };

type WheelActionUtilsApi = {
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => WheelActionUtilsAction;
};

/**
 * ホイール入力から操作種別と増減量を判定する。
 * @param deltaY ホイール変化量
 * @param shiftKey Shift 押下状態
 * @returns 操作種別と増減量
 */
function resolveWheelActionFromInput(deltaY: number, shiftKey: boolean): WheelActionUtilsAction {
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

const wheelActionUtilsApi: WheelActionUtilsApi = {
    resolveWheelAction: resolveWheelActionFromInput,
};

const wheelActionUtilsRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    wheelActionUtils?: WheelActionUtilsApi;
};
wheelActionUtilsRoot.wheelActionUtils = wheelActionUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = wheelActionUtilsApi;
}
