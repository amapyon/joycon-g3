type SharedCursorRuntimeSendDecision = import('../shared/cursor-types').CursorRuntimeSendDecision;
type SharedCursorRuntimeSendDecisionInput = import('../shared/cursor-types').CursorRuntimeSendDecisionInput;
type SharedCursorResetPosition = import('../shared/cursor-types').CursorResetPosition;
type SharedCursorRuntimeLogicApi = import('../shared/cursor-types').CursorRuntimeLogicApi;

/**
 * ビューポートのサイズが有効か判定する。
 * @param width 幅
 * @param height 高さ
 * @returns 有効な場合 true
 */
function isValidViewport(width: number, height: number): boolean {
    return typeof width === 'number' && typeof height === 'number' && !Number.isNaN(width) && !Number.isNaN(height) && width > 0 && height > 0;
}

/**
 * カーソルリセット時の座標を算出する。
 * @param width 幅
 * @param height 高さ
 * @param fallback フォールバック座標
 * @returns リセット座標
 */
function resolveResetPosition(width: number, height: number, fallback: number): SharedCursorResetPosition {
    if (!isValidViewport(width, height)) {
        return { x: fallback, y: fallback };
    }
    return {
        x: width / 2,
        y: height / 2,
    };
}

/**
 * カーソルマップ送信時の利用経路を決定する。
 * @param input 判定情報
 * @returns 送信手段と次のリトライ回数
 */
function resolveCursorMapSendDecision(
    input: SharedCursorRuntimeSendDecisionInput
): SharedCursorRuntimeSendDecision {
    if (input.hasSendCursorMapConfig) {
        return { method: 'api', nextRetry: null };
    }
    if (input.hasSend) {
        return { method: 'send', nextRetry: null };
    }
    if (input.hasIpcRenderer) {
        return { method: 'ipc', nextRetry: null };
    }
    if (input.retry < input.maxRetry) {
        return { method: 'retry', nextRetry: input.retry + 1 };
    }
    return { method: 'none', nextRetry: null };
}

const cursorRuntimeLogicApi: SharedCursorRuntimeLogicApi = {
    isValidViewport,
    resolveResetPosition,
    resolveCursorMapSendDecision,
};

const cursorRuntimeLogicRoot = globalThis as typeof globalThis & {
    cursorRuntimeLogic?: SharedCursorRuntimeLogicApi;
};
cursorRuntimeLogicRoot.cursorRuntimeLogic = cursorRuntimeLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = cursorRuntimeLogicApi;
}
