type WindowBoundsRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type DisplayBoundsRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type WindowBoundsLogicApi = {
    resolveInitialWindowBounds: (
        storedBounds: WindowBoundsRect | null,
        displayBounds: DisplayBoundsRect,
        defaultWidth: number,
        defaultHeight: number
    ) => WindowBoundsRect;
};

/**
 * ウィンドウの初期位置とサイズを決定する。
 * @param storedBounds 保存済みの位置とサイズ
 * @param displayBounds 対象ディスプレイの境界
 * @param defaultWidth 既定幅
 * @param defaultHeight 既定高さ
 * @returns 初期位置とサイズ
 */
function resolveInitialWindowBounds(
    storedBounds: WindowBoundsRect | null,
    displayBounds: DisplayBoundsRect,
    defaultWidth: number,
    defaultHeight: number
): WindowBoundsRect {
    if (storedBounds) {
        return {
            x: storedBounds.x,
            y: storedBounds.y,
            width: storedBounds.width,
            height: storedBounds.height,
        };
    }
    return {
        x: displayBounds.x + (displayBounds.width - defaultWidth) / 2,
        y: displayBounds.y + (displayBounds.height - defaultHeight) / 2,
        width: defaultWidth,
        height: defaultHeight,
    };
}

const windowBoundsLogicApi: WindowBoundsLogicApi = {
    resolveInitialWindowBounds,
};

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = windowBoundsLogicApi;
}

export { resolveInitialWindowBounds };
