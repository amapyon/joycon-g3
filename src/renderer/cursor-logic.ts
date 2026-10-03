type SharedCursorStateSnapshot = import('../shared/cursor-types').CursorStateSnapshot;
type SharedPointerTarget = import('../shared/cursor-types').PointerTarget;
type SharedClampToViewportInput = import('../shared/cursor-types').ClampToViewportInput;
type SharedVisibilityTransition = import('../shared/cursor-types').VisibilityTransition;
type SharedCursorLogicApi = import('../shared/cursor-types').CursorLogicApi;

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
    decideVisibilityTransition,
    clampToViewport,
};

const cursorLogicRoot = globalThis as typeof globalThis & {
    cursorLogic?: SharedCursorLogicApi;
};
cursorLogicRoot.cursorLogic = cursorLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = cursorLogicApi;
}
