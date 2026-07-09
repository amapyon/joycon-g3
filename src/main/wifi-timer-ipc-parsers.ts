import type {
    WifiTimerAudioSettings,
    WifiTimerAudioStreamStartInput,
    WifiTimerDisplaySettings,
    WifiTimerWifiProfileInput,
} from '../shared/wifi-timer-api-types';

/**
 * WiFi タイマーの表示設定入力を検証する。
 * @param value 入力値
 * @returns 正常化済み設定
 */
export function parseWifiTimerDisplaySettings(value: unknown): WifiTimerDisplaySettings {
    if (
        typeof value !== 'object' || value === null
        || typeof (value as { activeBrightness?: unknown }).activeBrightness !== 'number'
        || typeof (value as { idleBrightness?: unknown }).idleBrightness !== 'number'
        || typeof (value as { rotate180?: unknown }).rotate180 !== 'boolean'
        || typeof (value as { colorEffect?: unknown }).colorEffect !== 'object'
        || (value as { colorEffect?: unknown }).colorEffect === null
        || typeof (value as { colorEffect: { stage1Seconds?: unknown } }).colorEffect.stage1Seconds !== 'number'
        || typeof (value as { colorEffect: { stage2Seconds?: unknown } }).colorEffect.stage2Seconds !== 'number'
        || typeof (value as { colorEffect: { stage3Seconds?: unknown } }).colorEffect.stage3Seconds !== 'number'
        || typeof (value as { colorEffect: { blinkSeconds?: unknown } }).colorEffect.blinkSeconds !== 'number'
        || typeof (value as { colorEffect: { blinkIntervalMs?: unknown } }).colorEffect.blinkIntervalMs !== 'number'
        || typeof (value as { colorEffect: { stage1Color?: unknown } }).colorEffect.stage1Color !== 'string'
        || typeof (value as { colorEffect: { stage2Color?: unknown } }).colorEffect.stage2Color !== 'string'
        || typeof (value as { colorEffect: { stage3Color?: unknown } }).colorEffect.stage3Color !== 'string'
        || typeof (value as { colorEffect: { alertColor?: unknown } }).colorEffect.alertColor !== 'string'
    ) {
        throw new Error('invalid WiFi timer display settings');
    }
    return {
        activeBrightness: (value as { activeBrightness: number }).activeBrightness,
        idleBrightness: (value as { idleBrightness: number }).idleBrightness,
        rotate180: (value as { rotate180: boolean }).rotate180,
        colorEffect: {
            stage1Seconds: (value as { colorEffect: { stage1Seconds: number } }).colorEffect.stage1Seconds,
            stage2Seconds: (value as { colorEffect: { stage2Seconds: number } }).colorEffect.stage2Seconds,
            stage3Seconds: (value as { colorEffect: { stage3Seconds: number } }).colorEffect.stage3Seconds,
            blinkSeconds: (value as { colorEffect: { blinkSeconds: number } }).colorEffect.blinkSeconds,
            blinkIntervalMs: (value as { colorEffect: { blinkIntervalMs: number } }).colorEffect.blinkIntervalMs,
            stage1Color: (value as { colorEffect: { stage1Color: string } }).colorEffect.stage1Color,
            stage2Color: (value as { colorEffect: { stage2Color: string } }).colorEffect.stage2Color,
            stage3Color: (value as { colorEffect: { stage3Color: string } }).colorEffect.stage3Color,
            alertColor: (value as { colorEffect: { alertColor: string } }).colorEffect.alertColor,
        },
    };
}

/**
 * WiFi タイマーの音設定入力を検証する。
 * @param value 入力値
 * @returns 正常化済み設定
 */
export function parseWifiTimerAudioSettings(value: unknown): WifiTimerAudioSettings {
    if (
        typeof value !== 'object' || value === null
        || typeof (value as { toneKind?: unknown }).toneKind !== 'number'
        || typeof (value as { volume?: unknown }).volume !== 'number'
        || typeof (value as { repeatCount?: unknown }).repeatCount !== 'number'
        || typeof (value as { customSpeed?: unknown }).customSpeed !== 'number'
    ) {
        throw new Error('invalid WiFi timer audio settings');
    }
    return {
        toneKind: (value as { toneKind: number }).toneKind,
        volume: (value as { volume: number }).volume,
        repeatCount: (value as { repeatCount: number }).repeatCount,
        customSpeed: (value as { customSpeed: number }).customSpeed,
    };
}

/**
 * WiFi タイマーのローカル音声ストリーム開始入力を検証する。
 * @param value 入力値
 * @returns 正常化済み入力
 */
export function parseWifiTimerAudioStreamStartInput(value: unknown): WifiTimerAudioStreamStartInput {
    if (
        typeof value !== 'object' || value === null
        || typeof (value as { volume?: unknown }).volume !== 'number'
        || typeof (value as { sampleRate?: unknown }).sampleRate !== 'number'
    ) {
        throw new Error('invalid WiFi timer audio stream start input');
    }
    return {
        volume: (value as { volume: number }).volume,
        sampleRate: (value as { sampleRate: number }).sampleRate,
    };
}

/**
 * WiFi タイマーのローカル音声ストリームチャンクを検証する。
 * @param value 入力値
 * @returns 正常化済みチャンク
 */
export function parseWifiTimerAudioStreamChunk(value: unknown): Uint8Array {
    if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    }
    throw new Error('invalid WiFi timer audio stream chunk');
}

/**
 * WiFi プロファイル入力を検証する。
 * @param value 入力値
 * @returns 正常化済み入力
 */
export function parseWifiTimerWifiProfileInput(value: unknown): WifiTimerWifiProfileInput {
    if (
        typeof value !== 'object' || value === null
        || typeof (value as { ssid?: unknown }).ssid !== 'string'
        || typeof (value as { password?: unknown }).password !== 'string'
    ) {
        throw new Error('invalid WiFi timer Wi-Fi profile');
    }
    return {
        ssid: (value as { ssid: string }).ssid,
        password: (value as { password: string }).password,
    };
}

/**
 * WiFi プロファイル ID を検証する。
 * @param value 入力値
 * @returns プロファイル ID
 */
export function parseWifiTimerProfileId(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new Error('invalid WiFi timer Wi-Fi profile id');
    }
    return value;
}

/**
 * カスタム音ファイル名を検証する。
 * @param value 入力値
 * @returns ファイル名
 */
export function parseWifiTimerCustomAudioName(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error('invalid WiFi timer custom audio name');
    }
    return value.trim();
}

/**
 * カスタム音アップロード入力を検証する。
 * @param value 入力値
 * @returns 正常化済み入力
 */
export function parseWifiTimerCustomAudioUploadInput(value: unknown): { name: string; audio: Uint8Array } {
    if (
        typeof value !== 'object'
        || value === null
        || typeof (value as { name?: unknown }).name !== 'string'
    ) {
        throw new Error('invalid WiFi timer custom audio upload input');
    }
    return {
        name: parseWifiTimerCustomAudioName((value as { name: string }).name),
        audio: parseWifiTimerAudioStreamChunk((value as { audio?: unknown }).audio),
    };
}

/**
 * カスタム音リネーム入力を検証する。
 * @param value 入力値
 * @returns 正常化済み入力
 */
export function parseWifiTimerCustomAudioRenameInput(value: unknown): { oldName: string; newName: string } {
    if (
        typeof value !== 'object'
        || value === null
        || typeof (value as { oldName?: unknown }).oldName !== 'string'
        || typeof (value as { newName?: unknown }).newName !== 'string'
    ) {
        throw new Error('invalid WiFi timer custom audio rename input');
    }
    return {
        oldName: parseWifiTimerCustomAudioName((value as { oldName: string }).oldName),
        newName: parseWifiTimerCustomAudioName((value as { newName: string }).newName),
    };
}

/**
 * カスタム音試聴入力を検証する。
 * @param value 入力値
 * @returns 正常化済み入力
 */
export function parseWifiTimerCustomAudioTestInput(value: unknown): { name: string; settings: WifiTimerAudioSettings } {
    if (
        typeof value !== 'object'
        || value === null
        || typeof (value as { name?: unknown }).name !== 'string'
    ) {
        throw new Error('invalid WiFi timer custom audio test input');
    }
    return {
        name: parseWifiTimerCustomAudioName((value as { name: string }).name),
        settings: parseWifiTimerAudioSettings((value as { settings?: unknown }).settings),
    };
}
