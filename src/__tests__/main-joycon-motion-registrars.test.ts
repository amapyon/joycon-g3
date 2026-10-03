import { JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import { registerImuHandlers, registerRStickHandlers } from '../main/main-joycon-motion-registrars';
import type { JoyConEventsContext } from '../main/main-joycon-events-types';
import type { RStickConfig, RStickState } from '../main/r-stick-handler';
import type { PointerMotionSettings } from '../shared/pointer-motion-settings';

type JoyConHandlerMap = Record<string, (payload: unknown) => void>;
type ImuHandlerMap = Record<string, (payload: unknown) => void>;

type TestContextBundle = {
    context: JoyConEventsContext;
    joyConHandlers: JoyConHandlerMap;
    imuHandlers: ImuHandlerMap;
    imuUpdate: jest.Mock;
    dispatchRStickActions: jest.Mock;
    setRStickState: jest.Mock;
};

type TestContextOverrides = {
    getCursorWindow?: () => ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']>;
    getMainWindow?: () => ReturnType<JoyConEventsContext['options']['windowManager']['getMainWindow']>;
    getCursorVisibility?: JoyConEventsContext['options']['getCursorVisibility'];
};

/**
 * テスト用の Joy-Con イベントコンテキストを生成する。
 * @param overrides 一部依存の差し替え設定
 * @returns コンテキストとハンドラ参照
 */
function createTestContext(overrides: TestContextOverrides = {}): TestContextBundle {
    const joyConHandlers: JoyConHandlerMap = {};
    const imuHandlers: ImuHandlerMap = {};
    const imuUpdate = jest.fn();
    const dispatchRStickActions = jest.fn();
    const setRStickState = jest.fn();

    const rStickConfig: RStickConfig = {
        fontSizeChangeAmount: 2,
        fontSizeChangeInterval: 100,
        analogCenter: 2048,
        fontSizeDeadzone: 200,
        navDeadzone: 600,
    };
    const rStickState: RStickState = {
        isPressed: false,
        lastAnalogData: null,
        lastFontSizeChangeTime: 0,
        isTimerMenuNavActive: false,
    };

    const context: JoyConEventsContext = {
        options: {
            joyConManager: {
                on: (eventName: string, handler: (...args: unknown[]) => void): void => {
                    joyConHandlers[eventName] = (payload: unknown): void => handler(payload);
                },
            },
            imuProcessor: {
                update: imuUpdate,
                recenter: jest.fn(),
                on: (eventName: string, handler: (...args: unknown[]) => void): void => {
                    imuHandlers[eventName] = (payload: unknown): void => handler(payload);
                },
                states: {
                    cursorLeft: { gyroBiasX: 0, gyroBiasY: 0, gyroBiasZ: 0, lastDeltaTime: 1 / 60 },
                    cursorRight: { gyroBiasX: 0, gyroBiasY: 0, gyroBiasZ: 0, lastDeltaTime: 1 / 60 },
                },
                isCalibrating: {
                    cursorLeft: false,
                    cursorRight: false,
                },
            },
            windowManager: {
                getCursorWindow: overrides.getCursorWindow ?? (() : ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']> => null),
                getTimerWindow: () => null,
                getMainWindow: overrides.getMainWindow ?? (() : ReturnType<JoyConEventsContext['options']['windowManager']['getMainWindow']> => null),
                closeCursorWindow: jest.fn(),
            },
            ensureTimerWindow: () => null,
            toggleTimerWindowVisibility: jest.fn(),
            getCursorMapConfig: () => ({}),
            getPointerMotionSettings: () => ({
                moveSpeed: 0.05,
                gyroDeadzone: 120,
                xRotationCompensationStrength: 1,
                fixedXRotationDegrees: null,
                diagnosticsEnabled: false,
            }),
            getCursorVisibility: overrides.getCursorVisibility ?? (() : boolean => true),
            powerpointControl: {
                hasTarget: () => false,
                next: () => false,
                previous: () => false,
            },
            googleSlidesControl: {
                hasTarget: () => false,
                next: () => false,
                previous: () => false,
            },
        },
        pointerPositions: {
            cursorLeft: { x: 600, y: 300 },
            cursorRight: { x: 600, y: 300 },
        },
        rStickConfig,
        rStickState,
        setRStickState,
        dispatchRStickActions,
    };

    return { context, joyConHandlers, imuHandlers, imuUpdate, dispatchRStickActions, setRStickState };
}

describe('main-joycon-motion-registrars', (): void => {
    it('IMUデータが不正なら update を呼ばない', (): void => {
        const { context, joyConHandlers, imuUpdate } = createTestContext();
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({ invalid: true });

        expect(imuUpdate).not.toHaveBeenCalled();
    });

    it('ウィンドウ未生成でも有効なIMUデータは update できる', (): void => {
        const { context, joyConHandlers, imuUpdate } = createTestContext();
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 4, y: 5, z: 6 },
        });

        expect(imuUpdate).toHaveBeenCalledTimes(1);
    });

    it('有効なIMUデータでカーソルウィンドウがあれば送信する', (): void => {
        const send = jest.fn();
        const cursorWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']>;
        const { context, joyConHandlers, imuUpdate } = createTestContext({
            getCursorWindow: () => cursorWindow,
        });
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 4, y: 5, z: 6 },
        });

        expect(imuUpdate).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('ポインター設定に応じて移動量を反映する', (): void => {
        const send = jest.fn();
        const cursorWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']>;
        const { context, joyConHandlers } = createTestContext({
            getCursorWindow: () => cursorWindow,
        });
        context.options.getPointerMotionSettings = (): PointerMotionSettings => ({
            moveSpeed: 0.02,
            gyroDeadzone: 100,
            xRotationCompensationStrength: 1,
            fixedXRotationDegrees: null,
            diagnosticsEnabled: false,
        });
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 0, y: 0, z: 1000 },
        });

        expect(send).toHaveBeenCalledWith('update-pointer', { id: 'cursorLeft', x: 620, y: 300 });
    });

    it('カーソル非表示時は有効なIMUデータでも送信しない', (): void => {
        const send = jest.fn();
        const cursorWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']>;
        const { context, joyConHandlers, imuUpdate } = createTestContext({
            getCursorWindow: () => cursorWindow,
            getCursorVisibility: () => false,
        });
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 4, y: 5, z: 6 },
        });

        expect(imuUpdate).toHaveBeenCalledTimes(1);
        expect(send).not.toHaveBeenCalled();
    });

    it('診断表示が有効ならメインウィンドウへ軸漏れ率を送信する', (): void => {
        const send = jest.fn();
        const mainWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getMainWindow']>;
        const { context, joyConHandlers } = createTestContext({
            getMainWindow: () => mainWindow,
        });
        context.options.getPointerMotionSettings = (): PointerMotionSettings => ({
            moveSpeed: 0.05,
            gyroDeadzone: 90,
            xRotationCompensationStrength: 1,
            fixedXRotationDegrees: 0,
            diagnosticsEnabled: true,
        });
        registerImuHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.IMU_DATA]?.({
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 16384 },
            gyro: { x: 0, y: 100, z: 200 },
        });

        expect(send).toHaveBeenCalledWith('pointer-motion-diagnostics', expect.objectContaining({
            id: 'cursorLeft',
            appliedXRotationDegrees: 0,
            axisLeakageRatio: 0.5,
        }));
    });

    it('attitude-update はカーソルウィンドウへ送信しない', (): void => {
        const send = jest.fn();
        const cursorWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getCursorWindow']>;
        const { context, imuHandlers } = createTestContext({
            getCursorWindow: () => cursorWindow,
        });
        registerImuHandlers(context);

        imuHandlers['attitude-update']?.({
            id: 'cursorLeft',
            roll: 1,
            pitch: 2,
            yaw: 3,
        });

        expect(send).not.toHaveBeenCalled();
    });

    it('calibration-status が有効ならメインウィンドウへ送信する', (): void => {
        const send = jest.fn();
        const mainWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as ReturnType<JoyConEventsContext['options']['windowManager']['getMainWindow']>;
        const { context, imuHandlers } = createTestContext({
            getMainWindow: () => mainWindow,
        });
        registerImuHandlers(context);

        imuHandlers['calibration-status']?.({
            id: 'cursorLeft',
            status: 'complete',
        });

        expect(send).toHaveBeenCalledTimes(1);
    });

    it('Rスティック押下データが不正なら状態更新・dispatchしない', (): void => {
        const { context, joyConHandlers, setRStickState, dispatchRStickActions } = createTestContext();
        registerRStickHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.R_STICK]?.({ pressed: 'invalid' });

        expect(setRStickState).not.toHaveBeenCalled();
        expect(dispatchRStickActions).not.toHaveBeenCalled();
    });

    it('Rスティックアナログデータが不正なら状態更新・dispatchしない', (): void => {
        const { context, joyConHandlers, setRStickState, dispatchRStickActions } = createTestContext();
        registerRStickHandlers(context);

        joyConHandlers[JOYCON_MANAGER_EVENTS.R_STICK_ANALOG]?.({ x: 'invalid', y: 100 });

        expect(setRStickState).not.toHaveBeenCalled();
        expect(dispatchRStickActions).not.toHaveBeenCalled();
    });
});
