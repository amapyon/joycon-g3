import { JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import { registerImuHandlers, registerRStickHandlers } from '../main/main-joycon-motion-registrars';
import type { JoyConEventsContext } from '../main/main-joycon-events-types';
import type { RStickConfig, RStickState } from '../main/r-stick-handler';

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

/**
 * テスト用の Joy-Con イベントコンテキストを生成する。
 * @returns コンテキストとハンドラ参照
 */
function createTestContext(): TestContextBundle {
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
                    cursorLeft: { gyroBiasX: 0, gyroBiasY: 0, gyroBiasZ: 0 },
                    cursorRight: { gyroBiasX: 0, gyroBiasY: 0, gyroBiasZ: 0 },
                },
                isCalibrating: {
                    cursorLeft: false,
                    cursorRight: false,
                },
            },
            windowManager: {
                getCursorWindow: () => null,
                getTimerWindow: () => null,
                getMainWindow: () => null,
                closeCursorWindow: jest.fn(),
            },
            ensureTimerWindow: () => null,
            toggleTimerWindowVisibility: jest.fn(),
            getCursorMapConfig: () => ({}),
            getCursorVisibility: () => true,
            powerpointControl: {
                next: () => false,
                previous: () => false,
            },
            googleSlidesControl: {
                next: () => false,
                previous: () => false,
            },
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
