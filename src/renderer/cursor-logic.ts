type SharedCursorAxis = import('../shared/cursor-types').CursorAxis;
type SharedCursorStateSnapshot = import('../shared/cursor-types').CursorStateSnapshot;
type SharedAttitudeValues = import('../shared/cursor-types').AttitudeValues;
type SharedPointerTarget = import('../shared/cursor-types').PointerTarget;
type SharedClampToViewportInput = import('../shared/cursor-types').ClampToViewportInput;
type SharedVisibilityTransition = import('../shared/cursor-types').VisibilityTransition;
type SharedCursorLogicApi = import('../shared/cursor-types').CursorLogicApi;

/**
 * 姿勢軸に応じた値を取得する。
 * @param axis 参照する軸
 * @param attitude 姿勢値
 * @returns 指定軸の値
 */
function pickAxisValue(axis: SharedCursorAxis, attitude: SharedAttitudeValues): number {
    if (axis === 'pitch') {
        return attitude.pitch;
    }
    if (axis === 'yaw') {
        return attitude.yaw ?? 0;
    }
    return attitude.roll;
}

/**
 * 姿勢値から目標座標を計算する。
 * @param cursorData カーソル状態
 * @param attitude 姿勢値
 * @param viewportWidth 表示幅
 * @param viewportHeight 表示高
 * @returns 目標座標
 */
function calculateTargetFromAttitude(
    cursorData: SharedCursorStateSnapshot,
    attitude: SharedAttitudeValues,
    viewportWidth: number,
    viewportHeight: number
): SharedPointerTarget {
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const sourceX = pickAxisValue(cursorData.map.xFrom, attitude);
    const sourceY = pickAxisValue(cursorData.map.yFrom, attitude);
    return {
        x: centerX + sourceX * cursorData.sensitivityX * cursorData.map.xSign,
        y: centerY + sourceY * cursorData.sensitivityY * cursorData.map.ySign,
    };
}

/**
 * 表示状態切替時の次状態を算出する。
 * @param cursorData カーソル状態
 * @param shouldBeVisible 目標表示状態
 * @returns 遷移内容
 */
function decideVisibilityTransition(
    cursorData: SharedCursorStateSnapshot,
    shouldBeVisible: boolean
): SharedVisibilityTransition {
    if (cursorData.isVisible === shouldBeVisible) {
        return {
            changed: false,
            nextIsVisible: cursorData.isVisible,
            nextPendingX: cursorData.pendingX,
            nextPendingY: cursorData.pendingY,
            restoreX: null,
            restoreY: null,
        };
    }

    if (shouldBeVisible) {
        const hasPending = cursorData.pendingX !== null && cursorData.pendingY !== null;
        return {
            changed: true,
            nextIsVisible: true,
            nextPendingX: null,
            nextPendingY: null,
            restoreX: hasPending ? cursorData.pendingX : null,
            restoreY: hasPending ? cursorData.pendingY : null,
        };
    }

    const keepPending = cursorData.pendingX !== null;
    return {
        changed: true,
        nextIsVisible: false,
        nextPendingX: keepPending ? cursorData.pendingX : Math.round(cursorData.x),
        nextPendingY: keepPending ? cursorData.pendingY : Math.round(cursorData.y),
        restoreX: null,
        restoreY: null,
    };
}

/**
 * 座標を画面内に収める。
 * @param input 座標と表示領域情報
 * @returns 補正後座標
 */
function clampToViewport(input: SharedClampToViewportInput): SharedPointerTarget {
    return {
        x: Math.max(input.halfWidth, Math.min(input.viewportWidth - input.halfWidth, input.x)),
        y: Math.max(input.halfHeight, Math.min(input.viewportHeight - input.halfHeight, input.y)),
    };
}

const cursorLogicApi: SharedCursorLogicApi = {
    calculateTargetFromAttitude,
    decideVisibilityTransition,
    clampToViewport,
};

const cursorLogicRoot = globalThis as unknown as {
    cursorLogic?: SharedCursorLogicApi;
};
cursorLogicRoot.cursorLogic = cursorLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = cursorLogicApi;
}
