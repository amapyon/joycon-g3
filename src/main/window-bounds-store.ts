import fs from 'fs';
import path from 'path';

export type WindowBoundsRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * 指定値を範囲内に収める。
 * @param value 対象値
 * @param min 最小値
 * @param max 最大値
 * @returns 範囲内に収めた値
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * ウィンドウ境界として利用できる値か判定する。
 * @param value 判定対象
 * @param minWidth 最小幅
 * @param minHeight 最小高さ
 * @returns 利用できる場合は true
 */
export function isWindowBoundsValue(value: unknown, minWidth: number, minHeight: number): value is WindowBoundsRect {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const bounds = value as WindowBoundsRect;
    return Number.isFinite(bounds.x)
        && Number.isFinite(bounds.y)
        && Number.isFinite(bounds.width)
        && Number.isFinite(bounds.height)
        && bounds.width >= minWidth
        && bounds.height >= minHeight;
}

/**
 * JSON ファイルからウィンドウ境界を読み込む。
 * @param filePath 読み込み元ファイル
 * @param minWidth 最小幅
 * @param minHeight 最小高さ
 * @returns 保存済みのウィンドウ境界
 */
export function loadWindowBounds<TBounds extends WindowBoundsRect>(
    filePath: string,
    minWidth: number,
    minHeight: number
): TBounds | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
        if (!isWindowBoundsValue(parsed, minWidth, minHeight)) {
            return null;
        }
        return parsed as TBounds;
    } catch {
        return null;
    }
}

/**
 * ウィンドウ境界を JSON ファイルへ保存する。
 * @param filePath 保存先ファイル
 * @param bounds 保存するウィンドウ境界
 */
export function saveWindowBounds<TBounds extends WindowBoundsRect>(filePath: string, bounds: TBounds): void {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(bounds), 'utf8');
    } catch {
        // 保存に失敗してもウィンドウ操作自体は継続する。
    }
}

/**
 * ウィンドウ境界をディスプレイ作業領域内へ補正する。
 * @param bounds 補正対象のウィンドウ境界
 * @param displayBounds ディスプレイ作業領域
 * @param minWidth 最小幅
 * @param minHeight 最小高さ
 * @returns 作業領域内へ補正したウィンドウ境界
 */
export function resolveBoundsWithinDisplay(
    bounds: WindowBoundsRect,
    displayBounds: WindowBoundsRect,
    minWidth: number,
    minHeight: number
): WindowBoundsRect {
    const width = Math.min(Math.max(Math.round(bounds.width), minWidth), displayBounds.width);
    const height = Math.min(Math.max(Math.round(bounds.height), minHeight), displayBounds.height);
    const maxX = displayBounds.x + displayBounds.width - width;
    const maxY = displayBounds.y + displayBounds.height - height;

    return {
        x: clamp(Math.round(bounds.x), displayBounds.x, Math.max(displayBounds.x, maxX)),
        y: clamp(Math.round(bounds.y), displayBounds.y, Math.max(displayBounds.y, maxY)),
        width,
        height,
    };
}
