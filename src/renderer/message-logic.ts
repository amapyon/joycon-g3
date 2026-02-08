type MessageWheelActionShared = import('../shared/wheel-action-types').WheelAction;

type MessageLogicApi = {
    normalizeFontSize: (value: number, fallback: number, min: number, max: number) => number;
    normalizeOpacity: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => MessageWheelActionShared;
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
};

type MessageNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

type MessageApiResolverAccessApi = import('../shared/renderer-api-resolver-types').RendererApiResolverAccessApi;

const messageApiResolverUtils = ((): import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverAccess?: MessageApiResolverAccessApi;
    };
    if (root.rendererApiResolverAccess) {
        return root.rendererApiResolverAccess.getRendererApiResolverUtils();
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('./api-resolver-access') as MessageApiResolverAccessApi).getRendererApiResolverUtils();
    }
    throw new Error('rendererApiResolverAccess API is not available');
})();

const messageWheelActionUtilsApi = messageApiResolverUtils.resolveApi<import('../shared/wheel-action-types').WheelActionUtilsApi>('wheelActionUtils', './wheel-action-utils');
const messageNumberUtilsApi: MessageNumberUtilsApi = messageApiResolverUtils.resolveApi<MessageNumberUtilsApi>('numberUtils', './number-utils');

/**
 * フォントサイズを範囲内に正規化する。
 * @param value 値
 * @param fallback 既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化後の値
 */
function normalizeFontSize(value: number, fallback: number, min: number, max: number): number {
    return messageNumberUtilsApi.normalizeNumber(value, fallback, min, max);
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
    return messageNumberUtilsApi.normalizeNumber(value, fallback, min, max);
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
    resolveWheelAction: messageWheelActionUtilsApi.resolveWheelAction,
    isWheelTargetInZone,
};

const messageLogicRoot = globalThis as typeof globalThis & {
    messageLogic?: MessageLogicApi;
};
messageLogicRoot.messageLogic = messageLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = messageLogicApi;
}
