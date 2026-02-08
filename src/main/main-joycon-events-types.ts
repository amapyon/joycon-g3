import { BrowserWindow } from 'electron';
import { CursorId, CursorMapConfig } from './imu-pointer';
import { RStickAction, RStickConfig, RStickState } from './r-stick-handler';

export type JoyConEventData = {
    id?: CursorId;
    pressed?: boolean;
    x?: number;
    y?: number;
};
export type JoyConStatus = { leftConnected: boolean; rightConnected: boolean };
export type AttitudeData = { id: CursorId; roll: number; pitch: number; yaw: number };
export type CalibrationStatus = { id: CursorId; status: string };
export type BatteryStatus = { isLeft: boolean; level: number };

export type JoyConManagerLike = {
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
};

export type PowerPointControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

export type GoogleSlidesControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

export type WindowManagerLike = {
    getCursorWindow: () => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
    closeCursorWindow: () => void;
};

export type ImuStateLike = {
    gyroBiasX: number;
    gyroBiasY: number;
    gyroBiasZ: number;
};

export type ImuProcessorLike = {
    update: (data: { id: CursorId; accel: { x: number; y: number; z: number }; gyro: { x: number; y: number; z: number } }) => void;
    recenter: (id: CursorId) => void;
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
    states: Record<CursorId, ImuStateLike>;
    isCalibrating: Record<CursorId, boolean>;
};

export type RegisterMainJoyConEventsOptions = {
    joyConManager: JoyConManagerLike;
    imuProcessor: ImuProcessorLike;
    windowManager: WindowManagerLike;
    ensureTimerWindow: () => BrowserWindow | null;
    toggleTimerWindowVisibility: () => void;
    getCursorMapConfig: () => CursorMapConfig;
    getCursorVisibility: (id: CursorId) => boolean;
    powerpointControl: PowerPointControlLike;
    googleSlidesControl: GoogleSlidesControlLike;
};

export type JoyConEventsContext = {
    options: RegisterMainJoyConEventsOptions;
    rStickConfig: RStickConfig;
    rStickState: RStickState;
    setRStickState: (state: RStickState) => void;
    dispatchRStickActions: (
        actions: RStickAction[],
        timerWindow: BrowserWindow | null,
        cursorWindow: BrowserWindow | null,
    ) => void;
};
