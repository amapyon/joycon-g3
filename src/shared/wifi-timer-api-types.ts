/**
 * WiFi タイマーの状態。
 */
export type WifiTimerStatus = {
    state: 'idle' | 'running' | 'paused' | 'finished';
    initialSeconds: number;
    remainingSeconds: number;
    ip: string;
    activeBrightness: number;
    idleBrightness: number;
    rotate180: boolean;
    alertVolume: number;
    alertRepeatCount: number;
    alertToneKind: number;
    alertToneName: string;
    alertCustomSpeedPercent: number;
    audioPlaying: boolean;
};

/**
 * WiFi タイマーの連携メタ情報。
 */
export type WifiTimerCapabilities = {
    deviceType: string;
    apiVersion: string;
    openapi: string;
    features: string[];
    endpoints: Record<string, string>;
};

/**
 * 音色カタログ API の入力制約。
 */
export type WifiTimerAudioToneLimits = {
    toneIdMin: number;
    toneIdMax: number;
    volumeMin: number;
    volumeMax: number;
    repeatCountMin: number;
    repeatCountMax: number;
    customSpeedMin: number;
    customSpeedMax: number;
};

/**
 * 音色カタログの各音色定義。
 */
export type WifiTimerAudioTone = {
    id: number;
    name: string;
    label: string;
    kind: 'builtin' | 'custom-file' | 'live-stream';
    available: boolean;
    testable: boolean;
    bytes?: number;
    durationMs?: number;
    requiresLiveInput?: boolean;
};

/**
 * WiFi 設定のプロファイル。
 */
export type WifiTimerWifiProfile = {
    id: number;
    ssid: string;
    active: boolean;
    connected: boolean;
};

/**
 * WiFi タイマーの WiFi 状態。
 */
export type WifiTimerWifiInfo = {
    ready: boolean;
    currentSsid: string;
    ip: string;
    activeProfileIndex: number;
    reconnectPending: boolean;
    apMode: boolean;
    profiles: WifiTimerWifiProfile[];
};

/**
 * 表示設定更新入力。
 */
export type WifiTimerDisplaySettings = {
    activeBrightness: number;
    idleBrightness: number;
    rotate180: boolean;
};

/**
 * 音設定更新入力。
 */
export type WifiTimerAudioSettings = {
    toneKind: number;
    volume: number;
    repeatCount: number;
    customSpeed: number;
};

/**
 * ローカル音声ストリーム開始入力。
 */
export type WifiTimerAudioStreamStartInput = {
    volume: number;
    sampleRate: number;
};

/**
 * ローカル音声ストリーム開始結果。
 */
export type WifiTimerAudioStreamStartResult = {
    ok: boolean;
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    maxBufferedBytes: number;
};

/**
 * ローカル音声ストリームチャンク送信結果。
 */
export type WifiTimerAudioStreamChunkResult = {
    bufferedBytes?: number;
    maxBufferedBytes?: number;
    bytes?: number;
    error?: string;
};

/**
 * ローカル音声ストリーム終了結果。
 */
export type WifiTimerAudioStreamEndResult = Record<string, unknown> & {
    ok?: boolean;
    elapsedMs?: number;
    status?: WifiTimerStatus | string;
};

/**
 * 音色カタログ取得結果。
 */
export type WifiTimerAudioTones = {
    apiVersion: string;
    limits: WifiTimerAudioToneLimits;
    tones: WifiTimerAudioTone[];
    defaults: WifiTimerAudioSettings;
    current: WifiTimerAudioSettings;
};

/**
 * WiFi プロファイル保存入力。
 */
export type WifiTimerWifiProfileInput = {
    ssid: string;
    password: string;
};
