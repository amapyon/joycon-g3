/** 引っかかりの原因を比較する時刻付き測定イベント。 */
export type PointerRuntimeEvent = {
    kind: 'device-scan' | 'button' | 'visibility' | 'render';
    timestampMs: number;
    id?: import('./cursor-types').CursorId;
    durationMs?: number;
    discoveryDurationMs?: number;
    discoverySkipped?: boolean;
    batteryDurationMs?: number;
    pressed?: boolean;
    visible?: boolean;
    maxFrameIntervalMs?: number;
    maxUpdateIntervalMs?: number;
    lastUpdateAgeMs?: number | null;
    documentHidden?: boolean;
    cssVisibility?: string;
    x?: number;
    y?: number;
};
