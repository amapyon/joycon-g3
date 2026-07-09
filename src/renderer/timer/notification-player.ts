type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;

type NotificationPlayerOptions = {
    sendRumble: (seconds: number, shouldRumble: boolean) => void;
    createAudio: (audioUrl: string) => HTMLAudioElement;
    now: () => number;
    initialDelayMs?: number;
};

type NotificationPlayerNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

type NotificationPlayerFileUrlUtilsApi = {
    toPlayableMediaUrl: (path: string) => string;
};

type NotificationPlayerApiResolverBootstrapApi = import('../../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;

const notificationPlayerApiResolverUtils = ((): import('../../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverBootstrap?: NotificationPlayerApiResolverBootstrapApi;
    };
    if (root.rendererApiResolverBootstrap) {
        return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('../api-resolver-access');
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('../api-resolver-utils') as NotificationPlayerApiResolverBootstrapApi).getRendererApiResolverUtils('../api-resolver-access');
    }
    throw new Error('rendererApiResolverBootstrap API is not available');
})();

const notificationPlayerNumberUtilsApi: NotificationPlayerNumberUtilsApi = notificationPlayerApiResolverUtils.resolveApi<NotificationPlayerNumberUtilsApi>('numberUtils', './number-utils');
const notificationPlayerFileUrlUtilsApi: NotificationPlayerFileUrlUtilsApi = notificationPlayerApiResolverUtils.resolveApi<NotificationPlayerFileUrlUtilsApi>('fileUrlUtils', './file-url-utils');

/**
 * 通知音と振動の再生を管理する。
 */
class NotificationPlayer {
    private readonly sendRumble: (seconds: number, shouldRumble: boolean) => void;
    private readonly createAudio: (audioUrl: string) => HTMLAudioElement;
    private readonly now: () => number;
    private readonly playedIndices: Set<number>;
    private delayMs: number;

    /**
     * 通知プレイヤーを初期化する。
     * @param options 再生に必要な依存
     */
    public constructor(options: NotificationPlayerOptions) {
        this.sendRumble = options.sendRumble;
        this.createAudio = options.createAudio;
        this.now = options.now;
        this.delayMs = NotificationPlayer.normalizeDelay(options.initialDelayMs ?? 200);
        this.playedIndices = new Set<number>();
    }

    /**
     * 遅延値を更新する。
     * @param delayMs 遅延ミリ秒
     * @returns 正規化済みの遅延値
     */
    public setDelayMs(delayMs: number): number {
        this.delayMs = NotificationPlayer.normalizeDelay(delayMs);
        return this.delayMs;
    }

    /**
     * 遅延値を取得する。
     * @returns 遅延ミリ秒
     */
    public getDelayMs(): number {
        return this.delayMs;
    }

    /**
     * 再生済み通知をリセットする。
     */
    public resetPlayed(): void {
        this.playedIndices.clear();
    }

    /**
     * 現在の秒数に一致する通知を処理する。
     * @param configs 通知設定
     * @param currentSeconds 現在の残り秒数
     */
    public handleTick(configs: TimerNotificationConfig[], currentSeconds: number): void {
        configs.forEach((config: TimerNotificationConfig, index: number): void => {
            if (this.playedIndices.has(index)) {
                return;
            }
            if (currentSeconds !== config.time) {
                return;
            }
            if (this.playNotification(config)) {
                this.playedIndices.add(index);
            }
        });
    }

    /**
     * 通知音と振動を再生する。
     * @param config 通知設定
     * @returns 再生した場合は true
     */
    public playNotification(config: TimerNotificationConfig): boolean {
        if (!config.absolutePath) {
            if (config.rumble) {
                this.sendRumble(config.time, true);
            }
            return true;
        }

        const audioUrl = this.normalizeAudioUrl(config.absolutePath);

        // HDMI/DP のリンク遅延対策として無音を先に再生する
        const silentAudio = this.createAudio(audioUrl);
        silentAudio.volume = 0;
        silentAudio.play().catch((): void => {
            // 音声再生失敗は無視
        });

        // HDMI/DP のリンク遅延対策として再生を少し遅らせる
        const audio = this.createAudio(audioUrl);
        const delayMs = this.delayMs;
        const scheduledAt = this.now();
        setTimeout((): void => {
            if (this.now() >= scheduledAt) {
                audio.play().catch((): void => {
                    // 音声再生失敗は無視
                });
            }
        }, delayMs);

        const shouldRumble = !!config.rumble;
        this.sendRumble(config.time, shouldRumble);
        return true;
    }

    /**
     * ファイルパスを再生用URLに変換する。
     * @param path パス
     * @returns URL
     */
    private normalizeAudioUrl(path: string): string {
        return notificationPlayerFileUrlUtilsApi.toPlayableMediaUrl(path);
    }

    /**
     * 遅延値を正規化する。
     * @param delayMs 遅延ミリ秒
     * @returns 正規化後の値
     */
    public static normalizeDelay(delayMs: number): number {
        return notificationPlayerNumberUtilsApi.normalizeNumber(delayMs, 200, 0, 5000);
    }
}

const notificationPlayerRoot = globalThis as typeof globalThis & {
    notificationPlayer?: { NotificationPlayer: typeof NotificationPlayer };
};

notificationPlayerRoot.notificationPlayer = { NotificationPlayer };

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = { NotificationPlayer };
}
