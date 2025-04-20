// cursor-renderer.js

// --- グローバル変数 ---
const cursorElements = {
    cursor1: document.getElementById('cursor1'), // 左 (L) Joy-Con 対応
    cursor2: document.getElementById('cursor2')  // 右 (R) Joy-Con 対応
};
// ステータス表示関連は削除済み

// ウィンドウサイズ (リサイズに対応するため let で宣言)
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

// --- 設定値 (ユーザー指定の値) ---
const defaultGyroSensitivity = 10; // ★ ユーザー指定値 (非常に高感度) ★
const defaultDeadzone = 80;        // ★ ユーザー指定値 (より敏感) ★
const defaultDampingFactor = 0.95;   // 速度減衰係数 (1に近いほど慣性が残る)

// --- 各カーソルの状態と左右個別の設定 ---
const cursors = {
    cursor1: { // 左 Joy-Con (cursor1)
        x: windowWidth / 2 || 100, y: windowHeight / 2 || 100, // 初期位置
        dx: 0, dy: 0, // 初期速度
        sensitivity: defaultGyroSensitivity,
        deadzone: defaultDeadzone,
        damping: defaultDampingFactor,
        map: {
            dx: { axis: 'gyroZ', sign: -1 }, // 左右(dx): Z軸, 符号反転
            dy: { axis: 'gyroY', sign: -1 }  // 上下(dy): Y軸, 符号反転
        },
        isVisible: false
    },
    cursor2: { // 右 Joy-Con (cursor2)
        x: windowWidth / 2 || 100, y: windowHeight / 2 || 100, // 初期位置
        dx: 0, dy: 0, // 初期速度
        sensitivity: defaultGyroSensitivity, // 必要なら左右で値を変更
        deadzone: defaultDeadzone,
        damping: defaultDampingFactor,
        map: {
            dx: { axis: 'gyroZ', sign: 1 },   // 左右(dx): Z軸, 符号そのまま
            dy: { axis: 'gyroY', sign: -1 }  // 上下(dy): Y軸, 符号反転
        },
        isVisible: false
    }
};

// --- ヘルパー関数 ---

/** カーソルを指定IDに基づいてウィンドウ中央にリセット (NaNチェック強化済み) */
function resetCursor(cursorId) {
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
        return;
    }
    // ウィンドウサイズ確認
    if (typeof windowWidth !== 'number' || typeof windowHeight !== 'number' || Number.isNaN(windowWidth) || Number.isNaN(windowHeight) || windowWidth <= 0 || windowHeight <= 0) {
         console.error(`[${cursorId}] Cannot reset cursor: Invalid window dimensions! w=${windowWidth}, h=${windowHeight}. Using default position.`);
         cursorData.x = 100; cursorData.y = 100; // フォールバック
    } else {
         cursorData.x = windowWidth / 2; cursorData.y = windowHeight / 2;
    }
    // 速度もリセット
    cursorData.dx = 0;
    cursorData.dy = 0;

    // NaNチェック
    if (Number.isNaN(cursorData.x) || Number.isNaN(cursorData.y)) {
        console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100; cursorData.y = 100;
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

/** ジャイロデータ受信 (effectiveGyroキー名修正済み) */
window.electronAPI.onJoyConGyro((data) => {
    const cursorId = data.id;
    const cursorData = cursors[cursorId];
    if (!cursorData) return; // カーソルデータがなければ処理しない

    const rawGyro = { x: data.x, y: data.y, z: data.z };

    // デッドゾーン処理
    const effectiveGyro = {
        gyroX: Math.abs(rawGyro.x) > cursorData.deadzone ? rawGyro.x : 0, // キー名を gyroX に
        gyroY: Math.abs(rawGyro.y) > cursorData.deadzone ? rawGyro.y : 0, // キー名を gyroY に
        gyroZ: Math.abs(rawGyro.z) > cursorData.deadzone ? rawGyro.z : 0  // キー名を gyroZ に
    };

    // 速度計算
    const sensitivity = cursorData.sensitivity;
    const mapping = cursorData.map;

    if (typeof sensitivity !== 'number' || sensitivity <= 0 || Number.isNaN(sensitivity)) { // 0以下のチェック追加
        console.error(`[${cursorId}] Invalid sensitivity: ${sensitivity}. Setting speed to 0.`);
        cursorData.dx = 0; cursorData.dy = 0; return;
    }

    const dxAxis = mapping?.dx?.axis; const dxSign = mapping?.dx?.sign ?? 1;
    if (dxAxis && effectiveGyro[dxAxis] !== undefined) { // effectiveGyro['gyroZ'] などでアクセス
        cursorData.dx = effectiveGyro[dxAxis] / sensitivity * dxSign;
    } else { cursorData.dx = 0; }

    const dyAxis = mapping?.dy?.axis; const dySign = mapping?.dy?.sign ?? 1;
    if (dyAxis && effectiveGyro[dyAxis] !== undefined) { // effectiveGyro['gyroY'] などでアクセス
        cursorData.dy = effectiveGyro[dyAxis] / sensitivity * dySign;
    } else { cursorData.dy = 0; }

    // NaN チェック
    if (Number.isNaN(cursorData.dx) || Number.isNaN(cursorData.dy)) {
        console.error(`[${cursorId}] NaN DETECTED in speed calculation! dx=${cursorData.dx}, dy=${cursorData.dy}`);
        cursorData.dx = 0; cursorData.dy = 0; // 応急処置
    }
});

// 接続状態更新リスナーは削除済み

/** JoyCon R Xボタン状態受信 (表示/非表示トグル) */
window.electronAPI.onJoyConButtonX((data) => {
    // console.log("X Button state received:", data.pressed);
    const cursorElement = cursorElements.cursor2; // 右カーソル対象
    const cursorData = cursors.cursor2;

    // console.log("  -> Targeting Element:", cursorElement);
    // console.log("  -> Targeting Data Object:", cursorData);

    if (cursorElement && cursorData) {
        const shouldBeVisible = data.pressed;
        cursorData.isVisible = shouldBeVisible;
        cursorElement.style.visibility = shouldBeVisible ? 'visible' : 'hidden';
        if (!shouldBeVisible) { cursorData.dx = 0; cursorData.dy = 0; } // 非表示で速度リセット
    }
});

/** JoyCon L 下ボタン状態受信 (表示/非表示トグル) */
window.electronAPI.onJoyConButtonDown((data) => {
    // console.log("Down Button state received:", data.pressed);
    const cursorElement = cursorElements.cursor1; // 左カーソル対象
    const cursorData = cursors.cursor1;
    if (cursorElement && cursorData) {
        const shouldBeVisible = data.pressed;
        cursorData.isVisible = shouldBeVisible; // 状態を保存
        cursorElement.style.visibility = shouldBeVisible ? 'visible' : 'hidden';
        if (!shouldBeVisible) { cursorData.dx = 0; cursorData.dy = 0; } // 非表示で速度リセット
    }
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
            // 座標更新 (NaNガード済み速度を使用)
            const safeDx = Number.isNaN(cursorData.dx) ? 0 : cursorData.dx;
            const safeDy = Number.isNaN(cursorData.dy) ? 0 : cursorData.dy;
            cursorData.x += safeDx;
            cursorData.y += safeDy;

            // 速度減衰
            const damping = (typeof cursorData.damping === 'number' && !Number.isNaN(cursorData.damping)) ? cursorData.damping : 1.0;
            cursorData.dx *= damping;
            cursorData.dy *= damping;

            // ウィンドウ境界での制限
            const halfWidth = element.offsetWidth / 2; const halfHeight = element.offsetHeight / 2;
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
    console.log("DOM fully loaded.");
    // ウィンドウサイズの再取得と初期リセット
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursor1');
        resetCursor('cursor2');
    } else {
        console.warn("Initial window dimensions invalid. Retrying reset later.");
        // 必要ならタイマーやリサイズイベントで再試行
    }
    // ★初期表示状態を設定 (CSSで設定されている場合、ここは不要な場合もある)★
    if (cursorElements.cursor1) cursorElements.cursor1.style.visibility = 'hidden'; // 左は初期非表示
    if (cursorElements.cursor2) cursorElements.cursor2.style.visibility = 'hidden'; // 右も初期非表示 (Xボタンで表示)

    // 描画ループを開始
    requestAnimationFrame(renderLoop);
    console.log('Cursor Renderer script initialized for attitude control.');
});
