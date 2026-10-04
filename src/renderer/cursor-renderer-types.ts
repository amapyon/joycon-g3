type CursorId = import('../shared/cursor-types').CursorId;
type CursorMapConfig = import('../shared/cursor-types').CursorMapConfig;
type UpdatePointerData = import('../shared/joycon-event-types').UpdatePointerData;
type ButtonStateData = import('../shared/joycon-event-types').JoyConButtonStateData;
type ButtonPressData = import('../shared/joycon-event-types').JoyConCursorIdData;

/**
 * カーソルのマッピング設定。
 */
export type CursorMap = {
    xFrom: 'roll' | 'pitch' | 'yaw';
    yFrom: 'roll' | 'pitch' | 'yaw';
    xSign: number;
    ySign: number;
};

/**
 * カーソルの状態データ。
 */
export type CursorData = {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    smoothingTimeConstantMs: number;
    map: CursorMap;
    isVisible: boolean;
    opacity: number;
    blink: boolean;
    pendingX: number | null;
    pendingY: number | null;
};

/**
 * カーソルレンダラーから利用する Electron API。
 */
export type CursorRendererElectronAPI = {
    onUpdatePointer: (callback: (pos: UpdatePointerData) => void) => void;
    onJoyConButtonX: (callback: (data: ButtonStateData) => void) => void;
    onJoyConButtonDown: (callback: (data: ButtonStateData) => void) => void;
    onJoyConButtonXPressed: (callback: (data: ButtonPressData) => void) => void;
    onJoyConButtonDownPressed: (callback: (data: ButtonPressData) => void) => void;
    sendCursorVisibilityUpdate: (id: CursorId, isVisible: boolean) => void;
    sendCursorMapConfig: (config: CursorMapConfig) => void;
    send?: (channel: string, ...args: unknown[]) => void;
    onPointerRuntimeTraceEnabled?: (callback: (enabled: boolean) => void) => void;
    sendCursorRenderTrace?: (event: import('../shared/pointer-runtime-trace').PointerRuntimeEvent) => void;
};
