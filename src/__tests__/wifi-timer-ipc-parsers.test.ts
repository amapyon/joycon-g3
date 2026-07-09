import {
    parseWifiTimerAudioSettings,
    parseWifiTimerAudioStreamChunk,
    parseWifiTimerCustomAudioName,
    parseWifiTimerDisplaySettings,
    parseWifiTimerProfileId,
} from '../main/wifi-timer-ipc-parsers';

describe('wifi-timer-ipc-parsers', () => {
    test('WiFi タイマー表示設定を検証して返す', () => {
        const settings = {
            activeBrightness: 80,
            idleBrightness: 10,
            rotate180: false,
            colorEffect: {
                stage1Seconds: 60,
                stage2Seconds: 45,
                stage3Seconds: 30,
                blinkSeconds: 10,
                blinkIntervalMs: 400,
                stage1Color: '#ffffff',
                stage2Color: '#ffff00',
                stage3Color: '#ff0000',
                alertColor: '#ff0000',
            },
        };

        expect(parseWifiTimerDisplaySettings(settings)).toEqual(settings);
    });

    test('WiFi タイマー音設定の不正値を拒否する', () => {
        expect(() => parseWifiTimerAudioSettings({ toneKind: 1, volume: '50' })).toThrow('invalid WiFi timer audio settings');
    });

    test('音声ストリームチャンクを Uint8Array に変換する', () => {
        const chunk = parseWifiTimerAudioStreamChunk(new Uint16Array([1, 2]));

        expect(chunk).toBeInstanceOf(Uint8Array);
        expect(chunk.byteLength).toBe(4);
    });

    test('カスタム音名をトリムする', () => {
        expect(parseWifiTimerCustomAudioName(' alert.wav ')).toBe('alert.wav');
    });

    test('WiFi プロファイル ID は整数だけ許可する', () => {
        expect(parseWifiTimerProfileId(3)).toBe(3);
        expect(() => parseWifiTimerProfileId(1.5)).toThrow('invalid WiFi timer Wi-Fi profile id');
    });
});
