((): void => {
type MessageRendererElectronAPI = {
    onUpdateMessageText: (callback: (text: string) => void) => void;
};
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
type StorageKeys = typeof import('../shared/storage-keys').storageKeys;

/**
 * 保存キー定義を取得する。
 * @returns 保存キー定義
 */
function resolveStorageKeys(): StorageKeys {
    const storageKeys = (globalThis as typeof globalThis & { storageKeys?: StorageKeys }).storageKeys;
    if (!storageKeys) {
        throw new Error('storageKeys is not available');
    }
    return storageKeys;
}

const storageKeys = resolveStorageKeys();

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
const storedFontSize = localStorageStore.getString(storageKeys.messageFontSize, '');
const storedOpacity = localStorageStore.getString(storageKeys.messageWindowOpacity, '');

let currentFontSize = messageLogic.normalizeNumber(parseNumberUtils.parseIntOrFallback(storedFontSize, 64), 64, 10, 1000);
let currentOpacity = messageLogic.normalizeNumber(parseNumberUtils.parseFloatOrFallback(storedOpacity, 0.8), 0.8, 0.1, 1.0);
let currentMessageHtml = '';
let clockUpdateTimer: ReturnType<typeof setInterval> | null = null;

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
    localStorageStore.setString(storageKeys.messageFontSize, String(currentFontSize));
}

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
function updateTransparency(delta: number): void {
    currentOpacity = messageLogic.normalizeNumber(currentOpacity + delta, 0.8, 0.1, 1.0);

    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
    localStorageStore.setString(storageKeys.messageWindowOpacity, String(currentOpacity));
}

// 初期フォントサイズを反映
if (messageContent) {
    messageContent.style.fontSize = `${currentFontSize}px`;
}

// 初期の背景透明度を反映
document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;

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
