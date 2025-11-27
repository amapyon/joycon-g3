interface Window {
    electronAPI: any;
}

// cursor-renderer.ts
// Joy-Con姿勢データでカーソルを制御するレンダラースクリプト

// カーソルのマッピング設定
interface CursorMap {
    xFrom: 'roll' | 'pitch' | 'yaw';
    yFrom: 'roll' | 'pitch' | 'yaw';
    xSign: number;
    ySign: number;
}

// カーソルの状態データ
interface CursorData {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    sensitivityX: number;
    sensitivityY: number;
    smoothing: number;
    map: CursorMap;
    isVisible: boolean;
    opacity: number;
    blink: boolean;
    pendingX: number | null;
    pendingY: number | null;
}

// カーソルDOM要素の参照
const cursorElements: Record<'cursorLeft' | 'cursorRight', HTMLElement | null> = {
    cursorLeft: document.getElementById('cursorLeft'), // 左JoyCon
    cursorRight: document.getElementById('cursorRight'), // 右JoyCon
};
const countdownTimerElement: HTMLElement | null = document.getElementById('countdownTimer'); // Renamed

let countdownInterval: NodeJS.Timeout | null = null;
let countdownValue: number = 10; // Initial countdown value

// ウィンドウサイズの管理
let windowWidth: number = window.innerWidth;
let windowHeight: number = window.innerHeight;

// 感度・スムージングのデフォルト値
const defaultSensitivityX = 36;
const defaultSensitivityY = 36;
const defaultSmoothingFactor = 0.7;

// cursorRightの最後の位置を保存（再表示時に復元）
let lastCursorRightPosition: { x: number; y: number } | null = null; // This line seems unused and can be removed.

// カーソルごとの状態管理
const cursors: Record<'cursorLeft' | 'cursorRight', CursorData> = {
    cursorLeft: {
        x: windowWidth / 2 || 100,
        y: windowHeight / 2 || 100,
        targetX: windowWidth / 2 || 100,
        targetY: windowHeight / 2 || 100,
        sensitivityX: defaultSensitivityX,
        sensitivityY: defaultSensitivityY,
        smoothing: defaultSmoothingFactor,
        map: { xFrom: 'roll', yFrom: 'pitch', xSign: -1, ySign: -1 },
        isVisible: false,
        opacity: 1,
        blink: true,
        pendingX: null,
        pendingY: null,
    },
    cursorRight: {
        x: windowWidth / 2 || 100,
        y: windowHeight / 2 || 100,
        targetX: windowWidth / 2 || 100,
        targetY: windowHeight / 2 || 100,
        sensitivityX: defaultSensitivityX,
        sensitivityY: defaultSensitivityY,
        smoothing: defaultSmoothingFactor,
        map: { xFrom: 'roll', yFrom: 'pitch', xSign: 1, ySign: -1 },
        isVisible: false,
        opacity: 1,
        blink: true,
        pendingX: null,
        pendingY: null,
    },
};

// --- main.tsから参照できるように符号情報をglobalThisにエクスポート ---
type CursorMapConfig = { [key in 'cursorLeft' | 'cursorRight']: { xSign: number, ySign: number } };
const cursorMapConfig: CursorMapConfig = {
    cursorLeft: { xSign: cursors.cursorLeft.map.xSign, ySign: cursors.cursorLeft.map.ySign },
    cursorRight: { xSign: cursors.cursorRight.map.xSign, ySign: cursors.cursorRight.map.ySign },
};
(globalThis as any).cursorMapConfig = cursorMapConfig;

// --- update-pointerイベント受信: main.tsからの座標でidごとにポインターを動かす ---
window.electronAPI.onUpdatePointer((pos: { id: 'cursorLeft' | 'cursorRight', x: number, y: number }) => {
    const cursorId = pos.id;
    const cursorData = cursors[cursorId];
    if (!cursorData) return;

    if (cursorData.isVisible) {
        cursorData.targetX = pos.x;
        cursorData.targetY = pos.y;
        cursorData.isVisible = true;
        const el = cursorElements[cursorId];
        if (el) {
            el.style.visibility = 'visible';
        }
    }
});

// カーソルを画面中央にリセット
function resetCursor(cursorId: 'cursorLeft' | 'cursorRight') {
    console.log(`[cursor-renderer] resetCursor called for ${cursorId}`); // 追加ログ
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
        return;
    }
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    if (
        typeof windowWidth !== 'number' ||
        typeof windowHeight !== 'number' ||
        Number.isNaN(windowWidth) ||
        Number.isNaN(windowHeight) ||
        windowWidth <= 0 ||
        windowHeight <= 0
    ) {
        console.error(`[${cursorId}] Cannot reset cursor: Invalid window dimensions! w=${windowWidth}, h=${windowHeight}. Using default position.`);
        cursorData.x = 100;
        cursorData.y = 100;
        cursorData.targetX = 100;
        cursorData.targetY = 100;
    } else {
        cursorData.x = centerX;
        cursorData.y = centerY;
        cursorData.targetX = centerX;
        cursorData.targetY = centerY;
    }
    if (Number.isNaN(cursorData.x) || Number.isNaN(cursorData.y)) {
        console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100;
        cursorData.y = 100;
    }
    updateCursorElementPosition(cursorId);
}

// カーソルDOM要素の位置を更新
function updateCursorElementPosition(cursorId: 'cursorLeft' | 'cursorRight') {
    const cursorData = cursors[cursorId];
    const element = cursorElements[cursorId];
    if (element && cursorData && !Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
        const halfWidth = element.offsetWidth / 2;
        const halfHeight = element.offsetHeight / 2;
        if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
            element.style.left = `${cursorData.x - halfWidth}px`;
            element.style.top = `${cursorData.y - halfHeight}px`;
        } else {
            console.warn(`[${cursorId}] Invalid element dimensions.`);
        }
    } else {
        console.warn(`[${cursorId}] Skipping pos update.`);
    }
}

// --- ポインター表示状態管理 ---
let isRightXPressed = false;
let isLeftDownPressed = false;


// Joy-Conの姿勢データ受信時の処理
window.electronAPI.onJoyConAttitude((data: { id: 'cursorLeft' | 'cursorRight'; roll: number; pitch: number; yaw?: number }) => {
    const cursorId = data.id;
    // 右はXボタン押下中、左はDownボタン押下中のみ反映
    if ((cursorId === 'cursorRight' && !isRightXPressed) || (cursorId === 'cursorLeft' && !isLeftDownPressed)) {
        return;
    }
    const cursorData = cursors[cursorId];
    if (!cursorData) return;

    const roll = data.roll;
    const pitch = data.pitch;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    const sensitivityX = cursorData.sensitivityX;
    const sensitivityY = cursorData.sensitivityY;
    const mapping = cursorData.map;
    let targetX = centerX;
    let targetY = centerY;
    if (mapping.xFrom === 'roll') {
        targetX = centerX + roll * sensitivityX * mapping.xSign;
    } else if (mapping.xFrom === 'pitch') {
        targetX = centerX + pitch * sensitivityX * mapping.xSign;
    }
    if (mapping.yFrom === 'roll') {
        targetY = centerY + roll * sensitivityY * mapping.ySign;
    } else if (mapping.yFrom === 'pitch') {
        targetY = centerY + pitch * sensitivityY * mapping.ySign;
    }
    cursorData.targetX = targetX;
    cursorData.targetY = targetY;
});

// Joy-Con Xボタンの押下/離上イベント（右JoyCon）
window.electronAPI.onJoyConButtonX((data: { pressed: boolean }) => {
    isRightXPressed = data.pressed;
    updatePointerVisibility();
});

// Joy-Con Downボタンの押下/離上イベント（左JoyCon）
window.electronAPI.onJoyConButtonDown((data: { pressed: boolean }) => {
    isLeftDownPressed = data.pressed;
    updatePointerVisibility();
});

// ポインター表示状態を一括制御
function updatePointerVisibility() {
    // Right cursor: Visible only when X button is pressed
    const rightVisible = isRightXPressed;
    const cursorRightData = cursors.cursorRight;
    const cursorRightElement = cursorElements.cursorRight;

    if (rightVisible && !cursorRightData.isVisible) { // Becoming visible
        if (cursorRightElement) cursorRightElement.style.visibility = 'visible';
        cursorRightData.isVisible = true;
        if (cursorRightData.pendingX !== null && cursorRightData.pendingY !== null) {
            // Resume from last pending position
            cursorRightData.targetX = cursorRightData.pendingX;
            cursorRightData.targetY = cursorRightData.pendingY;
            cursorRightData.x = cursorRightData.pendingX; // Snap to position immediately
            cursorRightData.y = cursorRightData.pendingY;
            cursorRightData.pendingX = null; // Clear pending position
            cursorRightData.pendingY = null;
            updateCursorElementPosition('cursorRight'); // Update element position immediately
        }
        window.electronAPI.sendCursorVisibilityUpdate('cursorRight', true); // Send update
    } else if (!rightVisible && cursorRightData.isVisible) { // Becoming hidden
        if (cursorRightElement) cursorRightElement.style.visibility = 'hidden';
        cursorRightData.isVisible = false;
        // Store current position as last known if not already pending
        if (cursorRightData.pendingX === null) {
            cursorRightData.pendingX = Math.round(cursorRightData.x); // Round x
            cursorRightData.pendingY = Math.round(cursorRightData.y); // Round y
        }
        window.electronAPI.sendCursorVisibilityUpdate('cursorRight', false); // Send update
    }

    // Left cursor: Visible only when Down button is pressed
    const leftVisible = isLeftDownPressed;
    const cursorLeftData = cursors.cursorLeft;
    const cursorLeftElement = cursorElements.cursorLeft;

    if (leftVisible && !cursorLeftData.isVisible) { // Becoming visible
        if (cursorLeftElement) cursorLeftElement.style.visibility = 'visible';
        cursorLeftData.isVisible = true;
        if (cursorLeftData.pendingX !== null && cursorLeftData.pendingY !== null) {
            // Resume from last pending position
            cursorLeftData.targetX = cursorLeftData.pendingX;
            cursorLeftData.targetY = cursorLeftData.pendingY;
            cursorLeftData.x = cursorLeftData.pendingX; // Snap to position immediately
            cursorLeftData.y = cursorLeftData.pendingY;
            cursorLeftData.pendingX = null; // Clear pending position
            cursorLeftData.pendingY = null;
            updateCursorElementPosition('cursorLeft'); // Update element position immediately
        }
        window.electronAPI.sendCursorVisibilityUpdate('cursorLeft', true); // Send update
    } else if (!leftVisible && cursorLeftData.isVisible) { // Becoming hidden
        if (cursorLeftElement) cursorLeftElement.style.visibility = 'hidden';
        cursorLeftData.isVisible = false;
        // Store current position as last known if not already pending
        if (cursorLeftData.pendingX === null) { // Only store if no pending position exists
            cursorLeftData.pendingX = Math.round(cursorLeftData.x); // Round x
            cursorLeftData.pendingY = Math.round(cursorLeftData.y); // Round y
        }
        window.electronAPI.sendCursorVisibilityUpdate('cursorLeft', false); // Send update
    }
}

// Joy-Con Xボタン押下時のカーソルリセット（右）
window.electronAPI.onJoyConButtonXPressed((data: { id: 'cursorLeft' | 'cursorRight' }) => {
    console.log(`X Button press trigger for ${data.id}. Resetting.`);
    // resetCursor(data.id); // Removed resetCursor call
});

// Joy-Con Downボタン押下時のカーソルリセット（左）
window.electronAPI.onJoyConButtonDownPressed((data: { id: 'cursorLeft' | 'cursorRight' }) => {
    console.log(`Down Button press trigger for ${data.id}. Resetting.`);
    // resetCursor(data.id); // Removed resetCursor call
});

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    console.log(`Cursor window resized to: ${windowWidth}x${windowHeight}`);
    resetCursor('cursorLeft');
    resetCursor('cursorRight');
});

// カーソルの描画ループ
function renderLoop() {
    if (typeof windowWidth !== 'number' || typeof windowHeight !== 'number' || windowWidth <= 0 || windowHeight <= 0) {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        requestAnimationFrame(renderLoop);
        return;
    }
    for (const id in cursors) {
        const cursorData = cursors[id as 'cursorLeft' | 'cursorRight'];
        const element = cursorElements[id as 'cursorLeft' | 'cursorRight'];
        if (element && cursorData.isVisible) {
            const smoothing = cursorData.smoothing || 0.1;
            cursorData.x += (cursorData.targetX - cursorData.x) * smoothing;
            cursorData.y += (cursorData.targetY - cursorData.y) * smoothing;

            // Add blinking effect
            if (cursorData.blink) {
                const time = Date.now() / 100; // Blinking speed
                cursorData.opacity = (Math.sin(time) + 1) / 2 * 0.9 + 0.1; // Opacity from 0.1 to 1.0
                element.style.opacity = String(cursorData.opacity);
            } else {
                element.style.opacity = '1';
            }

            const halfWidth = element.offsetWidth / 2;
            const halfHeight = element.offsetHeight / 2;
            if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
                if (!Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
                    cursorData.x = Math.max(halfWidth, Math.min(windowWidth - halfWidth, cursorData.x));
                    cursorData.y = Math.max(halfHeight, Math.min(windowHeight - halfHeight, cursorData.y));
                    updateCursorElementPosition(id as 'cursorLeft' | 'cursorRight');
                } else {
                    console.error(`[${id}] Skipping pos update due to NaN coord.`);
                }
            }
        }
    }
    requestAnimationFrame(renderLoop);
}

// DOMロード完了時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. [cursor-renderer] script initialized.');
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursorLeft');
        resetCursor('cursorRight');
    } else {
        console.warn('Initial window dimensions invalid. Retrying reset later.');
    }
    if (cursorElements.cursorLeft) {
        cursorElements.cursorLeft.style.visibility = 'hidden';
    }
    if (cursorElements.cursorRight) {
        cursorElements.cursorRight.style.visibility = 'hidden';
    }
    // Listen for '+' button pressed event
    window.electronAPI.onJoyConButtonPlusPressed(() => {
        console.log('[CursorRenderer] Received button-plus-pressed IPC event.');
        if (countdownTimerElement) {
            if (countdownInterval) {
                // If timer is running, stop it and hide
                clearInterval(countdownInterval);
                countdownInterval = null;
                countdownTimerElement.style.visibility = 'hidden';
                countdownValue = 10; // Reset value
                countdownTimerElement.textContent = String(countdownValue); // Reset text
                console.log('[CursorRenderer] Countdown stopped and hidden.');
            } else {
                // If timer is not running, start it
                countdownTimerElement.style.visibility = 'visible';
                countdownValue = 10;
                countdownTimerElement.textContent = String(countdownValue);
                console.log('[CursorRenderer] Countdown started.');

                countdownInterval = setInterval(() => {
                    countdownValue--;
                    if (countdownValue > 0) {
                        countdownTimerElement.textContent = String(countdownValue);
                        console.log(`[CursorRenderer] Countdown: ${countdownValue}`);
                    } else {
                        clearInterval(countdownInterval!);
                        countdownInterval = null;
                        countdownTimerElement.style.visibility = 'hidden';
                        countdownValue = 10; // Reset for next time
                        countdownTimerElement.textContent = String(countdownValue); // Reset text
                        console.log('[CursorRenderer] Countdown finished and hidden.');
                    }
                }, 1000);
            }
        } else {
            console.error('[CursorRenderer] countdownTimerElement not found!');
        }
    });
    // --- IPCでcursorMapConfigをmainプロセスへ送信（確実に送るためリトライ付き） ---
    function sendCursorMapConfigWithRetry(retry = 0) {
        if (window.electronAPI && window.electronAPI.sendCursorMapConfig) {
            window.electronAPI.sendCursorMapConfig(cursorMapConfig);
            console.log('[cursor-renderer] Sent cursorMapConfig to main:', cursorMapConfig, `(retry=${retry})`);
        } else if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('cursor-map-config', cursorMapConfig);
            console.log('[cursor-renderer] Sent cursorMapConfig to main (fallback):', cursorMapConfig, `(retry=${retry})`);
        } else if ((window as any).ipcRenderer) {
            (window as any).ipcRenderer.send('cursor-map-config', cursorMapConfig);
            console.log('[cursor-renderer] Sent cursorMapConfig to main (ipcRenderer):', cursorMapConfig, `(retry=${retry})`);
        } else {
            if (retry < 10) {
                setTimeout(() => sendCursorMapConfigWithRetry(retry + 1), 200);
                console.warn(`[cursor-renderer] IPC bridge not ready, retrying... (${retry + 1})`);
            } else {
                console.warn('[cursor-renderer] Could not send cursorMapConfig to main: no IPC method found after retries.');
            }
        }
    }
    sendCursorMapConfigWithRetry();
    requestAnimationFrame(renderLoop);
    console.log('Cursor Renderer script initialized for attitude control.');
});