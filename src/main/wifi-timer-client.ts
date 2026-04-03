import type { WifiTimerSettings } from '../shared/wifi-timer-settings';
import type {
    WifiTimerAudioSettings,
    WifiTimerAudioTones,
    WifiTimerCapabilities,
    WifiTimerDisplaySettings,
    WifiTimerStatus,
    WifiTimerWifiInfo,
    WifiTimerWifiProfileInput,
} from '../shared/wifi-timer-api-types';

type FetchLike = (input: string, init?: { method?: string }) => Promise<{
    ok: boolean;
    status: number;
    text: () => Promise<string>;
}>;

/**
 * WiFi タイマー連携 API。
 */
export type WifiTimerClientApi = {
    updateSettings: (settings: WifiTimerSettings) => void;
    syncInitialValue: (seconds: number) => Promise<void>;
    handleTimerStarted: (seconds: number) => Promise<void>;
    handleTimerPaused: () => Promise<void>;
    handleTimerResumed: () => Promise<void>;
    getCapabilities: () => Promise<WifiTimerCapabilities>;
    getAudioTones: () => Promise<WifiTimerAudioTones>;
    getStatus: () => Promise<WifiTimerStatus>;
    updateDisplaySettings: (settings: WifiTimerDisplaySettings) => Promise<WifiTimerStatus>;
    updateAudioSettings: (settings: WifiTimerAudioSettings) => Promise<WifiTimerStatus>;
    testAudioSettings: (settings: WifiTimerAudioSettings) => Promise<WifiTimerStatus>;
    getWifiInfo: () => Promise<WifiTimerWifiInfo>;
    saveWifiProfile: (profile: WifiTimerWifiProfileInput) => Promise<WifiTimerWifiInfo>;
    deleteWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    connectWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    moveUpWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    moveDownWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    reboot: () => Promise<void>;
};

/**
 * WiFi タイマーのベース URL を正規化する。
 * @param ipAddress 入力された IP アドレスまたは URL
 * @returns 正規化済みのベース URL。無効な場合は空文字
 */
export function normalizeWifiTimerBaseUrl(ipAddress: string): string {
    const trimmed = ipAddress.trim();
    if (!trimmed) {
        return '';
    }
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    try {
        const url = new URL(withProtocol);
        if (!url.hostname) {
            return '';
        }
        return url.origin;
    } catch {
        return '';
    }
}

/**
 * WiFi タイマーへ HTTP リクエストを送るクライアント。
 */
class WifiTimerClient implements WifiTimerClientApi {
    private settings: WifiTimerSettings;

    private readonly fetchImpl: FetchLike;

    public constructor(fetchImpl: FetchLike, initialSettings?: WifiTimerSettings) {
        this.fetchImpl = fetchImpl;
        this.settings = initialSettings ?? { enabled: false, ipAddress: '' };
    }

    /**
     * 設定を更新する。
     * @param settings 最新設定
     */
    public updateSettings(settings: WifiTimerSettings): void {
        this.settings = {
            enabled: settings.enabled,
            ipAddress: settings.ipAddress.trim(),
        };
    }

    /**
     * 初期秒数を外部タイマーへ反映する。
     * @param seconds 反映する秒数
     */
    public async syncInitialValue(seconds: number): Promise<void> {
        await this.post('api/set', { seconds: String(seconds) });
    }

    /**
     * 開始時の同期を行う。
     * @param seconds 開始秒数
     */
    public async handleTimerStarted(seconds: number): Promise<void> {
        await this.syncInitialValue(seconds);
        await this.post('api/start');
    }

    /**
     * 一時停止を同期する。
     */
    public async handleTimerPaused(): Promise<void> {
        await this.post('api/pause');
    }

    /**
     * 再開を同期する。
     */
    public async handleTimerResumed(): Promise<void> {
        await this.post('api/resume');
    }

    /**
     * 連携メタ情報を取得する。
     * @returns 連携メタ情報
     */
    public async getCapabilities(): Promise<WifiTimerCapabilities> {
        return this.getJson<WifiTimerCapabilities>('api/capabilities');
    }

    /**
     * 音色カタログを取得する。
     * @returns 音色カタログ
     */
    public async getAudioTones(): Promise<WifiTimerAudioTones> {
        return this.getJson<WifiTimerAudioTones>('api/audio/tones');
    }

    /**
     * 状態を取得する。
     * @returns 状態
     */
    public async getStatus(): Promise<WifiTimerStatus> {
        return this.getJson<WifiTimerStatus>('api/status');
    }

    /**
     * 表示設定を更新する。
     * @param settings 表示設定
     * @returns 更新後の状態
     */
    public async updateDisplaySettings(settings: WifiTimerDisplaySettings): Promise<WifiTimerStatus> {
        await this.post('api/brightness', {
            active: String(settings.activeBrightness),
            idle: String(settings.idleBrightness),
        }, false);
        return this.postJson<WifiTimerStatus>('api/display/orientation', {
            rotate180: settings.rotate180 ? '1' : '0',
        }, false);
    }

    /**
     * 音設定を更新する。
     * @param settings 音設定
     * @returns 更新後の状態
     */
    public async updateAudioSettings(settings: WifiTimerAudioSettings): Promise<WifiTimerStatus> {
        return this.postJson<WifiTimerStatus>('api/audio', {
            toneKind: String(settings.toneKind),
            volume: String(settings.volume),
            repeatCount: String(settings.repeatCount),
            customSpeed: String(settings.customSpeed),
        }, false);
    }

    /**
     * 音設定を試聴する。
     * @param settings 音設定
     * @returns 試聴後の状態
     */
    public async testAudioSettings(settings: WifiTimerAudioSettings): Promise<WifiTimerStatus> {
        return this.postJson<WifiTimerStatus>('api/audio/test', {
            toneKind: String(settings.toneKind),
            volume: String(settings.volume),
            repeatCount: String(settings.repeatCount),
            customSpeed: String(settings.customSpeed),
        }, false);
    }

    /**
     * WiFi 状態を取得する。
     * @returns WiFi 状態
     */
    public async getWifiInfo(): Promise<WifiTimerWifiInfo> {
        return this.getJson<WifiTimerWifiInfo>('api/wifi');
    }

    /**
     * WiFi プロファイルを保存する。
     * @param profile 保存するプロファイル
     * @returns 更新後の WiFi 状態
     */
    public async saveWifiProfile(profile: WifiTimerWifiProfileInput): Promise<WifiTimerWifiInfo> {
        return this.postJson<WifiTimerWifiInfo>('api/wifi/save', {
            ssid: profile.ssid,
            password: profile.password,
        }, false);
    }

    /**
     * WiFi プロファイルを削除する。
     * @param id 削除対象 ID
     * @returns 更新後の WiFi 状態
     */
    public async deleteWifiProfile(id: number): Promise<WifiTimerWifiInfo> {
        return this.postJson<WifiTimerWifiInfo>('api/wifi/delete', { id: String(id) }, false);
    }

    /**
     * WiFi プロファイルへ接続する。
     * @param id 接続対象 ID
     * @returns 更新後の WiFi 状態
     */
    public async connectWifiProfile(id: number): Promise<WifiTimerWifiInfo> {
        return this.postJson<WifiTimerWifiInfo>('api/wifi/connect', { id: String(id) }, false);
    }

    /**
     * WiFi プロファイルを上へ移動する。
     * @param id 対象 ID
     * @returns 更新後の WiFi 状態
     */
    public async moveUpWifiProfile(id: number): Promise<WifiTimerWifiInfo> {
        return this.postJson<WifiTimerWifiInfo>('api/wifi/move-up', { id: String(id) }, false);
    }

    /**
     * WiFi プロファイルを下へ移動する。
     * @param id 対象 ID
     * @returns 更新後の WiFi 状態
     */
    public async moveDownWifiProfile(id: number): Promise<WifiTimerWifiInfo> {
        return this.postJson<WifiTimerWifiInfo>('api/wifi/move-down', { id: String(id) }, false);
    }

    /**
     * デバイスを再起動する。
     */
    public async reboot(): Promise<void> {
        await this.post('api/reboot', undefined, false);
    }

    /**
     * 現在設定から利用可能なベース URL を取得する。
     * @returns ベース URL
     */
    private getBaseUrl(requireEnabled: boolean): string {
        if (requireEnabled && !this.settings.enabled) {
            return '';
        }
        return normalizeWifiTimerBaseUrl(this.settings.ipAddress);
    }

    /**
     * POST リクエストを送信する。
     * @param path API パス
     * @param params クエリパラメータ
     */
    private async post(path: string, params?: Record<string, string>, requireEnabled: boolean = true): Promise<void> {
        const baseUrl = this.getBaseUrl(requireEnabled);
        if (!baseUrl) {
            if (!requireEnabled) {
                throw new Error('WiFi timer IP address is not configured');
            }
            return;
        }
        const url = new URL(path, `${baseUrl}/`);
        if (params) {
            Object.entries(params).forEach(([key, value]: [string, string]): void => {
                url.searchParams.set(key, value);
            });
        }
        const response = await this.fetchImpl(url.toString(), { method: 'POST' });
        if (response.ok) {
            return;
        }
        const message = await response.text();
        throw new Error(message || `WiFi timer request failed: ${response.status}`);
    }

    /**
     * JSON を返す GET リクエストを送信する。
     * @param path API パス
     * @returns 解析済み JSON
     */
    private async getJson<T>(path: string): Promise<T> {
        const baseUrl = this.getBaseUrl(false);
        if (!baseUrl) {
            throw new Error('WiFi timer IP address is not configured');
        }
        const url = new URL(path, `${baseUrl}/`);
        const response = await this.fetchImpl(url.toString(), { method: 'GET' });
        const raw = await response.text();
        if (!response.ok) {
            throw new Error(raw || `WiFi timer request failed: ${response.status}`);
        }
        return JSON.parse(raw) as T;
    }

    /**
     * JSON を返す POST リクエストを送信する。
     * @param path API パス
     * @param params クエリパラメータ
     * @param requireEnabled 連携有効フラグを要求するか
     * @returns 解析済み JSON
     */
    private async postJson<T>(
        path: string,
        params?: Record<string, string>,
        requireEnabled: boolean = true,
    ): Promise<T> {
        const baseUrl = this.getBaseUrl(requireEnabled);
        if (!baseUrl) {
            throw new Error('WiFi timer IP address is not configured');
        }
        const url = new URL(path, `${baseUrl}/`);
        if (params) {
            Object.entries(params).forEach(([key, value]: [string, string]): void => {
                url.searchParams.set(key, value);
            });
        }
        const response = await this.fetchImpl(url.toString(), { method: 'POST' });
        const raw = await response.text();
        if (!response.ok) {
            throw new Error(raw || `WiFi timer request failed: ${response.status}`);
        }
        return JSON.parse(raw) as T;
    }
}

/**
 * WiFi タイマークライアントを生成する。
 * @param fetchImpl fetch 実装
 * @param initialSettings 初期設定
 * @returns クライアント
 */
export function createWifiTimerClient(
    fetchImpl: FetchLike = fetch as unknown as FetchLike,
    initialSettings?: WifiTimerSettings,
): WifiTimerClientApi {
    return new WifiTimerClient(fetchImpl, initialSettings);
}
