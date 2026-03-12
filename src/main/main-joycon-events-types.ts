import { BrowserWindow } from 'electron';
import { CursorId, CursorMapConfig, PointerPositions } from './imu-pointer';
import { RStickAction, RStickConfig, RStickState } from './r-stick-handler';
import type { PointerMotionSettings } from '../shared/pointer-motion-settings';
import type {
    JoyConAttitudeData,
    JoyConButtonStateData as SharedJoyConButtonStateData,
    JoyConCursorIdData as SharedJoyConCursorIdData,
    JoyConEventData as SharedJoyConEventData,
    JoyConStickAnalogData as SharedJoyConStickAnalogData,
} from '../shared/joycon-event-types';
export type { BatteryStatus, CalibrationStatus, JoyConStatus } from '../shared/joycon-event-types';
import type {
    GoogleSlidesControlLike,
    ImuProcessorLike,
    JoyConManagerLike,
    PowerPointControlLike,
    WindowManagerLike,
} from '../shared/main-joycon-deps-types';
export type {
    GoogleSlidesControlLike,
    ImuProcessorLike,
    JoyConManagerLike,
    PowerPointControlLike,
    WindowManagerLike,
} from '../shared/main-joycon-deps-types';

export type JoyConButtonStateData = SharedJoyConButtonStateData;
export type JoyConCursorIdData = SharedJoyConCursorIdData;
export type JoyConStickAnalogData = SharedJoyConStickAnalogData;
export type JoyConEventData = SharedJoyConEventData;
export type AttitudeData = JoyConAttitudeData;

export type RegisterMainJoyConEventsOptions = {
    joyConManager: JoyConManagerLike;
    imuProcessor: ImuProcessorLike;
    windowManager: WindowManagerLike;
    ensureTimerWindow: () => BrowserWindow | null;
    toggleTimerWindowVisibility: () => void;
    getCursorMapConfig: () => CursorMapConfig;
    getPointerMotionSettings: () => PointerMotionSettings;
    getCursorVisibility: (id: CursorId) => boolean;
    powerpointControl: PowerPointControlLike;
    googleSlidesControl: GoogleSlidesControlLike;
};

export type JoyConEventsContext = {
    options: RegisterMainJoyConEventsOptions;
    pointerPositions: PointerPositions;
    rStickConfig: RStickConfig;
    rStickState: RStickState;
    setRStickState: (state: RStickState) => void;
    dispatchRStickActions: (
        actions: RStickAction[],
        timerWindow: BrowserWindow | null,
        cursorWindow: BrowserWindow | null,
    ) => void;
};
