import { BrowserWindow } from 'electron';
import {
    CursorId,
    CursorMapConfig,
    ImuData,
    PointerPositions,
    decidePointerUpdate,
} from './imu-pointer';
import {
    RStickAction,
    RStickConfig,
    RStickState,
    decideRStickAnalog,
    decideRStickPress,
} from './r-stick-handler';
import { getScreenSize } from './screen-state';

type JoyConEventData = { id?: string } & Record<string, unknown>;
type JoyConStatus = Record<string, unknown>;
type AttitudeData = Record<string, unknown>;
type CalibrationStatus = Record<string, unknown>;
type BatteryStatus = Record<string, unknown>;

type JoyConManagerLike = {
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
};

type PowerPointControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

type GoogleSlidesControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

type WindowManagerLike = {
    getCursorWindow: () => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
    closeCursorWindow: () => void;
};

type ImuStateLike = {
    gyroBiasX: number;
    gyroBiasY: number;
    gyroBiasZ: number;
};

type ImuProcessorLike = {
    update: (data: { id: CursorId; accel: { x: number; y: number; z: number }; gyro: { x: number; y: number; z: number } }) => void;
    recenter: (id: CursorId) => void;
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
    states: Record<CursorId, ImuStateLike>;
    isCalibrating: Record<CursorId, boolean>;
};

type RegisterMainJoyConEventsOptions = {
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

/**
 * カーソル ID かどうかを判定する。
 * @param value 判定対象
 * @returns カーソル ID の場合は true
 */
function isCursorId(value: unknown): value is CursorId {
    return value === 'cursorLeft' || value === 'cursorRight';
}

/**
 * Joy-Con と IMU のイベントを main プロセスへ登録する。
 * @param options 登録に必要な依存
 */
export function registerMainJoyConEvents(options: RegisterMainJoyConEventsOptions): void {
    const {
        joyConManager,
        imuProcessor,
        windowManager,
        ensureTimerWindow,
        toggleTimerWindowVisibility,
        getCursorMapConfig,
        getCursorVisibility,
        powerpointControl,
        googleSlidesControl,
    } = options;

    const rStickConfig: RStickConfig = {
        fontSizeChangeAmount: 2,
        fontSizeChangeInterval: 100,
        analogCenter: 2048,
        fontSizeDeadzone: 200,
        navDeadzone: 600,
    };

    let rStickState: RStickState = {
        isPressed: false,
        lastAnalogData: null,
        lastFontSizeChangeTime: 0,
        isTimerMenuNavActive: false,
    };

    /**
     * R スティックのアクションを実行する。
     * @param actions アクション一覧
     * @param timerWindow タイマーウィンドウ
     * @param cursorWindow カーソルウィンドウ
     */
    const dispatchRStickActions = (
        actions: RStickAction[],
        timerWindow: BrowserWindow | null,
        cursorWindow: BrowserWindow | null,
    ): void => {
        actions.forEach((action: RStickAction): void => {
            if (action.target === 'timer') {
                if (timerWindow && !timerWindow.isDestroyed()) {
                    if (action.payload === undefined) {
                        timerWindow.webContents.send(action.channel);
                    } else {
                        timerWindow.webContents.send(action.channel, action.payload);
                    }
                }
                return;
            }

            if (cursorWindow && !cursorWindow.isDestroyed()) {
                if (action.payload === undefined) {
                    cursorWindow.webContents.send(action.channel);
                } else {
                    cursorWindow.webContents.send(action.channel, action.payload);
                }
            }
        });
    };

    /**
     * IMU データを受け取り、ポインター座標を更新する。
     * @param data IMU データ
     */
    const handleImuData = (data: ImuData): void => {
        const cursorId = (data.id === 'R' || data.id === 'cursorRight') ? 'cursorRight' : 'cursorLeft';
        imuProcessor.update({
            id: cursorId,
            accel: data.accel,
            gyro: data.gyro,
        });

        const state = imuProcessor.states[cursorId];
        const id = data.id === 'R' || data.id === 'cursorRight' ? 'cursorRight' : 'cursorLeft';
        const g = globalThis as typeof globalThis & { pointerPositions?: PointerPositions };
        if (!g.pointerPositions) {
            g.pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
        }

        const decision = decidePointerUpdate({
            data,
            cursorId: id,
            cursorVisible: getCursorVisibility(id),
            isCalibrating: imuProcessor.isCalibrating[id],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            cursorMapConfig: getCursorMapConfig(),
            currentPosition: g.pointerPositions[id],
            defaultPosition: { x: 600, y: 300 },
            screenSize: getScreenSize(),
            moveSpeed: 0.1,
            gyroDeadzone: 90,
        });

        if (!decision) {
            return;
        }

        if (decision.configMissing) {
            console.warn(`[main.ts] cursorMapConfig for ${id} is undefined. Using default signs.`);
        }

        g.pointerPositions[id] = decision.position;
        const pointerWindow = windowManager.getCursorWindow();
        if (pointerWindow && !pointerWindow.isDestroyed()) {
            pointerWindow.webContents.send('update-pointer', decision.sendPayload);
        }
    };

    joyConManager.on('imu-data', (data: unknown): void => {
        handleImuData(data as ImuData);
    });

    imuProcessor.on('attitude-update', (attitudeData: unknown): void => {
        const targetWindow = windowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-attitude', attitudeData as AttitudeData);
        }
    });

    joyConManager.on('status-update', (status: unknown): void => {
        const targetWindow = windowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status as unknown as JoyConStatus);
        }
    });

    ['button-x', 'button-down', 'button-plus'].forEach((eventName: string): void => {
        joyConManager.on(eventName, (data: unknown): void => {
            const targetWindow = windowManager.getCursorWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                const channel = eventName === 'button-x'
                    ? 'joycon-button-x'
                    : eventName === 'button-down'
                        ? 'joycon-button-down'
                        : 'joycon-button-plus';
                targetWindow.webContents.send(channel, data as unknown as JoyConEventData);
            }
        });
    });

    joyConManager.on('button-x-pressed', (data: unknown): void => {
        const typedData = data as JoyConEventData;
        console.log(`[Main] button-x-pressed received for ${typedData?.id}`);
        const cursorId = isCursorId(typedData.id) ? typedData.id : null;
        if (cursorId) {
            imuProcessor.recenter(cursorId);
        }
        const targetWindow = windowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-x-pressed', typedData);
        }
    });

    joyConManager.on('button-plus-pressed', (data: unknown): void => {
        const typedData = data as JoyConEventData;
        console.log(`[Main] button-plus-pressed received for ${typedData?.id}. Toggle logic.`);
        toggleTimerWindowVisibility();
        const targetWindow = windowManager.getTimerWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-plus-pressed', typedData);
        }
    });

    joyConManager.on('button-minus-pressed', (data: unknown): void => {
        const typedData = data as JoyConEventData;
        console.log(`[Main] button-minus-pressed received from JoyConManager for ${typedData?.id}`);
        const timerWindow = ensureTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.show();
            if (timerWindow.webContents.isLoading()) {
                timerWindow.webContents.once('did-finish-load', () => {
                    if (timerWindow && !timerWindow.isDestroyed()) {
                        timerWindow.webContents.send('button-minus-pressed', typedData);
                    }
                });
            } else {
                timerWindow.webContents.send('button-minus-pressed', typedData);
            }
        }
    });

    joyConManager.on('button-sr-pressed', (data: unknown): void => {
        const typedData = data as JoyConEventData;
        console.log(`[Main] button-sr-pressed received from JoyConManager for ${typedData?.id}`);
        const timerWindow = ensureTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.show();
            if (timerWindow.webContents.isLoading()) {
                timerWindow.webContents.once('did-finish-load', () => {
                    if (timerWindow && !timerWindow.isDestroyed()) {
                        timerWindow.webContents.send('button-sr-pressed', typedData);
                    }
                });
            } else {
                timerWindow.webContents.send('button-sr-pressed', typedData);
            }
        }
    });

    joyConManager.on('button-down-pressed', (data: unknown): void => {
        const typedData = data as JoyConEventData;
        console.log(`[Main] button-down-pressed received for ${typedData?.id} -> calling imuProcessor.recenter`);
        const cursorId = isCursorId(typedData.id) ? typedData.id : null;
        if (cursorId) {
            imuProcessor.recenter(cursorId);
        }
        const targetWindow = windowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-down-pressed', typedData);
        }
    });

    joyConManager.on('r-stick', (data: unknown): void => {
        const decision = decideRStickPress({
            pressed: (data as { pressed: boolean }).pressed,
            now: Date.now(),
            state: rStickState,
            config: rStickConfig,
        });
        rStickState = decision.state;
        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        dispatchRStickActions(decision.actions, timerWindow, windowManager.getCursorWindow());
    });

    joyConManager.on('r-stick-analog', (data: unknown): void => {
        const decision = decideRStickAnalog({
            analog: data as { x: number; y: number },
            now: Date.now(),
            state: rStickState,
            config: rStickConfig,
        });
        rStickState = decision.state;
        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        dispatchRStickActions(decision.actions, timerWindow, windowManager.getCursorWindow());
    });

    joyConManager.on('ppt-next', (): void => {
        const handled = powerpointControl.next();
        if (!handled) {
            googleSlidesControl.next();
        }
    });

    joyConManager.on('ppt-prev', (): void => {
        const handled = powerpointControl.previous();
        if (!handled) {
            googleSlidesControl.previous();
        }
    });

    imuProcessor.on('calibration-status', (statusInfo: unknown): void => {
        const targetWindow = windowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('calibration-status-update', statusInfo as CalibrationStatus);
        }
    });

    joyConManager.on('battery-status-update', (status: unknown): void => {
        const targetWindow = windowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-battery-status-update', status as unknown as BatteryStatus);
        }
    });

    joyConManager.on('button-home-pressed', (data: unknown): void => {
        const typedData = data as { id: 'cursorLeft' | 'cursorRight' };
        if (typedData.id === 'cursorRight') {
            console.log('[Main] R Joy-Con Home button pressed. Closing cursor window.');
            windowManager.closeCursorWindow();
        }
    });
}
