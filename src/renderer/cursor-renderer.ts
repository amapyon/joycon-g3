// cursor-renderer.ts
// Joy-Con姿勢データでカーソルを制御するレンダラースクリプト

{
type CursorId = import('../shared/cursor-types').CursorId;
type SharedCursorLogicApi = import('../shared/cursor-types').CursorLogicApi;
type SharedCursorRuntimeLogicApi = import('../shared/cursor-types').CursorRuntimeLogicApi;
type CursorData = import('./cursor-renderer-types').CursorData;
type CursorMapConfig = import('../shared/cursor-types').CursorMapConfig;
type UpdatePointerData = import('../shared/joycon-event-types').UpdatePointerData;
type JoyConAttitudeData = import('../shared/joycon-event-types').JoyConAttitudeData;
type ButtonStateData = import('../shared/joycon-event-types').JoyConButtonStateData;
type ButtonPressData = import('../shared/joycon-event-types').JoyConCursorIdData;
type CursorRendererApiResolverBootstrapApi = import('../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;
type CursorStateSnapshot = import('./cursor-renderer-types').CursorStateSnapshot;
type CursorRendererElectronAPI = import('./cursor-renderer-types').CursorRendererElectronAPI;
type WindowWithIpcRenderer = Window & { ipcRenderer?: { send: (channel: string, ...args: unknown[]) => void } };

const rendererApiResolverUtils = ((): import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverBootstrap?: CursorRendererApiResolverBootstrapApi;
    };
    if (root.rendererApiResolverBootstrap) {
        return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('./api-resolver-access');
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('./api-resolver-utils') as CursorRendererApiResolverBootstrapApi).getRendererApiResolverUtils('./api-resolver-access');
    }
    throw new Error('rendererApiResolverBootstrap API is not available');
})();

const electronAPI = rendererApiResolverUtils.resolveGlobal<CursorRendererElectronAPI>('electronAPI');
const cursorLogic = rendererApiResolverUtils.resolveApi<SharedCursorLogicApi>('cursorLogic', './cursor-logic');
const cursorRuntimeLogic = rendererApiResolverUtils.resolveApi<SharedCursorRuntimeLogicApi>('cursorRuntimeLogic', './cursor-runtime-logic');
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
const resetCursor = (cursorId: 'cursorLeft' | 'cursorRight'): void => {
    // console.log(`[cursor-renderer] resetCursor called for ${cursorId}`); // 追加ログ
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        // console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
        return;
    }
    const resetPos = cursorRuntimeLogic.resolveResetPosition(windowWidth, windowHeight, 100);
    cursorData.x = resetPos.x;
    cursorData.y = resetPos.y;
    cursorData.targetX = resetPos.x;
    cursorData.targetY = resetPos.y;
    if (Number.isNaN(cursorData.x) || Number.isNaN(cursorData.y)) {
        // console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100;
        cursorData.y = 100;
    }
    updateCursorElementPosition(cursorId);
};

/**
 * カーソル要素の表示状態を切り替える。
 * @param cursorId 対象カーソル ID
 * @param isVisible 表示状態
 */
const setElementVisibility = (cursorId: CursorId, isVisible: boolean): void => {
    const element = cursorElements[cursorId];
    if (!element) {
        return;
    }
    element.style.visibility = isVisible ? 'visible' : 'hidden';
};

/**
 * カーソルの表示状態遷移を適用し、必要な副作用をまとめて実行する。
 * @param cursorId 対象カーソル ID
 * @param shouldBeVisible 目標表示状態
 */
const applyCursorVisibility = (cursorId: CursorId, shouldBeVisible: boolean): void => {
    const cursorData = cursors[cursorId];
    const transition = cursorLogic.decideVisibilityTransition(cursorData, shouldBeVisible);
    if (!transition.changed) {
        return;
    }

    cursorData.isVisible = transition.nextIsVisible;
    cursorData.pendingX = transition.nextPendingX;
    cursorData.pendingY = transition.nextPendingY;

    if (transition.nextIsVisible) {
        setElementVisibility(cursorId, true);
        if (transition.restoreX !== null && transition.restoreY !== null) {
            cursorData.targetX = transition.restoreX;
            cursorData.targetY = transition.restoreY;
            cursorData.x = transition.restoreX;
            cursorData.y = transition.restoreY;
            updateCursorElementPosition(cursorId);
        }
        electronAPI.sendCursorVisibilityUpdate(cursorId, true);
        return;
    }

    setElementVisibility(cursorId, false);
    electronAPI.sendCursorVisibilityUpdate(cursorId, false);
};

/**
 * カーソル入力が有効な状態か判定する。
 * @param cursorId 対象カーソル ID
 * @returns 入力が有効なら true
 */
const isCursorInputEnabled = (cursorId: CursorId): boolean => {
    return cursorId === 'cursorRight' ? isRightXPressed : isLeftDownPressed;
};

/**
 * ロジック計算用にカーソル状態を抽出する。
 * @param cursorId 対象カーソル ID
 * @returns ロジック計算用スナップショット
 */
const toCursorStateSnapshot = (cursorId: CursorId): CursorStateSnapshot => {
    const cursorData = cursors[cursorId];
    return {
        x: cursorData.x,
        y: cursorData.y,
        sensitivityX: cursorData.sensitivityX,
        sensitivityY: cursorData.sensitivityY,
        map: cursorData.map,
        isVisible: cursorData.isVisible,
        pendingX: cursorData.pendingX,
        pendingY: cursorData.pendingY,
    };
};

/**
 * カーソル DOM 要素の位置を更新する。
 * @param cursorId 対象カーソル ID
 */
const updateCursorElementPosition = (cursorId: CursorId): void => {
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
};

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

    const target = cursorLogic.calculateTargetFromAttitude(
        toCursorStateSnapshot(cursorId),
        { roll: data.roll, pitch: data.pitch, yaw: data.yaw },
        windowWidth,
        windowHeight
    );
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
const updatePointerVisibility = (): void => {
    applyCursorVisibility('cursorRight', isRightXPressed);
    applyCursorVisibility('cursorLeft', isLeftDownPressed);
};

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
const getCursorElementHalfSize = (element: HTMLElement): { halfWidth: number; halfHeight: number } | null => {
    const halfWidth = element.offsetWidth / 2;
    const halfHeight = element.offsetHeight / 2;
    if (Number.isNaN(halfWidth) || Number.isNaN(halfHeight) || halfWidth < 0 || halfHeight < 0) {
        return null;
    }
    return { halfWidth, halfHeight };
};

const hasValidCursorCoordinates = (cursorData: CursorData): boolean => {
    return !Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y);
};

const applyCursorSmoothing = (cursorData: CursorData): void => {
    const smoothing = cursorData.smoothing || 0.1;
    cursorData.x += (cursorData.targetX - cursorData.x) * smoothing;
    cursorData.y += (cursorData.targetY - cursorData.y) * smoothing;
};

const updateVisibleCursorPosition = (id: CursorId): void => {
    const cursorData = cursors[id];
    const element = cursorElements[id];
    if (!element || !cursorData.isVisible) {
        return;
    }
    applyCursorSmoothing(cursorData);
    const halfSize = getCursorElementHalfSize(element);
    if (!halfSize || !hasValidCursorCoordinates(cursorData)) {
        return;
    }
    const clamped = cursorLogic.clampToViewport({
        x: cursorData.x,
        y: cursorData.y,
        viewportWidth: windowWidth,
        viewportHeight: windowHeight,
        halfWidth: halfSize.halfWidth,
        halfHeight: halfSize.halfHeight,
    });
    cursorData.x = clamped.x;
    cursorData.y = clamped.y;
    updateCursorElementPosition(id);
};

const renderLoop = (): void => {
    if (!cursorRuntimeLogic.isValidViewport(windowWidth, windowHeight)) {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        requestAnimationFrame(renderLoop);
        return;
    }
    for (const id of CURSOR_IDS) {
        updateVisibleCursorPosition(id);
    }
    requestAnimationFrame(renderLoop);
};

/**
 * カーソルマップ設定をリトライ付きで送信する。
 * @param retry リトライ回数
 */
const sendCursorMapConfigWithRetry = (retry: number = 0): void => {
    const windowWithIpc = window as WindowWithIpcRenderer;
    const sendCursorMapConfig = electronAPI.sendCursorMapConfig;
    const fallbackSend = electronAPI.send;
    const sendDecision = cursorRuntimeLogic.resolveCursorMapSendDecision({
        hasSendCursorMapConfig: !!sendCursorMapConfig,
        hasSend: !!fallbackSend,
        hasIpcRenderer: !!windowWithIpc.ipcRenderer,
        retry,
        maxRetry: 10,
    });
    if (sendDecision.method === 'api') {
        sendCursorMapConfig(cursorMapConfig);
        return;
    }
    if (sendDecision.method === 'send') {
        fallbackSend?.('cursor-map-config', cursorMapConfig);
        return;
    }
    if (sendDecision.method === 'ipc') {
        windowWithIpc.ipcRenderer?.send('cursor-map-config', cursorMapConfig);
        return;
    }
    if (sendDecision.method === 'retry') {
        setTimeout((): void => sendCursorMapConfigWithRetry(sendDecision.nextRetry ?? retry + 1), 200);
    }
};

/**
 * カーソル位置を初期化する。
 */
const initializeCursorPosition = (): void => {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursorLeft');
        resetCursor('cursorRight');
    }
};

/**
 * カーソルの初期表示状態を反映する。
 */
const initializeCursorVisibility = (): void => {
    setElementVisibility('cursorLeft', false);
    setElementVisibility('cursorRight', false);
};

/**
 * DOMロード完了時の初期化処理。
 */
const handleDomContentLoaded = (): void => {
    initializeCursorPosition();
    initializeCursorVisibility();
    sendCursorMapConfigWithRetry();
    requestAnimationFrame(renderLoop);
};

// DOMロード完了時の初期化処理
document.addEventListener('DOMContentLoaded', (): void => {
    handleDomContentLoaded();
});
}
