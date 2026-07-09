((): void => {
type MessageRendererElectronAPI = {
    onUpdateMessageText: (callback: (text: string) => void) => void;
    setMessageWindowBounds: (bounds: MessageWindowBounds) => void;
};
type MessageWindowBounds = import('../shared/main-renderer-types').MessageWindowBounds;
type MessageLogicApi = {
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (
        deltaY: number,
        shiftKey: boolean
    ) => { kind: 'fontSize' | 'opacity'; delta: number };
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
    renderClockNotation: (html: string, date: Date) => string;
};
type ParseNumberUtilsApi = import('../shared/parse-number-utils-types').ParseNumberUtilsApi;
type LocalStorageStoreApi = import('../shared/local-storage-store-types').LocalStorageStoreApi;
type MessageRendererApiResolverBootstrapApi = import('../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;

const rendererApiResolverUtils = ((): import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverBootstrap?: MessageRendererApiResolverBootstrapApi;
    };
    if (root.rendererApiResolverBootstrap) {
        return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('./api-resolver-access');
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('./api-resolver-utils') as MessageRendererApiResolverBootstrapApi).getRendererApiResolverUtils('./api-resolver-access');
    }
    throw new Error('rendererApiResolverBootstrap API is not available');
})();

const electronAPI = rendererApiResolverUtils.resolveGlobal<MessageRendererElectronAPI>('electronAPI');
const messageLogic = rendererApiResolverUtils.resolveApi<MessageLogicApi>('messageLogic', './message-logic');
const parseNumberUtils = rendererApiResolverUtils.resolveApi<ParseNumberUtilsApi>('parseNumberUtils', './parse-number-utils');
const localStorageStore = rendererApiResolverUtils.resolveGlobal<LocalStorageStoreApi>('localStorageStore');
const messageContent = document.getElementById('messageContent') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const storedFontSize = localStorageStore.getString('messageFontSize', '');
const storedOpacity = localStorageStore.getString('messageWindowOpacity', '');
const messageWindowBoundsKey = 'messageWindowBounds';

let currentFontSize = messageLogic.normalizeNumber(parseNumberUtils.parseIntOrFallback(storedFontSize, 64), 64, 10, 1000);
let currentOpacity = messageLogic.normalizeNumber(parseNumberUtils.parseFloatOrFallback(storedOpacity, 0.8), 0.8, 0.1, 1.0);
let currentMessageHtml = '';
let clockUpdateTimer: ReturnType<typeof setInterval> | null = null;
let lastSavedBoundsText = '';

/**
 * メッセージウィンドウの位置とサイズとして使える値か判定する。
 * @param value 判定対象
 * @returns 利用可能な場合は true
 */
function isMessageWindowBounds(value: unknown): value is MessageWindowBounds {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const bounds = value as MessageWindowBounds;
    return Number.isFinite(bounds.x)
        && Number.isFinite(bounds.y)
        && Number.isFinite(bounds.width)
        && Number.isFinite(bounds.height)
        && bounds.width >= 100
        && bounds.height >= 50;
}

/**
 * 現在のメッセージウィンドウ位置とサイズを取得する。
 * @returns 現在の位置とサイズ
 */
function getCurrentMessageWindowBounds(): MessageWindowBounds {
    return {
        x: Math.round(window.screenX),
        y: Math.round(window.screenY),
        width: Math.round(window.outerWidth),
        height: Math.round(window.outerHeight),
    };
}

/**
 * 保存済みのメッセージウィンドウ位置とサイズを復元する。
 */
function restoreMessageWindowBounds(): void {
    const storedBounds = localStorageStore.getJsonValue<unknown>(messageWindowBoundsKey, null);
    if (!isMessageWindowBounds(storedBounds)) {
        return;
    }
    lastSavedBoundsText = JSON.stringify(storedBounds);
    electronAPI.setMessageWindowBounds(storedBounds);
}

/**
 * メッセージウィンドウの現在位置とサイズを保存する。
 */
function saveMessageWindowBounds(): void {
    const bounds = getCurrentMessageWindowBounds();
    if (!isMessageWindowBounds(bounds)) {
        return;
    }

    const boundsText = JSON.stringify(bounds);
    if (boundsText === lastSavedBoundsText) {
        return;
    }

    lastSavedBoundsText = boundsText;
    localStorageStore.setJsonValue(messageWindowBoundsKey, bounds);
}

/**
 * メッセージ内に時計記法が含まれているか判定する。
 * @param html メッセージHTML
 * @returns 時計記法があれば true
 */
function hasClockNotation(html: string): boolean {
    return /\{\{clock(?:\s+[^{}]*)?\}\}/i.test(html);
}

/**
 * メッセージ本文を描画する。
 */
function renderMessageContent(): void {
    if (!messageContent) {
        return;
    }
    messageContent.innerHTML = messageLogic.renderClockNotation(currentMessageHtml, new Date());
}

/**
 * 時計記法の更新タイマーを現在の本文に合わせて更新する。
 */
function updateClockTimerState(): void {
    if (clockUpdateTimer) {
        clearInterval(clockUpdateTimer);
        clockUpdateTimer = null;
    }
    if (!hasClockNotation(currentMessageHtml)) {
        return;
    }
    clockUpdateTimer = setInterval((): void => {
        renderMessageContent();
    }, 1000);
}

/**
 * メッセージのフォントサイズを更新する。
 * @param delta 増減量
 */
function updateFontSize(delta: number): void {
    currentFontSize = messageLogic.normalizeNumber(currentFontSize + delta, 64, 10, 1000);
    
    // console.log(`[MessageRenderer] Updating font size to: ${currentFontSize}px (delta: ${delta})`);
    
    if (messageContent) {
        messageContent.style.fontSize = `${currentFontSize}px`;
    }
    localStorageStore.setString('messageFontSize', String(currentFontSize));
}

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
function updateTransparency(delta: number): void {
    currentOpacity = messageLogic.normalizeNumber(currentOpacity + delta, 0.8, 0.1, 1.0);

    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
    localStorageStore.setString('messageWindowOpacity', String(currentOpacity));
}

// 初期フォントサイズを反映
if (messageContent) {
    messageContent.style.fontSize = `${currentFontSize}px`;
}

// 初期の背景透明度を反映
document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;

restoreMessageWindowBounds();
setInterval(saveMessageWindowBounds, 500);
window.addEventListener('resize', saveMessageWindowBounds);
window.addEventListener('beforeunload', saveMessageWindowBounds);

window.addEventListener('wheel', (e: WheelEvent): void => {
    if (messageLogic.isWheelTargetInZone(e.target as Node | null, wheelZone)) {
        e.preventDefault(); // 既定のスクロール動作を抑止
        const action = messageLogic.resolveWheelAction(e.deltaY, e.shiftKey);
        if (action.kind === 'opacity') {
            updateTransparency(action.delta);
            return;
        }
        updateFontSize(action.delta);
    }
});

electronAPI.onUpdateMessageText((text: string): void => {
    // console.log(`[MessageRenderer] Received text: ${text}`);
    currentMessageHtml = text || '';
    renderMessageContent();
    updateClockTimerState();
});

// console.log('[MessageRenderer] Initialized.');
})();
