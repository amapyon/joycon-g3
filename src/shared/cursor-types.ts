/**
 * カーソル識別子。
 */
export type CursorId = 'cursorLeft' | 'cursorRight';

/**
 * カーソル座標変換エントリ。
 */
export type CursorMapEntry = {
    xSign: number;
    ySign: number;
};

/**
 * カーソル座標変換設定。
 */
export type CursorMapConfig = Record<CursorId, CursorMapEntry>;

/**
 * 一部のみ指定可能なカーソル座標変換設定。
 */
export type PartialCursorMapConfig = Partial<CursorMapConfig>;
