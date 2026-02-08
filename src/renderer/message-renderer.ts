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
type ParseNumberUtilsApi = {
    parseIntOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseFloatOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseIntOrNull: (raw: string | null | undefined) => number | null;
};

const electronAPI = (window as unknown as { electronAPI: MessageRendererElectronAPI }).electronAPI;
const messageLogic = (window as unknown as { messageLogic: MessageLogicApi }).messageLogic;
const parseNumberUtils = (window as unknown as { parseNumberUtils: ParseNumberUtilsApi }).parseNumberUtils;
const messageContent = document.getElementById('messageContent') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const storedFontSize = localStorage.getItem('messageFontSize');
const storedOpacity = localStorage.getItem('messageWindowOpacity');

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
    localStorage.setItem('messageFontSize', String(currentFontSize));
}

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
function updateTransparency(delta: number): void {
    currentOpacity = messageLogic.normalizeOpacity(currentOpacity + delta, 0.8, 0.1, 1.0);

    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
    localStorage.setItem('messageWindowOpacity', String(currentOpacity));
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
