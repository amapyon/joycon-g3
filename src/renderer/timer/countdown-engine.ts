type CountdownTickResult = {
    remaining: number;
    shouldStop: boolean;
};

type CountdownStatus = {
    isCounting: boolean;
    isPaused: boolean;
};

type PauseToggleDecision = 'pause' | 'resume' | 'none';

type CountdownEngineOptions = {
    initialValue?: number;
    minSeconds?: number;
    maxSeconds?: number;
};

type CountdownTimeFormatApi = {
    formatMinutesSeconds: (seconds: number) => string;
};

type CountdownNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

const countdownApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverUtils?: { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    };
    if (root.rendererApiResolverUtils) {
        return root.rendererApiResolverUtils;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../api-resolver-utils') as { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    }
    throw new Error('rendererApiResolverUtils API is not available');
})();

const countdownTimeFormatApi: CountdownTimeFormatApi = countdownApiResolverUtils.resolveApi<CountdownTimeFormatApi>('timerTimeFormat', './time-format-utils');
const countdownNumberUtilsApi: CountdownNumberUtilsApi = countdownApiResolverUtils.resolveApi<CountdownNumberUtilsApi>('numberUtils', './number-utils');

/**
 * カウントダウンの状態と進行を管理する。
 */
class CountdownEngine {
    private readonly minSeconds: number;
    private readonly maxSeconds: number;
    private currentInitialValue: number;
    private countdownValue: number;
    private isCounting: boolean;
    private isPaused: boolean;

    /**
     * カウントダウンエンジンを初期化する。
     * @param options 初期値や上限・下限の設定
     */
    public constructor(options: CountdownEngineOptions = {}) {
        const initialValue = options.initialValue ?? 10;
        const minSeconds = options.minSeconds ?? 1;
        const maxSeconds = options.maxSeconds ?? 3600;

        this.minSeconds = minSeconds;
        this.maxSeconds = maxSeconds;
        this.currentInitialValue = this.clampValue(initialValue);
        this.countdownValue = this.currentInitialValue;
        this.isCounting = false;
        this.isPaused = false;
    }

    /**
     * 秒数を M:SS 形式に整形する。
     * @param seconds 秒数
     * @returns 表示用文字列
     */
    public static formatTime(seconds: number): string {
        return countdownTimeFormatApi.formatMinutesSeconds(seconds);
    }

    /**
     * 秒数を指定範囲に丸める。
     * @param value 対象値
     * @param minSeconds 最小値
     * @param maxSeconds 最大値
     * @returns 補正後の値
     */
    public static clampValue(value: number, minSeconds: number = 1, maxSeconds: number = 3600): number {
        return countdownNumberUtilsApi.clamp(value, minSeconds, maxSeconds);
    }

    /**
     * 現在の初期値を取得する。
     * @returns 初期値
     */
    public getCurrentInitialValue(): number {
        return this.currentInitialValue;
    }

    /**
     * 現在の残り秒数を取得する。
     * @returns 残り秒数
     */
    public getCountdownValue(): number {
        return this.countdownValue;
    }

    /**
     * 実行中か一時停止中かを判定する。
     * @returns 有効なカウント状態かどうか
     */
    public isActive(): boolean {
        return this.isCounting || this.isPaused;
    }

    /**
     * 実行中かどうかを判定する。
     * @returns 実行中の場合は true
     */
    public isCountingNow(): boolean {
        return this.isCounting;
    }

    /**
     * 表示に使う秒数を返す。
     * @returns 表示用秒数
     */
    public getDisplayValue(): number {
        return this.isActive() ? this.countdownValue : this.currentInitialValue;
    }

    /**
     * 一時停止可能かを判定する。
     * @returns 一時停止可能なら true
     */
    public canPause(): boolean {
        return this.isCounting;
    }

    /**
     * 再開可能かを判定する。
     * @returns 再開可能なら true
     */
    public canResume(): boolean {
        return this.isPaused;
    }

    /**
     * 一時停止トグルの挙動を返す。
     * @returns トグル時の判定
     */
    public decidePauseToggle(): PauseToggleDecision {
        if (this.isCounting) {
            return 'pause';
        }
        if (this.isPaused) {
            return 'resume';
        }
        return 'none';
    }

    /**
     * 現在の状態を取得する。
     * @returns 状態
     */
    public getStatus(): CountdownStatus {
        return {
            isCounting: this.isCounting,
            isPaused: this.isPaused,
        };
    }

    /**
     * カウントダウンを開始する。
     * @param duration 秒数
     * @returns 開始後の残り秒数
     */
    public start(duration: number): number {
        this.currentInitialValue = this.clampValue(duration);
        this.countdownValue = this.currentInitialValue;
        this.isCounting = true;
        this.isPaused = false;
        return this.countdownValue;
    }

    /**
     * カウントダウンを停止する。
     */
    public stop(): boolean {
        const wasActive = this.isActive();
        this.isCounting = false;
        this.isPaused = false;
        return wasActive;
    }

    /**
     * カウントダウンを一時停止する。
     * @returns 停止できたかどうか
     */
    public pause(): boolean {
        if (!this.isCounting) {
            return false;
        }
        this.isCounting = false;
        this.isPaused = true;
        return true;
    }

    /**
     * カウントダウンを再開する。
     * @returns 再開できたかどうか
     */
    public resume(): boolean {
        if (!this.isPaused) {
            return false;
        }
        this.isPaused = false;
        this.isCounting = true;
        return true;
    }

    /**
     * 1秒進める処理結果を返す。
     * @returns 残り秒数と停止判定
     */
    public tick(): CountdownTickResult | null {
        if (!this.isCounting) {
            return null;
        }
        if (this.countdownValue > 0) {
            this.countdownValue -= 1;
            return { remaining: this.countdownValue, shouldStop: false };
        }
        return { remaining: this.countdownValue, shouldStop: true };
    }

    /**
     * +1分を反映する。
     * @returns 更新後の残り秒数と初期値
     */
    public addMinute(): { nextRemaining: number; nextInitial: number } {
        if (this.isActive()) {
            this.countdownValue = this.clampValue(this.countdownValue + 60);
            return { nextRemaining: this.countdownValue, nextInitial: this.currentInitialValue };
        }
        this.currentInitialValue = this.clampValue(this.currentInitialValue + 60);
        return { nextRemaining: this.countdownValue, nextInitial: this.currentInitialValue };
    }

    /**
     * 初期値を更新する。
     * @param value 初期値
     * @returns 更新後の初期値
     */
    public setInitialValue(value: number): number {
        this.currentInitialValue = this.clampValue(value);
        if (!this.isActive()) {
            this.countdownValue = this.currentInitialValue;
        }
        return this.currentInitialValue;
    }

    /**
     * 設定範囲内に丸める。
     * @param value 対象値
     * @returns 補正後の値
     */
    private clampValue(value: number): number {
        return CountdownEngine.clampValue(value, this.minSeconds, this.maxSeconds);
    }
}

const countdownEngineRoot = globalThis as typeof globalThis & {
    countdownEngine?: { CountdownEngine: typeof CountdownEngine };
};

countdownEngineRoot.countdownEngine = { CountdownEngine };

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = { CountdownEngine };
}
