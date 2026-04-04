import type { IpcMain, IpcMainEvent } from 'electron';
import { registerMainIpcHandlers } from '../main/main-ipc-registration';
import type {
    WifiTimerAudioStreamChunkResult,
    WifiTimerAudioStreamEndResult,
    WifiTimerAudioStreamStartResult,
    WifiTimerAudioTones,
    WifiTimerCapabilities,
    WifiTimerCustomAudioList,
    WifiTimerStatus,
    WifiTimerWifiInfo,
} from '../shared/wifi-timer-api-types';

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

type WifiTimerClientApiMock = {
    updateSettings: jest.Mock<void, [{ enabled: boolean; ipAddress: string }]>;
    syncInitialValue: jest.Mock<Promise<void>, [number]>;
    handleTimerStarted: jest.Mock<Promise<void>, [number]>;
    handleTimerPaused: jest.Mock<Promise<void>, []>;
    handleTimerResumed: jest.Mock<Promise<void>, []>;
    getCapabilities: jest.Mock<Promise<WifiTimerCapabilities>, []>;
    getAudioTones: jest.Mock<Promise<WifiTimerAudioTones>, []>;
    getCustomAudioList: jest.Mock<Promise<WifiTimerCustomAudioList>, []>;
    getStatus: jest.Mock<Promise<WifiTimerStatus>, []>;
    updateDisplaySettings: jest.Mock<Promise<WifiTimerStatus>, [object]>;
    updateAudioSettings: jest.Mock<Promise<WifiTimerStatus>, [object]>;
    testAudioSettings: jest.Mock<Promise<WifiTimerStatus>, [object]>;
    uploadCustomAudio: jest.Mock<Promise<Record<string, unknown>>, [string, Uint8Array]>;
    selectCustomAudio: jest.Mock<Promise<Record<string, unknown>>, [string]>;
    testCustomAudio: jest.Mock<Promise<WifiTimerStatus>, [string, object]>;
    deleteCustomAudio: jest.Mock<Promise<Record<string, unknown>>, [string]>;
    renameCustomAudio: jest.Mock<Promise<Record<string, unknown>>, [string, string]>;
    startAudioStream: jest.Mock<Promise<WifiTimerAudioStreamStartResult>, [object]>;
    sendAudioStreamChunk: jest.Mock<Promise<WifiTimerAudioStreamChunkResult>, [Uint8Array]>;
    endAudioStream: jest.Mock<Promise<WifiTimerAudioStreamEndResult>, []>;
    cancelAudioStream: jest.Mock<Promise<void>, []>;
    updateAudioStreamVolume: jest.Mock<Promise<void>, [number]>;
    pauseAudioStream: jest.Mock<Promise<WifiTimerStatus>, []>;
    resumeAudioStream: jest.Mock<Promise<WifiTimerStatus>, []>;
    getWifiInfo: jest.Mock<Promise<WifiTimerWifiInfo>, []>;
    saveWifiProfile: jest.Mock<Promise<WifiTimerWifiInfo>, [object]>;
    deleteWifiProfile: jest.Mock<Promise<WifiTimerWifiInfo>, [number]>;
    connectWifiProfile: jest.Mock<Promise<WifiTimerWifiInfo>, [number]>;
    moveUpWifiProfile: jest.Mock<Promise<WifiTimerWifiInfo>, [number]>;
    moveDownWifiProfile: jest.Mock<Promise<WifiTimerWifiInfo>, [number]>;
    reboot: jest.Mock<Promise<void>, []>;
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
    wifiTimerClient: WifiTimerClientApiMock;
} {
    const ipcMainMock = createIpcMainMock();
    const statusFallback: WifiTimerStatus = {
        state: 'idle',
        initialSeconds: 10,
        remainingSeconds: 10,
        ip: '192.168.0.10',
        activeBrightness: 255,
        idleBrightness: 32,
        rotate180: false,
        displayColorEffect: {
            stage1Seconds: 30,
            stage2Seconds: 10,
            stage3Seconds: 10,
            blinkSeconds: 0,
            blinkIntervalMs: 500,
            stage1Color: '#ffffff',
            stage2Color: '#ffff00',
            stage3Color: '#ff0000',
            alertColor: '#ff0000',
        },
        alertVolume: 50,
        alertRepeatCount: 1,
        alertToneKind: 0,
        alertToneName: 'beep',
        alertCustomSpeedPercent: 100,
        audioPlaying: false,
        audioStreamPaused: false,
    };
    const wifiInfoFallback: WifiTimerWifiInfo = {
        ready: true,
        currentSsid: 'test',
        ip: '192.168.0.10',
        activeProfileIndex: 0,
        reconnectPending: false,
        apMode: false,
        profiles: [],
    };
    const capabilitiesFallback: WifiTimerCapabilities = {
        deviceType: 'led-timer',
        apiVersion: '1.3.0',
        openapi: '/openapi.json',
        features: ['timer-control'],
        endpoints: {},
    };
    const audioTonesFallback: WifiTimerAudioTones = {
        apiVersion: '1.0',
        limits: {
            toneIdMin: 0,
            toneIdMax: 8,
            volumeMin: 0,
            volumeMax: 100,
            repeatCountMin: 1,
            repeatCountMax: 20,
            customSpeedMin: 60,
            customSpeedMax: 120,
        },
        tones: [],
        defaults: {
            toneKind: 0,
            volume: 50,
            repeatCount: 1,
            customSpeed: 100,
        },
        current: {
            toneKind: 0,
            volume: 50,
            repeatCount: 1,
            customSpeed: 100,
        },
    };
    const wifiTimerClient: WifiTimerClientApiMock = {
        updateSettings: jest.fn(),
        syncInitialValue: jest.fn().mockResolvedValue(undefined),
        handleTimerStarted: jest.fn().mockResolvedValue(undefined),
        handleTimerPaused: jest.fn().mockResolvedValue(undefined),
        handleTimerResumed: jest.fn().mockResolvedValue(undefined),
        getCapabilities: jest.fn().mockResolvedValue(capabilitiesFallback),
        getAudioTones: jest.fn().mockResolvedValue(audioTonesFallback),
        getCustomAudioList: jest.fn().mockResolvedValue({ files: [], activeName: '', storage: {} }),
        getStatus: jest.fn().mockResolvedValue(statusFallback),
        updateDisplaySettings: jest.fn().mockResolvedValue(statusFallback),
        updateAudioSettings: jest.fn().mockResolvedValue(statusFallback),
        testAudioSettings: jest.fn().mockResolvedValue(statusFallback),
        uploadCustomAudio: jest.fn().mockResolvedValue({ ok: true }),
        selectCustomAudio: jest.fn().mockResolvedValue({ ok: true }),
        testCustomAudio: jest.fn().mockResolvedValue(statusFallback),
        deleteCustomAudio: jest.fn().mockResolvedValue({ ok: true }),
        renameCustomAudio: jest.fn().mockResolvedValue({ ok: true }),
        startAudioStream: jest.fn().mockResolvedValue({
            ok: true,
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            maxBufferedBytes: 98304,
        }),
        sendAudioStreamChunk: jest.fn().mockResolvedValue({
            bufferedBytes: 0,
            maxBufferedBytes: 98304,
            bytes: 0,
        }),
        endAudioStream: jest.fn().mockResolvedValue({ ok: true }),
        cancelAudioStream: jest.fn().mockResolvedValue(undefined),
        updateAudioStreamVolume: jest.fn().mockResolvedValue(undefined),
        pauseAudioStream: jest.fn().mockResolvedValue(statusFallback),
        resumeAudioStream: jest.fn().mockResolvedValue(statusFallback),
        getWifiInfo: jest.fn().mockResolvedValue(wifiInfoFallback),
        saveWifiProfile: jest.fn().mockResolvedValue(wifiInfoFallback),
        deleteWifiProfile: jest.fn().mockResolvedValue(wifiInfoFallback),
        connectWifiProfile: jest.fn().mockResolvedValue(wifiInfoFallback),
        moveUpWifiProfile: jest.fn().mockResolvedValue(wifiInfoFallback),
        moveDownWifiProfile: jest.fn().mockResolvedValue(wifiInfoFallback),
        reboot: jest.fn().mockResolvedValue(undefined),
    };
    const options: Parameters<typeof registerMainIpcHandlers>[0] = {
        ipcMain: ipcMainMock as unknown as IpcMain,
        windowManager: {
            getCursorWindow: () => null,
            getTimerWindow: () => null,
            getMainWindow: () => null,
        },
        joyConRumbleApi,
        wifiTimerClient,
        state: {
            setCursorMapConfig: (): void => {},
            setPointerMotionSettings: (): void => {},
            setCursorVisibility: (): void => {},
            setCountdownInitialValue: (): void => {},
            getCountdownInitialValue: (): number => 10,
            getTimerState: () => ({ isCounting: false, isPaused: false }),
            setTimerState: (): void => {},
            setSoundPlayDelayMs: (): void => {},
        },
        toggleTimerWindowVisibility: (): void => {},
    };
    return { ipcMain: ipcMainMock as unknown as IpcMain, options, listeners: ipcMainMock.listeners, wifiTimerClient };
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

    it('有効なWiFiタイマー設定ならメイン側へ反映する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['update-wifi-timer-settings']?.({} as IpcMainEvent, { enabled: true, ipAddress: ' 192.168.0.10 ' });

        expect(wifiTimerClient.updateSettings).toHaveBeenCalledWith({ enabled: true, ipAddress: '192.168.0.10' });
    });

    it('不正なWiFiタイマー設定は無視する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);

        registerMainIpcHandlers(options);
        listeners['update-wifi-timer-settings']?.({} as IpcMainEvent, { enabled: 'yes', ipAddress: '192.168.0.10' });

        expect(wifiTimerClient.updateSettings).not.toHaveBeenCalled();
    });

    it('有効なpointer-motion-settingsなら状態更新する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);
        const setPointerMotionSettings = jest.fn();
        options.state.setPointerMotionSettings = setPointerMotionSettings;

        registerMainIpcHandlers(options);
        listeners['update-pointer-motion-settings']?.({} as IpcMainEvent, { moveSpeed: 0.02, gyroDeadzone: 180 });

        expect(setPointerMotionSettings).toHaveBeenCalledWith({ moveSpeed: 0.02, gyroDeadzone: 180 });
    });

    it('不正なpointer-motion-settingsでは状態更新しない', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners } = createRegisterOptions(joyConRumbleApi);
        const setPointerMotionSettings = jest.fn();
        options.state.setPointerMotionSettings = setPointerMotionSettings;

        registerMainIpcHandlers(options);
        listeners['update-pointer-motion-settings']?.({} as IpcMainEvent, { moveSpeed: 'fast', gyroDeadzone: 180 });

        expect(setPointerMotionSettings).not.toHaveBeenCalled();
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

    it('countdown-initial-value 更新時に WiFi タイマーへも秒数を同期する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);
        let countdownInitialValue = 10;
        options.state.setCountdownInitialValue = (value: number): void => {
            countdownInitialValue = value;
        };
        options.state.getCountdownInitialValue = (): number => countdownInitialValue;

        registerMainIpcHandlers(options);
        listeners['countdown-initial-value']?.({} as IpcMainEvent, 90);

        expect(wifiTimerClient.syncInitialValue).toHaveBeenCalledWith(90);
    });

    it('タイマー開始時に WiFi タイマー開始を同期する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);
        let timerState = { isCounting: false, isPaused: false };
        options.state.getTimerState = (): typeof timerState => timerState;
        options.state.setTimerState = (nextState: typeof timerState): void => {
            timerState = nextState;
        };
        options.state.getCountdownInitialValue = (): number => 180;

        registerMainIpcHandlers(options);
        listeners['timer-status-update']?.({} as IpcMainEvent, true);

        expect(wifiTimerClient.handleTimerStarted).toHaveBeenCalledWith(180);
    });

    it('タイマー一時停止時に WiFi タイマー一時停止を同期する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);
        let timerState = { isCounting: true, isPaused: false };
        options.state.getTimerState = (): typeof timerState => timerState;
        options.state.setTimerState = (nextState: typeof timerState): void => {
            timerState = nextState;
        };

        registerMainIpcHandlers(options);
        listeners['timer-pause-update']?.({} as IpcMainEvent, true);

        expect(wifiTimerClient.handleTimerPaused).toHaveBeenCalledTimes(1);
    });

    it('一時停止解除時に WiFi タイマー再開を同期する', (): void => {
        const joyConRumbleApi: JoyConRumbleApiMock = {
            playRumblePattern: jest.fn(),
        };
        const { options, listeners, wifiTimerClient } = createRegisterOptions(joyConRumbleApi);
        let timerState = { isCounting: true, isPaused: true };
        options.state.getTimerState = (): typeof timerState => timerState;
        options.state.setTimerState = (nextState: typeof timerState): void => {
            timerState = nextState;
        };

        registerMainIpcHandlers(options);
        listeners['timer-pause-update']?.({} as IpcMainEvent, false);

        expect(wifiTimerClient.handleTimerResumed).toHaveBeenCalledTimes(1);
    });
});
