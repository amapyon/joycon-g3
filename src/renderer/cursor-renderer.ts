// cursor-renderer.ts
// Joy-Con姿勢データでカーソルを制御するレンダラースクリプト

((): void => {
type CursorId = 'cursorLeft' | 'cursorRight';

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
    lastExternalUpdate: number;
}

type CursorMapConfig = { [key in CursorId]: { xSign: number; ySign: number } };
type UpdatePointerData = { id: CursorId; x: number; y: number };
type JoyConAttitudeData = { id: CursorId; roll: number; pitch: number; yaw?: number };
type ButtonStateData = { pressed: boolean };
type ButtonPressData = { id: CursorId };
type PointerTarget = { x: number; y: number };
type CursorRendererElectronAPI = {
    onUpdatePointer: (callback: (pos: UpdatePointerData) => void) => void;
    onJoyConAttitude: (callback: (data: JoyConAttitudeData) => void) => void;
    onJoyConButtonX: (callback: (data: ButtonStateData) => void) => void;
    onJoyConButtonDown: (callback: (data: ButtonStateData) => void) => void;
    onJoyConButtonXPressed: (callback: (data: ButtonPressData) => void) => void;
    onJoyConButtonDownPressed: (callback: (data: ButtonPressData) => void) => void;
    sendCursorVisibilityUpdate: (id: CursorId, isVisible: boolean) => void;
    sendCursorMapConfig: (config: CursorMapConfig) => void;
    send?: (channel: string, ...args: unknown[]) => void;
};
type WindowWithIpcRenderer = Window & { ipcRenderer?: { send: (channel: string, ...args: unknown[]) => void } };

const electronAPI = (window as unknown as { electronAPI: CursorRendererElectronAPI }).electronAPI;
const CURSOR_IDS: ReadonlyArray<CursorId> = ['cursorLeft', 'cursorRight'];

// カーソルDOM要素の参照
const cursorElements: Record<CursorId, HTMLElement | null> = {
    cursorLeft: document.getElementById('cursorLeft'), // 左JoyCon
    cursorRight: document.getElementById('cursorRight'), // 右JoyCon
};
// ウィンドウサイズの管理
let windowWidth: number = window.innerWidth;
let windowHeight: number = window.innerHeight;

// 感度・スムージングのデフォルト値
const defaultSensitivityX = 36;
const defaultSensitivityY = 36;
const defaultSmoothingFactor = 0.7;

// カーソルごとの状態管理
const cursors: Record<CursorId, CursorData> = {
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
        lastExternalUpdate: 0,
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
        lastExternalUpdate: 0,
    },
};

// --- main.tsから参照できるように符号情報をglobalThisにエクスポート ---
const cursorMapConfig: CursorMapConfig = {
    cursorLeft: { xSign: cursors.cursorLeft.map.xSign, ySign: cursors.cursorLeft.map.ySign },
    cursorRight: { xSign: cursors.cursorRight.map.xSign, ySign: cursors.cursorRight.map.ySign },
};
const globalConfigTarget = globalThis as typeof globalThis & { cursorMapConfig?: CursorMapConfig };
globalConfigTarget.cursorMapConfig = cursorMapConfig;

// --- update-pointerイベント受信: main.tsからの座標でidごとにポインターを動かす ---
electronAPI.onUpdatePointer((pos: UpdatePointerData): void => {
    const cursorId = pos.id;
    const cursorData = cursors[cursorId];
    if (!cursorData) return;

    if (cursorData.isVisible) {
        cursorData.lastExternalUpdate = performance.now();
        cursorData.targetX = pos.x;
        cursorData.targetY = pos.y;
        cursorData.isVisible = true;
        const el = cursorElements[cursorId];
        if (el) {
            el.style.visibility = 'visible';
        }
    }
});

/**
 * カーソルを画面中央にリセットする。
 * @param cursorId 対象カーソル ID
 */
function resetCursor(cursorId: 'cursorLeft' | 'cursorRight'): void {
    // console.log(`[cursor-renderer] resetCursor called for ${cursorId}`); // 追加ログ
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        // console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
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
        // console.error(`[${cursorId}] Cannot reset cursor: Invalid window dimensions! w=${windowWidth}, h=${windowHeight}. Using default position.`);
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
        // console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100;
        cursorData.y = 100;
    }
    updateCursorElementPosition(cursorId);
}

/**
 * カーソル要素の表示状態を切り替える。
 * @param cursorId 対象カーソル ID
 * @param isVisible 表示状態
 */
function setElementVisibility(cursorId: CursorId, isVisible: boolean): void {
    const element = cursorElements[cursorId];
    if (!element) {
        return;
    }
    element.style.visibility = isVisible ? 'visible' : 'hidden';
}

/**
 * カーソルを表示化する際に保留座標を復元する。
 * @param cursorId 対象カーソル ID
 */
function restorePendingPosition(cursorId: CursorId): void {
    const cursorData = cursors[cursorId];
    if (cursorData.pendingX === null || cursorData.pendingY === null) {
        return;
    }
    cursorData.targetX = cursorData.pendingX;
    cursorData.targetY = cursorData.pendingY;
    cursorData.x = cursorData.pendingX;
    cursorData.y = cursorData.pendingY;
    cursorData.pendingX = null;
    cursorData.pendingY = null;
    updateCursorElementPosition(cursorId);
}

/**
 * カーソルを非表示化する際に現在座標を保留する。
 * @param cursorId 対象カーソル ID
 */
function storePendingPosition(cursorId: CursorId): void {
    const cursorData = cursors[cursorId];
    if (cursorData.pendingX !== null) {
        return;
    }
    cursorData.pendingX = Math.round(cursorData.x);
    cursorData.pendingY = Math.round(cursorData.y);
}

/**
 * カーソルの表示状態遷移を適用し、必要な副作用をまとめて実行する。
 * @param cursorId 対象カーソル ID
 * @param shouldBeVisible 目標表示状態
 */
function applyCursorVisibility(cursorId: CursorId, shouldBeVisible: boolean): void {
    const cursorData = cursors[cursorId];
    if (shouldBeVisible === cursorData.isVisible) {
        return;
    }
    if (shouldBeVisible) {
        setElementVisibility(cursorId, true);
        cursorData.isVisible = true;
        restorePendingPosition(cursorId);
        electronAPI.sendCursorVisibilityUpdate(cursorId, true);
        return;
    }
    setElementVisibility(cursorId, false);
    cursorData.isVisible = false;
    storePendingPosition(cursorId);
    electronAPI.sendCursorVisibilityUpdate(cursorId, false);
}

/**
 * カーソル入力が有効な状態か判定する。
 * @param cursorId 対象カーソル ID
 * @returns 入力が有効なら true
 */
function isCursorInputEnabled(cursorId: CursorId): boolean {
    return cursorId === 'cursorRight' ? isRightXPressed : isLeftDownPressed;
}

/**
 * 姿勢値から目標座標を算出する。
 * @param cursorData カーソル状態
 * @param roll ロール値
 * @param pitch ピッチ値
 * @returns 目標座標
 */
function calculateTargetFromAttitude(cursorData: CursorData, roll: number, pitch: number): PointerTarget {
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    const mapping = cursorData.map;
    const sourceX = mapping.xFrom === 'pitch' ? pitch : roll;
    const sourceY = mapping.yFrom === 'pitch' ? pitch : roll;
    return {
        x: centerX + sourceX * cursorData.sensitivityX * mapping.xSign,
        y: centerY + sourceY * cursorData.sensitivityY * mapping.ySign,
    };
}

/**
 * カーソル DOM 要素の位置を更新する。
 * @param cursorId 対象カーソル ID
 */
function updateCursorElementPosition(cursorId: CursorId): void {
    const cursorData = cursors[cursorId];
    const element = cursorElements[cursorId];
    if (element && cursorData && !Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
        const halfWidth = element.offsetWidth / 2;
        const halfHeight = element.offsetHeight / 2;
        if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
            element.style.left = `${cursorData.x - halfWidth}px`;
            element.style.top = `${cursorData.y - halfHeight}px`;
            // debug render logs removed
        } else {
            // console.warn(`[${cursorId}] Invalid element dimensions.`);
        }
    } else {
        // console.warn(`[${cursorId}] Skipping pos update.`);
    }
}

// --- ポインター表示状態管理 ---
let isRightXPressed = false;
let isLeftDownPressed = false;


// Joy-Conの姿勢データ受信時の処理
electronAPI.onJoyConAttitude((data: JoyConAttitudeData): void => {
    const cursorId = data.id;
    // 右はXボタン押下中、左はDownボタン押下中のみ反映
    if (!isCursorInputEnabled(cursorId)) {
        return;
    }
    const cursorData = cursors[cursorId];
    if (!cursorData) return;
    if (performance.now() - cursorData.lastExternalUpdate < 250) {
        return;
    }

    const target = calculateTargetFromAttitude(cursorData, data.roll, data.pitch);
    cursorData.targetX = target.x;
    cursorData.targetY = target.y;
});

// Joy-Con Xボタンの押下/離上イベント（右JoyCon）
electronAPI.onJoyConButtonX((data: ButtonStateData): void => {
    isRightXPressed = data.pressed;
    updatePointerVisibility();
});

// Joy-Con Downボタンの押下/離上イベント（左JoyCon）
electronAPI.onJoyConButtonDown((data: ButtonStateData): void => {
    isLeftDownPressed = data.pressed;
    updatePointerVisibility();
});

/**
 * ポインター表示状態を一括制御する。
 */
function updatePointerVisibility(): void {
    applyCursorVisibility('cursorRight', isRightXPressed);
    applyCursorVisibility('cursorLeft', isLeftDownPressed);
}

// Joy-Con Xボタン押下時のカーソルリセット（右）
electronAPI.onJoyConButtonXPressed((data: ButtonPressData): void => {
    void data;
    // console.log(`X Button press trigger for ${data.id}. Resetting.`);
    // resetCursor(data.id); // Removed resetCursor call
});

// Joy-Con Downボタン押下時のカーソルリセット（左）
electronAPI.onJoyConButtonDownPressed((data: ButtonPressData): void => {
    void data;
    // console.log(`Down Button press trigger for ${data.id}. Resetting.`);
    // resetCursor(data.id); // Removed resetCursor call
});

// ウィンドウリサイズ時の処理
window.addEventListener('resize', (): void => {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    // console.log(`Cursor window resized to: ${windowWidth}x${windowHeight}`);
    resetCursor('cursorLeft');
    resetCursor('cursorRight');
});

/**
 * カーソルの描画ループを実行する。
 */
function renderLoop(): void {
    if (typeof windowWidth !== 'number' || typeof windowHeight !== 'number' || windowWidth <= 0 || windowHeight <= 0) {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        requestAnimationFrame(renderLoop);
        return;
    }
    for (const id of CURSOR_IDS) {
        const cursorData = cursors[id];
        const element = cursorElements[id];
        if (element && cursorData.isVisible) {
            const smoothing = cursorData.smoothing || 0.1;
            cursorData.x += (cursorData.targetX - cursorData.x) * smoothing;
            cursorData.y += (cursorData.targetY - cursorData.y) * smoothing;
            const halfWidth = element.offsetWidth / 2;
            const halfHeight = element.offsetHeight / 2;
            if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
                if (!Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
                    cursorData.x = Math.max(halfWidth, Math.min(windowWidth - halfWidth, cursorData.x));
                    cursorData.y = Math.max(halfHeight, Math.min(windowHeight - halfHeight, cursorData.y));
                    updateCursorElementPosition(id);
                } else {
                    // console.error(`[${id}] Skipping pos update due to NaN coord.`);
                }
            }
        }
    }
    requestAnimationFrame(renderLoop);
}

// DOMロード完了時の初期化処理
document.addEventListener('DOMContentLoaded', (): void => {
    // console.log('DOM fully loaded. [cursor-renderer] script initialized.');
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursorLeft');
        resetCursor('cursorRight');
    } else {
        // console.warn('Initial window dimensions invalid. Retrying reset later.');
    }
    if (cursorElements.cursorLeft) {
        cursorElements.cursorLeft.style.visibility = 'hidden';
    }
    if (cursorElements.cursorRight) {
        cursorElements.cursorRight.style.visibility = 'hidden';
    }
    // --- IPCでcursorMapConfigをmainプロセスへ送信（確実に送るためリトライ付き） ---
    /**
     * カーソルマップ設定をリトライ付きで送信する。
     * @param retry リトライ回数
     */
    function sendCursorMapConfigWithRetry(retry: number = 0): void {
        if (electronAPI.sendCursorMapConfig) {
            electronAPI.sendCursorMapConfig(cursorMapConfig);
            // console.log('[cursor-renderer] Sent cursorMapConfig to main:', cursorMapConfig, `(retry=${retry})`);
        } else if (electronAPI.send) {
            electronAPI.send('cursor-map-config', cursorMapConfig);
            // console.log('[cursor-renderer] Sent cursorMapConfig to main (fallback):', cursorMapConfig, `(retry=${retry})`);
        } else {
            const windowWithIpc = window as WindowWithIpcRenderer;
            if (windowWithIpc.ipcRenderer) {
                windowWithIpc.ipcRenderer.send('cursor-map-config', cursorMapConfig);
                // console.log('[cursor-renderer] Sent cursorMapConfig to main (ipcRenderer):', cursorMapConfig, `(retry=${retry})`);
                return;
            }
            if (retry < 10) {
                setTimeout((): void => sendCursorMapConfigWithRetry(retry + 1), 200);
                // console.warn(`[cursor-renderer] IPC bridge not ready, retrying... (${retry + 1})`);
            } else {
                // console.warn('[cursor-renderer] Could not send cursorMapConfig to main: no IPC method found after retries.');
            }
        }
    }
    sendCursorMapConfigWithRetry();
    requestAnimationFrame(renderLoop);
    // console.log('Cursor Renderer script initialized for attitude control.');
});
})();
