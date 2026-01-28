export {};

type ElectronAPI = {
    onUpdateMessageText: (callback: (text: string) => void) => void;
};

const electronAPI = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
const messageContent = document.getElementById('messageContent') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const storedFontSize = localStorage.getItem('messageFontSize');
const storedOpacity = localStorage.getItem('messageWindowOpacity');

let currentFontSize = storedFontSize ? Number.parseInt(storedFontSize, 10) : 64;
let currentOpacity = storedOpacity ? Number.parseFloat(storedOpacity) : 0.8; // Initial default opacity

/**
 * メッセージのフォントサイズを更新する。
 * @param delta 増減量
 */
function updateFontSize(delta: number) {
    currentFontSize += delta;
    if (currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 1000) currentFontSize = 1000;
    
    console.log(`[MessageRenderer] Updating font size to: ${currentFontSize}px (delta: ${delta})`);
    
    if (messageContent) {
        messageContent.style.fontSize = `${currentFontSize}px`;
    }
    localStorage.setItem('messageFontSize', String(currentFontSize));
}

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
function updateTransparency(delta: number) {
    currentOpacity += delta;
    if (currentOpacity < 0.1) currentOpacity = 0.1; // Minimum transparency
    if (currentOpacity > 1.0) currentOpacity = 1.0; // Maximum transparency

    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
    localStorage.setItem('messageWindowOpacity', String(currentOpacity));
}

// 初期フォントサイズを反映
if (messageContent) {
    messageContent.style.fontSize = `${currentFontSize}px`;
}

// 初期の背景透明度を反映
document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;

window.addEventListener('wheel', (e: WheelEvent) => {
    if (e.target === wheelZone || wheelZone?.contains(e.target as Node)) {
        e.preventDefault(); // 既定のスクロール動作を抑止

        if (e.shiftKey) {
            // 透明度を調整
            const delta = e.deltaY < 0 ? 0.05 : -0.05; // 上スクロールで不透明、下で透明
            updateTransparency(delta);
        } else {
            // フォントサイズを調整（既存仕様）
            const delta = e.deltaY < 0 ? 5 : -5;
            updateFontSize(delta);
        }
    }
});

electronAPI.onUpdateMessageText((text: string) => {
    console.log(`[MessageRenderer] Received text: ${text}`);
    if (messageContent) {
        messageContent.innerHTML = text || '';
    }
});

console.log('[MessageRenderer] Initialized.');
