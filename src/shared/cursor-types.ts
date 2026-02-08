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

/**
 * 姿勢データの参照軸。
 */
export type CursorAxis = 'roll' | 'pitch' | 'yaw';

/**
 * カーソルの座標変換マップ。
 */
export type CursorMap = {
    xFrom: CursorAxis;
    yFrom: CursorAxis;
    xSign: number;
    ySign: number;
};

/**
 * カーソル状態のスナップショット。
 */
export type CursorStateSnapshot = {
    x: number;
    y: number;
    sensitivityX: number;
    sensitivityY: number;
    map: CursorMap;
    isVisible: boolean;
    pendingX: number | null;
    pendingY: number | null;
};

/**
 * Joy-Con 姿勢値。
 */
export type AttitudeValues = {
    roll: number;
    pitch: number;
    yaw?: number;
};

/**
 * ポインター座標。
 */
export type PointerTarget = {
    x: number;
    y: number;
};

/**
 * ビューポート内に丸めるための入力。
 */
export type ClampToViewportInput = {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
    halfWidth: number;
    halfHeight: number;
};

/**
 * 可視状態遷移の結果。
 */
export type VisibilityTransition = {
    changed: boolean;
    nextIsVisible: boolean;
    nextPendingX: number | null;
    nextPendingY: number | null;
    restoreX: number | null;
    restoreY: number | null;
};

/**
 * カーソル計算ロジックAPI。
 */
export type CursorLogicApi = {
    calculateTargetFromAttitude: (
        cursorData: CursorStateSnapshot,
        attitude: AttitudeValues,
        viewportWidth: number,
        viewportHeight: number
    ) => PointerTarget;
    decideVisibilityTransition: (cursorData: CursorStateSnapshot, shouldBeVisible: boolean) => VisibilityTransition;
    clampToViewport: (input: ClampToViewportInput) => PointerTarget;
};

/**
 * 送信経路判定結果。
 */
export type CursorRuntimeSendDecision = {
    method: 'api' | 'send' | 'ipc' | 'retry' | 'none';
    nextRetry: number | null;
};

/**
 * 送信経路判定の入力。
 */
export type CursorRuntimeSendDecisionInput = {
    hasSendCursorMapConfig: boolean;
    hasSend: boolean;
    hasIpcRenderer: boolean;
    retry: number;
    maxRetry: number;
};

/**
 * カーソルリセット座標。
 */
export type CursorResetPosition = {
    x: number;
    y: number;
};

/**
 * カーソル実行時ロジックAPI。
 */
export type CursorRuntimeLogicApi = {
    isValidViewport: (width: number, height: number) => boolean;
    resolveResetPosition: (width: number, height: number, fallback: number) => CursorResetPosition;
    resolveCursorMapSendDecision: (input: CursorRuntimeSendDecisionInput) => CursorRuntimeSendDecision;
};
