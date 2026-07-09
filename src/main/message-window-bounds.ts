import { type WindowBoundsRect } from './window-bounds-store';

export type MessageWindowBounds = WindowBoundsRect & {
    source?: 'main-bounds';
    version?: 2;
};

const defaultMinLegacyMessageWindowWidth = 360;
const defaultMinLegacyMessageWindowHeight = 150;

/**
 * Renderer座標で保存されていた古いメッセージウィンドウ境界をMain座標へ移行する。
 * @param bounds 移行前の位置とサイズ
 * @param displayWorkArea 表示先ディスプレイの作業領域
 * @param scaleFactor 表示先ディスプレイの倍率
 * @param minLegacyWidth 古い保存値を移行するときの最小幅
 * @param minLegacyHeight 古い保存値を移行するときの最小高さ
 * @returns 移行後の位置とサイズ
 */
export function migrateLegacyMessageWindowBounds(
    bounds: MessageWindowBounds,
    displayWorkArea: WindowBoundsRect,
    scaleFactor: number,
    minLegacyWidth: number = defaultMinLegacyMessageWindowWidth,
    minLegacyHeight: number = defaultMinLegacyMessageWindowHeight
): MessageWindowBounds {
    if (bounds.source === 'main-bounds' && bounds.version === 2) {
        return bounds;
    }

    const usableScaleFactor = Math.max(scaleFactor || 1, 1);
    let width = Math.round(bounds.width * usableScaleFactor);
    let height = Math.round(bounds.height * usableScaleFactor);

    if (usableScaleFactor > 1) {
        while (
            (width < minLegacyWidth || height < minLegacyHeight)
            && width * usableScaleFactor <= displayWorkArea.width
            && height * usableScaleFactor <= displayWorkArea.height
        ) {
            width = Math.round(width * usableScaleFactor);
            height = Math.round(height * usableScaleFactor);
        }
    }

    width = Math.max(width, Math.min(minLegacyWidth, displayWorkArea.width));
    height = Math.max(height, Math.min(minLegacyHeight, displayWorkArea.height));

    return {
        x: Math.round(bounds.x + (bounds.width - width) / 2),
        y: Math.round(bounds.y + (bounds.height - height) / 2),
        width,
        height,
        source: 'main-bounds',
        version: 2,
    };
}
