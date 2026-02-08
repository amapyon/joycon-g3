type OnHandler = (...args: unknown[]) => void;
type HandleHandler = (...args: unknown[]) => unknown;

const onHandlers = new Map<string, OnHandler>();
const handleHandlers = new Map<string, HandleHandler>();

jest.mock('electron', () => {
    return {
        ipcMain: {
            on: (channel: string, handler: OnHandler): void => {
                onHandlers.set(channel, handler);
            },
            handle: (channel: string, handler: HandleHandler): void => {
                handleHandlers.set(channel, handler);
            },
        },
        screen: {
            getAllDisplays: (): Array<{ id: number; size: { width: number; height: number }; scaleFactor: number }> => [],
            getPrimaryDisplay: (): { bounds: { x: number; y: number } } => ({ bounds: { x: 0, y: 0 } }),
            getDisplayNearestPoint: (): { id: number } => ({ id: 1 }),
        },
        dialog: {
            showOpenDialog: async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({ canceled: true, filePaths: [] }),
        },
    };
});

jest.mock('../main/powerpoint-control', () => ({
    __esModule: true,
    default: {
        setTarget: (): void => {
            return;
        },
        getOpenPresentations: (): unknown[] => [],
    },
}));

jest.mock('../main/imu-processor', () => ({
    __esModule: true,
    default: {
        startGyroCalibration: (): void => {
            return;
        },
        recenter: (): void => {
            return;
        },
    },
}));

jest.mock('../main/joycon', () => {
    return {
        __esModule: true,
        default: class JoyConManagerMock {},
    };
});

import { setupIpcHandlers } from '../main/ipc-handler';

type FakeWebContents = {
    send: (channel: string, payload?: unknown) => void;
    isLoading: () => boolean;
    once: (event: string, callback: () => void) => void;
};

type FakeWindow = {
    show: () => void;
    isDestroyed: () => boolean;
    webContents: FakeWebContents;
};

/**
 * タイマーウィンドウのモックを生成する。
 * @returns モックウィンドウ
 */
function createFakeTimerWindow(): FakeWindow {
    return {
        show: jest.fn(),
        isDestroyed: (): boolean => false,
        webContents: {
            send: jest.fn(),
            isLoading: (): boolean => false,
            once: jest.fn(),
        },
    };
}

/**
 * カウントダウン開始ハンドラを取得する。
 * @returns 開始ハンドラ
 */
function getStartCountdownHandler(): OnHandler {
    const handler = onHandlers.get('start-countdown-timer');
    if (!handler) {
        throw new Error('start-countdown-timer handler not found');
    }
    return handler;
}

describe('IPC回帰: タイマー開始', (): void => {
    beforeEach((): void => {
        onHandlers.clear();
        handleHandlers.clear();
    });

    it('タイマーウィンドウ未生成でも作成して開始できる', (): void => {
        const createdWindow = createFakeTimerWindow();
        const windowManager = {
            getTimerWindow: (): null => null,
            createTimerWindow: jest.fn((): FakeWindow => createdWindow),
            getCursorWindow: (): null => null,
            getMainWindow: (): null => null,
            getMessageWindow: (): null => null,
            createMessageWindow: (): null => null,
            createCursorWindow: (): void => {
                return;
            },
            sendLaunchErrorToMain: (): void => {
                return;
            },
            setTargetDisplay: (): void => {
                return;
            },
        };
        const joyconManager = {
            getConnectionStatus: (): { leftConnected: boolean; rightConnected: boolean } => ({ leftConnected: false, rightConnected: false }),
            connectAll: (): void => {
                return;
            },
            shutdownJoyCon: (): void => {
                return;
            },
            autoConnectL: false,
            autoConnectR: false,
        };

        setupIpcHandlers(
            windowManager as never,
            joyconManager as never,
        );
        const handler = getStartCountdownHandler();

        handler({}, 30);

        expect(windowManager.createTimerWindow).toHaveBeenCalledTimes(1);
        expect(createdWindow.show).toHaveBeenCalledTimes(1);
        expect(createdWindow.webContents.send).toHaveBeenNthCalledWith(1, 'set-timer-mode', 'timer');
        expect(createdWindow.webContents.send).toHaveBeenNthCalledWith(2, 'start-countdown', 30);
    });

    it('タイマーウィンドウが既にあれば再生成しない', (): void => {
        const existingWindow = createFakeTimerWindow();
        const windowManager = {
            getTimerWindow: (): FakeWindow => existingWindow,
            createTimerWindow: jest.fn((): FakeWindow => createFakeTimerWindow()),
            getCursorWindow: (): null => null,
            getMainWindow: (): null => null,
            getMessageWindow: (): null => null,
            createMessageWindow: (): null => null,
            createCursorWindow: (): void => {
                return;
            },
            sendLaunchErrorToMain: (): void => {
                return;
            },
            setTargetDisplay: (): void => {
                return;
            },
        };
        const joyconManager = {
            getConnectionStatus: (): { leftConnected: boolean; rightConnected: boolean } => ({ leftConnected: false, rightConnected: false }),
            connectAll: (): void => {
                return;
            },
            shutdownJoyCon: (): void => {
                return;
            },
            autoConnectL: false,
            autoConnectR: false,
        };

        setupIpcHandlers(
            windowManager as never,
            joyconManager as never,
        );
        const handler = getStartCountdownHandler();

        handler({}, 45);

        expect(windowManager.createTimerWindow).not.toHaveBeenCalled();
        expect(existingWindow.show).toHaveBeenCalledTimes(1);
        expect(existingWindow.webContents.send).toHaveBeenNthCalledWith(1, 'set-timer-mode', 'timer');
        expect(existingWindow.webContents.send).toHaveBeenNthCalledWith(2, 'start-countdown', 45);
    });
});
