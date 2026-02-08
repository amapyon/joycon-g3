import { BrowserWindow } from 'electron';
import { CursorId, CursorMapConfig } from './imu-pointer';
import { RStickAction, RStickConfig, RStickState } from './r-stick-handler';
import type {
    JoyConAttitudeData,
    JoyConButtonStateData as SharedJoyConButtonStateData,
    JoyConCursorIdData as SharedJoyConCursorIdData,
    JoyConEventData as SharedJoyConEventData,
    JoyConStickAnalogData as SharedJoyConStickAnalogData,
} from '../shared/joycon-event-types';
export type { BatteryStatus, CalibrationStatus, JoyConStatus } from '../shared/joycon-event-types';

export type JoyConButtonStateData = SharedJoyConButtonStateData;
export type JoyConCursorIdData = SharedJoyConCursorIdData;
export type JoyConStickAnalogData = SharedJoyConStickAnalogData;
export type JoyConEventData = SharedJoyConEventData;
export type AttitudeData = JoyConAttitudeData;

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
