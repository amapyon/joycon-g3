((): void => {
type MessageRendererElectronAPI = {
    onUpdateMessageText: (callback: (text: string) => void) => void;
};
type MessageLogicApi = {
    normalizeFontSize: (value: number, fallback: number, min: number, max: number) => number;
    normalizeOpacity: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (
        deltaY: number,
        shiftKey: boolean
    ) => { kind: 'fontSize' | 'opacity'; delta: number };
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
};
type ParseNumberUtilsApi = import('../shared/parse-number-utils-types').ParseNumberUtilsApi;
type LocalStorageStoreApi = import('../shared/local-storage-store-types').LocalStorageStoreApi;
type RendererApiResolverUtilsApi = import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi;
type WindowWithRendererApiResolver = Window & { rendererApiResolverUtils?: RendererApiResolverUtilsApi };

const rendererApiResolverUtils = (window as WindowWithRendererApiResolver).rendererApiResolverUtils;
if (!rendererApiResolverUtils) {
    throw new Error('rendererApiResolverUtils is not available');
}

const electronAPI = rendererApiResolverUtils.resolveGlobal<MessageRendererElectronAPI>('electronAPI');
const messageLogic = rendererApiResolverUtils.resolveApi<MessageLogicApi>('messageLogic', './message-logic');
const parseNumberUtils = rendererApiResolverUtils.resolveApi<ParseNumberUtilsApi>('parseNumberUtils', './parse-number-utils');
const localStorageStore = rendererApiResolverUtils.resolveGlobal<LocalStorageStoreApi>('localStorageStore');
const messageContent = document.getElementById('messageContent') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const storedFontSize = localStorageStore.getString('messageFontSize', '');
const storedOpacity = localStorageStore.getString('messageWindowOpacity', '');

let currentFontSize = messageLogic.normalizeFontSize(parseNumberUtils.parseIntOrFallback(storedFontSize, 64), 64, 10, 1000);
let currentOpacity = messageLogic.normalizeOpacity(parseNumberUtils.parseFloatOrFallback(storedOpacity, 0.8), 0.8, 0.1, 1.0);

/**
 * メッセージのフォントサイズを更新する。
 * @param delta 増減量
 */
function updateFontSize(delta: number): void {
    currentFontSize = messageLogic.normalizeFontSize(currentFontSize + delta, 64, 10, 1000);
    
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
    currentOpacity = messageLogic.normalizeOpacity(currentOpacity + delta, 0.8, 0.1, 1.0);

    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
    localStorageStore.setString('messageWindowOpacity', String(currentOpacity));
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
    if (messageContent) {
        messageContent.innerHTML = text || '';
    }
});

// console.log('[MessageRenderer] Initialized.');
})();
