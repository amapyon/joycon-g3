type DisplaySizeLike = {
    width: number;
    height: number;
};

type DisplayLike = {
    id: number;
    size: DisplaySizeLike;
    scaleFactor: number;
};

/**
 * 表示先 ID の入力値を正規化する。
 * @param displayId 文字列または数値の表示先 ID
 * @returns 正規化した ID。解釈不能な場合は null
 */
export function resolveDisplayId(displayId: number | string): number | null {
    const parsedId = typeof displayId === 'string' ? Number.parseInt(displayId, 10) : displayId;
    if (Number.isNaN(parsedId)) {
        return null;
    }
    return parsedId;
}

/**
 * 表示 ID に一致するディスプレイを取得する。
 * @param displays 検索対象のディスプレイ一覧
 * @param targetId 対象 ID
 * @returns 一致するディスプレイ
 */
export function findDisplayById<T extends { id: number }>(displays: T[], targetId: number): T | undefined {
    return displays.find((display: T): boolean => display.id === targetId);
}

/**
 * ディスプレイの物理解像度を計算する。
 * @param display 対象ディスプレイ
 * @returns 物理解像度
 */
export function toPhysicalScreenSize(display: DisplayLike): DisplaySizeLike {
    return {
        width: display.size.width * display.scaleFactor,
        height: display.size.height * display.scaleFactor,
    };
}
