import type { IpcMain, IpcMainEvent } from 'electron';
import { registerMainIpcHandlers } from '../main/main-ipc-registration';

type Listener = (event: IpcMainEvent, ...args: unknown[]) => void;

type IpcMainMock = {
    on: (channel: string, listener: Listener) => void;
    listenerCount: (channel: string) => number;
    listeners: Record<string, Listener>;
};

type JoyConRumbleApiMock = {
    playRumblePattern: jest.Mock<void, [Array<{ on: boolean; durationMs: number }>]>;
    getConnectionStatus?: jest.Mock<{ leftConnected: boolean; rightConnected: boolean }, []>;
    connectAll?: jest.Mock<void, []>;
};

/**
 * テスト用の IPC モックを生成する。
 * @returns IPC モック
 */
function createIpcMainMock(): IpcMainMock {
    const listeners: Record<string, Listener> = {};
    return {
        on: (channel: string, listener: Listener): void => {
            listeners[channel] = listener;
        },
        listenerCount: (): number => 0,
        listeners,
    };
}

/**
 * main IPC 登録の依存を組み立てる。
 * @param joyConRumbleApi Joy-Con 振動 API モック
 * @returns 登録に必要な引数
 */
function createRegisterOptions(joyConRumbleApi: JoyConRumbleApiMock): {
    ipcMain: IpcMain;
    options: Parameters<typeof registerMainIpcHandlers>[0];
    listeners: Record<string, Listener>;
} {
    const ipcMainMock = createIpcMainMock();
    const options: Parameters<typeof registerMainIpcHandlers>[0] = {
        ipcMain: ipcMainMock as unknown as IpcMain,
        windowManager: {
            getCursorWindow: () => null,
            getTimerWindow: () => null,
            getMainWindow: () => null,
        },
        joyConRumbleApi,
        state: {
            setCursorMapConfig: (): void => {},
            setCursorVisibility: (): void => {},
            setCountdownInitialValue: (): void => {},
            getCountdownInitialValue: (): number => 10,
            getTimerState: () => ({ isCounting: false, isPaused: false }),
            setTimerState: (): void => {},
            setSoundPlayDelayMs: (): void => {},
        },
        toggleTimerWindowVisibility: (): void => {},
    };
    return { ipcMain: ipcMainMock as unknown as IpcMain, options, listeners: ipcMainMock.listeners };
}

describe('main IPC の振動トリガー', (): void => {
    it('通知で振動有効ならパターン再生する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
            getConnectionStatus: jest.fn(() => ({ leftConnected: true, rightConnected: false })),
            connectAll: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['timer-notification-trigger']?.({} as IpcMainEvent, 5, true);

        expect(joyConRumbleApi.playRumblePattern).toHaveBeenCalledTimes(1);
        expect(joyConRumbleApi.connectAll).not.toHaveBeenCalled();
    });

    it('振動無効なら再生しない', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
            getConnectionStatus: jest.fn(() => ({ leftConnected: true, rightConnected: true })),
            connectAll: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['timer-notification-trigger']?.({} as IpcMainEvent, 5, false);

        expect(joyConRumbleApi.playRumblePattern).not.toHaveBeenCalled();
    });

    it('未接続時は再接続を試行して即時再生を抑止する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
            getConnectionStatus: jest.fn(() => ({ leftConnected: false, rightConnected: false })),
            connectAll: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['timer-notification-trigger']?.({} as IpcMainEvent, 5, true);

        expect(joyConRumbleApi.connectAll).toHaveBeenCalledTimes(1);
        expect(joyConRumbleApi.playRumblePattern).not.toHaveBeenCalled();
    });

    it('接続確認 API がなくても再生できる', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['timer-notification-trigger']?.({} as IpcMainEvent, 5, true);

        expect(joyConRumbleApi.playRumblePattern).toHaveBeenCalledTimes(1);
    });

    it('不正なcountdown-initial-valueは状態更新しない', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);
        const setCountdownInitialValue = jest.fn();
        options.state.setCountdownInitialValue = setCountdownInitialValue;

        registerMainIpcHandlers(options);
        listeners['countdown-initial-value']?.({} as IpcMainEvent, 'invalid');

        expect(setCountdownInitialValue).not.toHaveBeenCalled();
    });

    it('不正なtimer-notification-triggerのshouldRumble値では再生しない', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
            getConnectionStatus: jest.fn(() => ({ leftConnected: true, rightConnected: true })),
            connectAll: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['timer-notification-trigger']?.({} as IpcMainEvent, 5, 'true');

        expect(joyConRumbleApi.playRumblePattern).not.toHaveBeenCalled();
    });

    it('不正なupdate-timer-notificationsでは配信しない', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);
        const send = jest.fn();
        const mockWindow = {
            isDestroyed: (): boolean => false,
            webContents: { send },
        } as unknown as { isDestroyed: () => boolean; webContents: { send: jest.Mock } };
        options.windowManager = {
            getCursorWindow: (): unknown => mockWindow,
            getTimerWindow: (): unknown => null,
            getMainWindow: (): unknown => null,
        } as unknown as Parameters<typeof registerMainIpcHandlers>[0]['windowManager'];

        registerMainIpcHandlers(options);
        listeners['update-timer-notifications']?.(
            {} as IpcMainEvent,
            [{ time: 'invalid', filename: 'a.mp3', absolutePath: 'C:\\a.mp3' }],
        );

        expect(send).not.toHaveBeenCalled();
    });
});
