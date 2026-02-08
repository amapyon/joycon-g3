type MessageWheelAction =
    | {
        kind: 'fontSize';
        delta: number;
    }
    | {
        kind: 'opacity';
        delta: number;
    };

type MessageLogicApi = {
    normalizeFontSize: (value: number, fallback: number, min: number, max: number) => number;
    normalizeOpacity: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => MessageWheelAction;
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
};

/**
 * フォントサイズを範囲内に正規化する。
 * @param value 値
 * @param fallback 既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化後の値
 */
function normalizeFontSize(value: number, fallback: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(Math.max(value, min), max);
}

/**
 * 透明度を範囲内に正規化する。
 * @param value 値
 * @param fallback 既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化後の値
 */
function normalizeOpacity(value: number, fallback: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(Math.max(value, min), max);
}

/**
 * ホイール操作から反映先と増減量を判定する。
 * @param deltaY ホイール変化量
 * @param shiftKey Shift 押下状態
 * @returns 操作種別と増減量
 */
function resolveMessageWheelAction(deltaY: number, shiftKey: boolean): MessageWheelAction {
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

/**
 * ホイールイベントの対象がズーム操作ゾーン内か判定する。
 * @param target イベント対象
 * @param wheelZone ズーム操作ゾーン
 * @returns 対象がゾーン内なら true
 */
function isWheelTargetInZone(target: Node | null, wheelZone: HTMLElement | null): boolean {
    if (!target || !wheelZone) {
        return false;
    }
    return target === wheelZone || wheelZone.contains(target);
}

const messageLogicApi: MessageLogicApi = {
    normalizeFontSize,
    normalizeOpacity,
    resolveWheelAction: resolveMessageWheelAction,
    isWheelTargetInZone,
};

const messageLogicRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    messageLogic?: MessageLogicApi;
};
messageLogicRoot.messageLogic = messageLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = messageLogicApi;
}
