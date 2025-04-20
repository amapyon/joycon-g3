// cursor-renderer.js

// --- グローバル変数 ---
const cursorElements = {
    cursor1: document.getElementById('cursor1'), // 左 (L) Joy-Con 対応
    cursor2: document.getElementById('cursor2'), // 右 (R) Joy-Con 対応
};

// ウィンドウサイズ (リサイズに対応するため let で宣言)
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

// --- 設定値 (ユーザー指定の値) ---
const defaultSensitivityX = 36; // 横方向の感度 (ロール角に対して)
const defaultSensitivityY = 36; // 縦方向の感度 (ピッチ角に対して)
const defaultSmoothingFactor = 0.15; // ★スムージング係数 (0 < factor < 1): 小さいほど滑らか(遅い)★
// デッドゾーンと減衰係数は main.js/joycon.js 側で処理 or 不要に

// --- 各カーソルの状態と左右個別の設定 ---
const cursors = {
    cursor1: {
        // 左 Joy-Con (cursor1)
        x: windowWidth / 2 || 100, // 現在位置
        y: windowHeight / 2 || 100, // 現在位置
        targetX: windowWidth / 2 || 100, // ★目標位置★
        targetY: windowHeight / 2 || 100, // ★目標位置★
        sensitivityX: defaultSensitivityX, // 感度
        sensitivityY: defaultSensitivityY, // 感度
        smoothing: defaultSmoothingFactor, // スムージング係数
        // ★軸マッピングと符号 (ロール->X, ピッチ->Y を仮定)★
        // Y軸は下が正なので、上に傾けてPitchが増加するなら符号はマイナスにするなど調整
        map: {
            xFrom: 'roll',
            yFrom: 'pitch',
            xSign: -1,
            ySign: -1,
        },
        isVisible: false,
    },
    cursor2: {
        // 右 Joy-Con (cursor2)
        x: windowWidth / 2 || 100, // 現在位置
        y: windowHeight / 2 || 100, // 現在位置
        targetX: windowWidth / 2 || 100, // ★目標位置★
        targetY: windowHeight / 2 || 100, // ★目標位置★
        sensitivityX: defaultSensitivityX,
        sensitivityY: defaultSensitivityY,
        smoothing: defaultSmoothingFactor,
        map: {
            xFrom: 'roll',
            yFrom: 'pitch',
            xSign: 1,
            ySign: -1, // Rの上下移動反転も維持
        },
        isVisible: false,
    },
};

// --- ヘルパー関数 ---

/** カーソルを指定IDに基づいてウィンドウ中央にリセット (NaNチェック強化済み) */
function resetCursor(cursorId) {
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        // 対象のカーソルデータがなければ処理終了
        console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
        return;
    }
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    // ウィンドウサイズ確認
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
        // ★目標位置もリセット★
        cursorData.x = centerX;
        cursorData.y = centerY;
        cursorData.targetX = centerX;
        cursorData.targetY = centerY;
    }

    // NaNチェック
    if (Number.isNaN(cursorData.x) || Number.isNaN(cursorData.y)) {
        console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100;
        cursorData.y = 100;
    }
    updateCursorElementPosition(cursorId); // 位置を即時反映
}

/** カーソル要素のCSS(left, top)を更新 (NaNチェック強化済み) */
function updateCursorElementPosition(cursorId) {
    const cursorData = cursors[cursorId];
    const element = cursorElements[cursorId];
    // 要素とデータが存在し、座標が有効な数値であることを確認
    if (element && cursorData && !Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
        const halfWidth = element.offsetWidth / 2;
        const halfHeight = element.offsetHeight / 2;
        // 要素サイズも有効か確認
        if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
            // console.log(`Updating element ${cursorId}: left=${(cursorData.x - halfWidth).toFixed(0)}, top=${(cursorData.y - halfHeight).toFixed(0)}`); // デバッグ用
            element.style.left = `${cursorData.x - halfWidth}px`;
            element.style.top = `${cursorData.y - halfHeight}px`;
        } else {
            console.warn(`[${cursorId}] Invalid element dimensions.`);
        }
    } else {
        console.warn(`[${cursorId}] Skipping pos update.`);
    }
}

// --- イベントリスナー ---

/** 姿勢データ(角度)受信 */
window.electronAPI.onJoyConAttitude((data) => {
    const cursorId = data.id;
    const cursorData = cursors[cursorId];
    if (!cursorData) return;

    const roll = data.roll; // 単位: 度
    const pitch = data.pitch; // 単位: 度
    // const yaw = data.yaw; // 必要ならヨーも使う

    // ★角度から目標座標 targetX, targetY を計算★
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    const sensitivityX = cursorData.sensitivityX;
    const sensitivityY = cursorData.sensitivityY;
    const mapping = cursorData.map;

    let targetX = centerX;
    let targetY = centerY;

    // マッピングに基づいて計算 (ロール -> X, ピッチ -> Y と仮定)
    if (mapping.xFrom === 'roll') {
        targetX = centerX + roll * sensitivityX * mapping.xSign;
    } else if (mapping.xFrom === 'pitch') {
        targetX = centerX + pitch * sensitivityX * mapping.xSign;
    }
    // 必要ならヨー軸もマッピング可能

    if (mapping.yFrom === 'roll') {
        targetY = centerY + roll * sensitivityY * mapping.ySign;
    } else if (mapping.yFrom === 'pitch') {
        targetY = centerY + pitch * sensitivityY * mapping.ySign; // Y軸は画面下向きが正
    }

    // 計算結果を保存
    cursorData.targetX = targetX;
    cursorData.targetY = targetY;

    // デバッグ用ログ
    console.log(`[${cursorId}] Target Set: X=${targetX.toFixed(0)}, Y=${targetY.toFixed(0)} (Roll: ${roll.toFixed(1)}, Pitch: ${pitch.toFixed(1)})`);
});

/** JoyCon R Xボタン状態受信 (表示/非表示トグル) */
window.electronAPI.onJoyConButtonX((data) => {
    // console.log("X Button state received:", data.pressed);
    const el = cursorElements.cursor2;
    const cd = cursors.cursor2;
    if (!el || !cd) return;
    cd.isVisible = data.pressed;
    el.style.visibility = cd.isVisible ? 'visible' : 'hidden';
});

/** JoyCon L 下ボタン状態受信 (表示/非表示トグル) */
window.electronAPI.onJoyConButtonDown((data) => {
    // console.log("Down Button state received:", data.pressed);
    const el = cursorElements.cursor1;
    const cd = cursors.cursor1;
    if (!el || !cd) return;
    cd.isVisible = data.pressed;
    el.style.visibility = cd.isVisible ? 'visible' : 'hidden';
});

/** JoyCon R Xボタンが押された瞬間のイベント (リセット) */
window.electronAPI.onJoyConButtonXPressed((data) => {
    console.log(`X Button press trigger for ${data.id}. Resetting.`); // data.id は 'cursor2'
    resetCursor(data.id); // 対応するカーソル(cursor2)をリセット
});

/** JoyCon L 下ボタンが押された瞬間のイベント (リセット) */
window.electronAPI.onJoyConButtonDownPressed((data) => {
    console.log(`Down Button press trigger for ${data.id}. Resetting.`); // data.id は 'cursor1'
    resetCursor(data.id); // 対応するカーソル(cursor1)をリセット
});

/** ウィンドウリサイズイベントに対応 */
window.addEventListener('resize', () => {
    // ウィンドウサイズを更新
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    console.log(`Cursor window resized to: ${windowWidth}x${windowHeight}`);
    // リサイズ時にカーソル位置が範囲外になる可能性があるのでリセット
    resetCursor('cursor1');
    resetCursor('cursor2');
});

// --- 描画ループ (isVisible を考慮) ---
function renderLoop() {
    // ウィンドウサイズが有効か確認
    if (typeof windowWidth !== 'number' || typeof windowHeight !== 'number' || windowWidth <= 0 || windowHeight <= 0) {
        // console.warn("Window dimensions not ready or invalid. Waiting...");
        windowWidth = window.innerWidth; // 再取得試行
        windowHeight = window.innerHeight;
        requestAnimationFrame(renderLoop); // 次のフレームを待つ
        return;
    }

    for (const id in cursors) {
        const cursorData = cursors[id];
        const element = cursorElements[id];

        // ★isVisibleがtrueの場合のみ座標更新と描画を行う★
        if (element && cursorData.isVisible) {
            // --- ★スムージング (Lerp) で座標を更新★ ---
            // 現在位置(x,y)を目標位置(targetX, targetY)に近づける
            // smoothing係数が小さいほど滑らか（追従が遅い）
            const smoothing = cursorData.smoothing || 0.1; // デフォルト値
            cursorData.x += (cursorData.targetX - cursorData.x) * smoothing;
            cursorData.y += (cursorData.targetY - cursorData.y) * smoothing;

            // ウィンドウ境界での制限
            const halfWidth = element.offsetWidth / 2;
            const halfHeight = element.offsetHeight / 2;
            if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
                if (!Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
                    cursorData.x = Math.max(halfWidth, Math.min(windowWidth - halfWidth, cursorData.x));
                    cursorData.y = Math.max(halfHeight, Math.min(windowHeight - halfHeight, cursorData.y));
                    updateCursorElementPosition(id); // 要素位置更新
                } else {
                    console.error(`[${id}] Skipping pos update due to NaN coord.`);
                }
            }
        }
    }
    // 次のフレームで再帰呼び出し
    requestAnimationFrame(renderLoop);
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded.');
    // ウィンドウサイズの再取得と初期リセット
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursor1');
        resetCursor('cursor2');
    } else {
        console.warn('Initial window dimensions invalid. Retrying reset later.');
        // 必要ならタイマーやリサイズイベントで再試行
    }
    // ★初期表示状態を設定 (CSSで設定されている場合、ここは不要な場合もある)★
    if (cursorElements.cursor1) {
        cursorElements.cursor1.style.visibility = 'hidden'; // 左は初期非表示
    }

    if (cursorElements.cursor2) {
        cursorElements.cursor2.style.visibility = 'hidden'; // 右も初期非表示 (Xボタンで表示)
    }

    // 描画ループを開始
    requestAnimationFrame(renderLoop);
    console.log('Cursor Renderer script initialized for attitude control.');
});
