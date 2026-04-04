import { createWifiTimerClient, normalizeWifiTimerBaseUrl } from '../main/wifi-timer-client';
import type {
    WifiTimerAudioStreamChunkResult,
    WifiTimerAudioStreamEndResult,
    WifiTimerAudioStreamStartResult,
    WifiTimerAudioTones,
    WifiTimerStatus,
    WifiTimerWifiInfo,
} from '../shared/wifi-timer-api-types';

type FetchResponse = {
    ok: boolean;
    status: number;
    text: () => Promise<string>;
};

describe('WiFi タイマークライアント', (): void => {
    const okResponse = (body: unknown): FetchResponse => ({
        ok: true,
        status: 200,
        text: async (): Promise<string> => JSON.stringify(body),
    });

    it('IP アドレスからベース URL を正規化する', (): void => {
        expect(normalizeWifiTimerBaseUrl('192.168.0.10')).toBe('http://192.168.0.10');
        expect(normalizeWifiTimerBaseUrl('http://192.168.0.10/')).toBe('http://192.168.0.10');
        expect(normalizeWifiTimerBaseUrl('')).toBe('');
    });

    it('無効時はリクエストしない', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>();
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await client.handleTimerStarted(120);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('開始時は set と start を順に呼ぶ', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse({ ok: true }));
        const client = createWifiTimerClient(fetchMock, { enabled: true, ipAddress: '192.168.0.10' });

        await client.handleTimerStarted(125);

        expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://192.168.0.10/api/set?seconds=125', { method: 'POST' });
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.0.10/api/start', { method: 'POST' });
    });

    it('一時停止と再開の API を呼ぶ', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse({ ok: true }));
        const client = createWifiTimerClient(fetchMock, { enabled: true, ipAddress: '192.168.0.10' });

        await client.handleTimerPaused();
        await client.handleTimerResumed();

        expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://192.168.0.10/api/pause', { method: 'POST' });
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.0.10/api/resume', { method: 'POST' });
    });

    it('状態取得 API を呼ぶ', async (): Promise<void> => {
        const status: WifiTimerStatus = {
            state: 'idle',
            initialSeconds: 60,
            remainingSeconds: 60,
            ip: '192.168.0.10',
            activeBrightness: 200,
            idleBrightness: 20,
            rotate180: false,
            alertVolume: 50,
            alertRepeatCount: 2,
            alertToneKind: 1,
            alertToneName: 'chirp',
            alertCustomSpeedPercent: 100,
            audioPlaying: false,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse(status));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.getStatus()).resolves.toEqual(status);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/status', { method: 'GET' });
    });

    it('音色カタログ取得 API を呼ぶ', async (): Promise<void> => {
        const audioTones: WifiTimerAudioTones = {
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
            tones: [
                { id: 0, name: 'beep', label: 'Beep', kind: 'builtin', available: true, testable: true },
                { id: 8, name: 'custom-stream', label: 'Custom Stream', kind: 'live-stream', available: true, testable: true, requiresLiveInput: true },
            ],
            defaults: {
                toneKind: 0,
                volume: 50,
                repeatCount: 1,
                customSpeed: 100,
            },
            current: {
                toneKind: 8,
                volume: 70,
                repeatCount: 2,
                customSpeed: 110,
            },
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse(audioTones));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.getAudioTones()).resolves.toEqual(audioTones);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/audio/tones', { method: 'GET' });
    });

    it('表示設定更新は brightness と orientation を順に呼ぶ', async (): Promise<void> => {
        const status: WifiTimerStatus = {
            state: 'idle',
            initialSeconds: 10,
            remainingSeconds: 10,
            ip: '192.168.0.10',
            activeBrightness: 180,
            idleBrightness: 12,
            rotate180: true,
            alertVolume: 20,
            alertRepeatCount: 3,
            alertToneKind: 0,
            alertToneName: 'beep',
            alertCustomSpeedPercent: 100,
            audioPlaying: false,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValueOnce(okResponse(status))
            .mockResolvedValueOnce(okResponse(status));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.updateDisplaySettings({ activeBrightness: 180, idleBrightness: 12, rotate180: true })).resolves.toEqual(status);
        expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://192.168.0.10/api/brightness?active=180&idle=12', { method: 'POST' });
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.0.10/api/display/orientation?rotate180=1', { method: 'POST' });
    });

    it('WiFi プロファイル保存 API を呼ぶ', async (): Promise<void> => {
        const wifiInfo: WifiTimerWifiInfo = {
            ready: true,
            currentSsid: 'office',
            ip: '192.168.0.10',
            activeProfileIndex: 1,
            reconnectPending: false,
            apMode: false,
            profiles: [{ id: 1, ssid: 'office', active: true, connected: true }],
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse(wifiInfo));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.saveWifiProfile({ ssid: 'office', password: 'secret' })).resolves.toEqual(wifiInfo);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/wifi/save?ssid=office&password=secret', { method: 'POST' });
    });

    it('再起動は有効フラグに依存せず実行する', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse({ ok: true, message: 'rebooting' }));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.reboot()).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/reboot', { method: 'POST' });
    });

    it('音設定試聴 API を呼ぶ', async (): Promise<void> => {
        const status: WifiTimerStatus = {
            state: 'idle',
            initialSeconds: 10,
            remainingSeconds: 10,
            ip: '192.168.0.10',
            activeBrightness: 200,
            idleBrightness: 20,
            rotate180: false,
            alertVolume: 70,
            alertRepeatCount: 2,
            alertToneKind: 3,
            alertToneName: 'arpeggio',
            alertCustomSpeedPercent: 100,
            audioPlaying: true,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse(status));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.testAudioSettings({ toneKind: 3, volume: 70, repeatCount: 2, customSpeed: 100 })).resolves.toEqual(status);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/audio/test?toneKind=3&volume=70&repeatCount=2&customSpeed=100', { method: 'POST' });
    });

    it('音設定更新で customSpeed を送る', async (): Promise<void> => {
        const status: WifiTimerStatus = {
            state: 'idle',
            initialSeconds: 20,
            remainingSeconds: 20,
            ip: '192.168.0.10',
            activeBrightness: 100,
            idleBrightness: 10,
            rotate180: false,
            alertVolume: 80,
            alertRepeatCount: 4,
            alertToneKind: 8,
            alertToneName: 'custom-stream',
            alertCustomSpeedPercent: 115,
            audioPlaying: false,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValue(okResponse(status));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.updateAudioSettings({ toneKind: 8, volume: 80, repeatCount: 4, customSpeed: 115 })).resolves.toEqual(status);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/audio?toneKind=8&volume=80&repeatCount=4&customSpeed=115', { method: 'POST' });
    });

    it('ローカル音声ストリーム開始 API を呼ぶ', async (): Promise<void> => {
        const startResult: WifiTimerAudioStreamStartResult = {
            ok: true,
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            maxBufferedBytes: 98304,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string; body?: BodyInit; headers?: Record<string, string> } | undefined]>()
            .mockResolvedValue(okResponse(startResult));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.startAudioStream({ volume: 55, sampleRate: 16000 })).resolves.toEqual(startResult);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/audio/stream/start?volume=55&sampleRate=16000', { method: 'POST' });
    });

    it('ローカル音声ストリームチャンク送信 API を呼ぶ', async (): Promise<void> => {
        const chunkResult: WifiTimerAudioStreamChunkResult = {
            bufferedBytes: 4096,
            maxBufferedBytes: 98304,
            bytes: 4096,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string; body?: BodyInit; headers?: Record<string, string> } | undefined]>()
            .mockResolvedValue(okResponse(chunkResult));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.sendAudioStreamChunk(new Uint8Array([1, 2, 3, 4]))).resolves.toEqual(chunkResult);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBe('http://192.168.0.10/api/audio/stream/chunk');
        expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
        expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
    });

    it('ローカル音声ストリーム終了 API を呼ぶ', async (): Promise<void> => {
        const endResult: WifiTimerAudioStreamEndResult = {
            ok: true,
            elapsedMs: 1200,
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string; body?: BodyInit; headers?: Record<string, string> } | undefined]>()
            .mockResolvedValue(okResponse(endResult));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.endAudioStream()).resolves.toEqual(endResult);
        expect(fetchMock).toHaveBeenCalledWith('http://192.168.0.10/api/audio/stream/end', { method: 'POST' });
    });

    it('ローカル音声ストリーム中断 API と音量更新 API を呼ぶ', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string; body?: BodyInit; headers?: Record<string, string> } | undefined]>()
            .mockResolvedValue(okResponse({ ok: true }));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.cancelAudioStream()).resolves.toBeUndefined();
        await expect(client.updateAudioStreamVolume(65)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://192.168.0.10/api/audio/stream/cancel', { method: 'POST' });
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.0.10/api/audio/stream/volume?volume=65', { method: 'POST' });
    });

    it('WiFi プロファイル移動 API を呼ぶ', async (): Promise<void> => {
        const wifiInfo: WifiTimerWifiInfo = {
            ready: true,
            currentSsid: 'office',
            ip: '192.168.0.10',
            activeProfileIndex: 1,
            reconnectPending: false,
            apMode: false,
            profiles: [{ id: 1, ssid: 'office', active: true, connected: true }],
        };
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>()
            .mockResolvedValueOnce(okResponse(wifiInfo))
            .mockResolvedValueOnce(okResponse(wifiInfo));
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '192.168.0.10' });

        await expect(client.moveUpWifiProfile(1)).resolves.toEqual(wifiInfo);
        await expect(client.moveDownWifiProfile(1)).resolves.toEqual(wifiInfo);
        expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://192.168.0.10/api/wifi/move-up?id=1', { method: 'POST' });
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.0.10/api/wifi/move-down?id=1', { method: 'POST' });
    });

    it('管理系 API は IP 未設定時に失敗する', async (): Promise<void> => {
        const fetchMock = jest.fn<Promise<FetchResponse>, [string, { method?: string } | undefined]>();
        const client = createWifiTimerClient(fetchMock, { enabled: false, ipAddress: '' });

        await expect(client.getWifiInfo()).rejects.toThrow('WiFi timer IP address is not configured');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
